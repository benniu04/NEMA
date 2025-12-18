import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Review } from '../models/review.model.js';
import { Movie } from '../models/movie.model.js';
import { Activity } from '../models/activity.model.js';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { clearCache } from '../config/cache.js';
import { validateReview, validateReviewDelete } from '../middleware/validation.middleware.js';
import { optionalAuthMiddleware } from '../middleware/auth.middleware.js';
import { generateCloudfrontSignedUrl } from '../config/s3.js';
import logger from '../config/logger.js';
import type { AuthenticatedRequest } from '../types/index.js';

const reviewRouter = express.Router();

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return (forwardedFor as string).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
};

const reviewPostKey = (req: Request): string => `${getClientIp(req)}:${req.body?.movieId || ''}`;
const reviewDeleteKey = (req: Request): string => getClientIp(req);

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

async function recomputeAvg(movieId: string | mongoose.Types.ObjectId): Promise<void> {
  try {
    const movieObjectId = typeof movieId === 'string' 
      ? new mongoose.Types.ObjectId(movieId) 
      : movieId;
    
    const agg = await Review.aggregate([
      { $match: { movieId: movieObjectId } },
      { $group: { _id: '$movieId', avg: { $avg: '$rating' } } }
    ]);
    
    const avg = agg[0]?.avg ?? 0;
    await Movie.findByIdAndUpdate(movieId, { rating: avg });
  } catch (error) {
    const err = error as Error;
    logger.error('Error recomputing average rating:', { error: err.message, movieId });
  }
}

reviewRouter.get('/movie/:movieId', async (req: Request, res: Response): Promise<void> => {
  try {
    const reviews = await Review.find({ movieId: req.params.movieId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching reviews:', { error: err.message, movieId: req.params.movieId });
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

reviewRouter.get('/user/my-reviews', async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = getClientIp(req);
    const reviews = await Review.find({ deviceId })
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
    const deviceId = getClientIp(req);
    const { movieId, nickname, rating, comment } = req.body;

    const existingReview = await Review.findOne({ movieId, deviceId });
    const isNewReview = !existingReview;

    const review = await Review.findOneAndUpdate(
      { movieId, deviceId },
      { nickname, rating, comment },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (req.user && isNewReview) {
      try {
        await Activity.create({
          userId: req.user.id,
          type: 'review',
          movieId,
          reviewId: review!._id,
          rating,
          content: comment
        });
      } catch (activityError) {
        logger.error('Failed to create activity for review:', { error: (activityError as Error).message });
      }
    }

    await recomputeAvg(movieId);
    clearCache();
    logger.info('Review created/updated', { reviewId: review!._id, movieId, rating, deviceId });
    res.status(201).json(review);
  } catch (error) {
    const err = error as Error;
    logger.error('Error creating/updating review:', { error: err.message, movieId: req.body.movieId });
    res.status(400).json({ message: 'Failed to create review' });
  }
});

reviewRouter.delete('/:id', reviewDeleteLimiter, reviewDeleteSlow, validateReviewDelete, async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = getClientIp(req);
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }
    
    if (review.deviceId !== deviceId) {
      logger.warn('Unauthorized review deletion attempt', { reviewId: req.params.id, attemptedFrom: deviceId, reviewOwner: review.deviceId });
      res.status(403).json({ message: 'Not authorized to delete this review' });
      return;
    }

    const movieId = review.movieId;
    await Review.findByIdAndDelete(req.params.id);
    await recomputeAvg(movieId);
    clearCache();
    logger.info('Review deleted', { reviewId: req.params.id, movieId, deviceId });
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    const err = error as Error;
    logger.error('Error deleting review:', { error: err.message, reviewId: req.params.id });
    res.status(500).json({ message: 'Failed to delete review' });
  }
});

export default reviewRouter;

