import express from 'express';
import mongoose from 'mongoose';
import { Review } from '../models/review.model.js';
import { Movie }  from '../models/movie.model.js';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { clearCache } from '../config/cache.js';

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
    console.error('Error recomputing average rating:', error);
  }
}

/* list reviews for a movie */
reviewRouter.get('/movie/:movieId', async (req, res) => {
  const reviews = await Review.find({ movieId: req.params.movieId })
                              .sort({ createdAt: -1 });
  res.json(reviews);
});

/* create or update the single review for this device */
reviewRouter.post('/', reviewPostLimiter, reviewPostSlow, async (req, res) => {
  const { movieId, deviceId, nickname, rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 10) {
    return res.status(400).json({ message: 'Rating must be 1-10' });
  }

  let review = await Review.findOneAndUpdate(
    { movieId, deviceId },
    { nickname, rating, comment },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await recomputeAvg(movieId);
  clearCache(); // Clear movie cache so ratings update immediately
  res.status(201).json(review);
});

/* delete (only same device) */
reviewRouter.delete('/:id', reviewDeleteLimiter, reviewDeleteSlow, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.sendStatus(404);
    if (review.deviceId !== deviceId) return res.sendStatus(403);

    const movieId = review.movieId; // Save movieId before deletion
    await Review.findByIdAndDelete(req.params.id); // Use findByIdAndDelete instead of remove()
    await recomputeAvg(movieId);
    clearCache(); // Clear movie cache so ratings update immediately
    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Failed to delete review', error: error.message });
  }
});

export default reviewRouter;
