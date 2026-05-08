import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Review } from '../models/review.model.js';
import { Movie } from '../models/movie.model.js';
import { Activity } from '../models/activity.model.js';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { clearCache } from '../config/cache.js';
import { validateReview } from '../middleware/validation.middleware.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware.js';
import { generateCloudfrontSignedUrl } from '../config/s3.js';
import logger from '../config/logger.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { getIO } from '../config/socket.js';

const reviewRouter = express.Router();

// Use Express's req.ip — it honors `trust proxy 1` and is not spoofable by a
// raw X-Forwarded-For from the client. Never trust client-supplied deviceId.
const serverDeviceId = (req: Request): string => req.ip || 'unknown';

const reviewPostKey = (req: Request): string => `${serverDeviceId(req)}:${req.body?.movieId || ''}`;
const reviewDeleteKey = (req: AuthenticatedRequest): string => req.user?.id || serverDeviceId(req);

const reviewPostLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: { message: 'Too many review submissions, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: reviewPostKey
});

const reviewPostSlow = slowDown({
  windowMs: 10 * 60 * 1000,
  delayAfter: 1,
  delayMs: () => 750,
  keyGenerator: reviewPostKey,
  validate: { delayMs: false }
});

const reviewDeleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many delete attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: reviewDeleteKey
});

const reviewDeleteSlow = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 2,
  delayMs: () => 500,
  keyGenerator: reviewDeleteKey,
  validate: { delayMs: false }
});

async function recomputeAvg(movieId: string | mongoose.Types.ObjectId, session?: mongoose.ClientSession): Promise<void> {
  try {
    const movieObjectId = typeof movieId === 'string'
      ? new mongoose.Types.ObjectId(movieId)
      : movieId;

    const agg = await Review.aggregate([
      { $match: { movieId: movieObjectId } },
      { $group: { _id: '$movieId', avg: { $avg: '$rating' } } }
    ]).session(session ?? null);

    const avg = agg[0]?.avg ?? 0;
    const opts = session ? { session } : {};
    await Movie.findByIdAndUpdate(movieId, { rating: avg }, opts);
  } catch (error) {
    const err = error as Error;
    logger.error('Error recomputing average rating:', { error: err.message, movieId });
  }
}

reviewRouter.get('/movie/:movieId', async (req: Request, res: Response): Promise<void> => {
  try {
    const reviews = await Review.find({ movieId: req.params.movieId }).sort({ createdAt: -1 });
    // The schema's toJSON transform strips deviceId from the response.
    res.json(reviews);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching reviews:', { error: err.message, movieId: req.params.movieId });
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

reviewRouter.get('/user/my-reviews', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const reviews = await Review.find({ userId })
      .populate('movieId', 'title posterUrl posterKey director releaseDate')
      .sort({ createdAt: -1 });

    const reviewsWithUrls = await Promise.all(
      reviews.map(async (review) => {
        const reviewObj = review.toObject() as any;
        if (reviewObj.movieId && reviewObj.movieId.posterKey) {
          try {
            reviewObj.movieId.posterUrl = await generateCloudfrontSignedUrl(reviewObj.movieId.posterKey);
          } catch (error) {
            logger.error('Error generating poster URL for review:', { error: (error as Error).message });
          }
        }
        return reviewObj;
      })
    );

    res.json(reviewsWithUrls);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching user reviews:', { error: err.message });
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

reviewRouter.post('/', reviewPostLimiter, reviewPostSlow, optionalAuthMiddleware, validateReview, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { movieId, nickname, rating, comment } = req.body;

    // deviceId is ALWAYS derived server-side. Never trust req.body.deviceId.
    const deviceId = serverDeviceId(req);
    const userId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : null;

    // Authenticated users dedup on userId; anonymous users dedup on deviceId
    // (with userId explicitly null so an authed-then-logged-out user doesn't
    // overwrite their authenticated review).
    const dedupQuery = userId
      ? { movieId, userId }
      : { movieId, userId: null, deviceId };

    const existingReview = await Review.findOne(dedupQuery);
    const isNewReview = !existingReview;

    const session = await mongoose.startSession();
    session.startTransaction();
    let review;
    try {
      review = await Review.findOneAndUpdate(
        dedupQuery,
        {
          $set: { nickname, rating, comment },
          $setOnInsert: {
            movieId,
            ...(userId ? { userId } : { userId: null }),
            deviceId
          }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true, session }
      );

      if (req.user && isNewReview) {
        await Activity.create([{
          userId: req.user.id,
          type: 'review',
          movieId,
          reviewId: review!._id,
          rating,
          content: comment
        }], { session });
      }

      await recomputeAvg(movieId, session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    clearCache();

    try {
      const io = getIO();
      io.to(`movie:${movieId}`).emit('review:updated', {
        review,
        isNew: isNewReview
      });
      logger.info('Socket event emitted: review:updated', { reviewId: review!._id, movieId, isNew: isNewReview });
    } catch (socketError) {
      logger.error('Failed to emit socket event:', { error: (socketError as Error).message });
    }

    logger.info('Review created/updated', { reviewId: review!._id, movieId, rating, userId: userId?.toString() });
    res.status(201).json(review);
  } catch (error) {
    const err = error as Error;
    logger.error('Error creating/updating review:', { error: err.message, movieId: req.body.movieId });
    res.status(400).json({ message: 'Failed to create review' });
  }
});

reviewRouter.delete('/:id', authMiddleware, reviewDeleteLimiter, reviewDeleteSlow, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    // Only the review's author may delete it. Legacy anonymous reviews
    // (userId unset) cannot be deleted by users — there is no safe way to
    // prove ownership of an anonymous review across requests.
    if (!review.userId || review.userId.toString() !== req.user!.id) {
      logger.warn('Unauthorized review deletion attempt', {
        reviewId: req.params.id,
        attemptedBy: req.user!.id,
        reviewOwner: review.userId?.toString() || 'anonymous'
      });
      res.status(403).json({ message: 'Not authorized to delete this review' });
      return;
    }

    const movieId = review.movieId;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Review.findByIdAndDelete(req.params.id, { session });
      await recomputeAvg(movieId, session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    clearCache();

    try {
      const io = getIO();
      io.to(`movie:${movieId}`).emit('review:deleted', { reviewId: req.params.id });
      logger.info('Socket event emitted: review:deleted', { reviewId: req.params.id, movieId });
    } catch (socketError) {
      logger.error('Failed to emit socket event:', { error: (socketError as Error).message });
    }

    logger.info('Review deleted', { reviewId: req.params.id, movieId, userId: req.user!.id });
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    const err = error as Error;
    logger.error('Error deleting review:', { error: err.message, reviewId: req.params.id });
    res.status(500).json({ message: 'Failed to delete review' });
  }
});

export default reviewRouter;
