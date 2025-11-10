import express from 'express';
import mongoose from 'mongoose';
import { Review } from '../models/review.model.js';
import { Movie }  from '../models/movie.model.js';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { clearCache } from '../config/cache.js';
import { validateReview, validateReviewDelete } from '../middleware/validation.middleware.js';
import logger from '../config/logger.js';

const reviewRouter = express.Router();

// Key helpers
const getClientIp = (req) => req.headers['x-forwarded-for'] || req.socket.remoteAddress;
const getDeviceId = (req) => (req.body && req.body.deviceId) ? req.body.deviceId : getClientIp(req);
const reviewPostKey = (req) => `${getDeviceId(req)}:${req.body?.movieId || ''}`;
const reviewDeleteKey = (req) => getDeviceId(req);

// Per-route rate limiters
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

/* helper to recompute avg rating */
async function recomputeAvg(movieId) {
  try {
    // Convert to ObjectId if it's a string
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
    logger.error('Error recomputing average rating:', { error: error.message, movieId });
  }
}

/* list reviews for a movie */
reviewRouter.get('/movie/:movieId', async (req, res) => {
  try {
    const reviews = await Review.find({ movieId: req.params.movieId })
                                .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    logger.error('Error fetching reviews:', { error: error.message, movieId: req.params.movieId });
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

/* create or update the single review for this device */
reviewRouter.post('/', reviewPostLimiter, reviewPostSlow, validateReview, async (req, res) => {
  try {
    const { movieId, deviceId, nickname, rating, comment } = req.body;

    let review = await Review.findOneAndUpdate(
      { movieId, deviceId },
      { nickname, rating, comment },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await recomputeAvg(movieId);
    clearCache(); // Clear movie cache so ratings update immediately
    logger.info('Review created/updated', { reviewId: review._id, movieId, rating });
    res.status(201).json(review);
  } catch (error) {
    logger.error('Error creating/updating review:', { error: error.message, movieId: req.body.movieId });
    res.status(400).json({ message: 'Failed to create review' });
  }
});

/* delete (only same device) */
reviewRouter.delete('/:id', reviewDeleteLimiter, reviewDeleteSlow, validateReviewDelete, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    if (review.deviceId !== deviceId) {
      logger.warn('Unauthorized review deletion attempt', { reviewId: req.params.id, deviceId });
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    const movieId = review.movieId; // Save movieId before deletion
    await Review.findByIdAndDelete(req.params.id);
    await recomputeAvg(movieId);
    clearCache(); // Clear movie cache so ratings update immediately
    logger.info('Review deleted', { reviewId: req.params.id, movieId });
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    logger.error('Error deleting review:', { error: error.message, reviewId: req.params.id });
    res.status(500).json({ message: 'Failed to delete review' });
  }
});

export default reviewRouter;
