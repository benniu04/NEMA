import express from 'express';
import { Review } from '../models/review.model.js';
import { Movie }  from '../models/movie.model.js';

const reviewRouter = express.Router();

/* helper to recompute avg rating */
async function recomputeAvg(movieId) {
  const agg = await Review.aggregate([
    { $match: { movieId: movieId } },
    { $group: { _id: '$movieId', avg: { $avg: '$rating' } } }
  ]);
  const avg = agg[0]?.avg ?? 0;
  await Movie.findByIdAndUpdate(movieId, { rating: avg });
}

/* list reviews for a movie */
reviewRouter.get('/movie/:movieId', async (req, res) => {
  const reviews = await Review.find({ movieId: req.params.movieId })
                              .sort({ createdAt: -1 });
  res.json(reviews);
});

/* create or update the single review for this device */
reviewRouter.post('/', async (req, res) => {
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
  res.status(201).json(review);
});

/* delete (only same device) */
reviewRouter.delete('/:id', async (req, res) => {
  const { deviceId } = req.body;
  const review = await Review.findById(req.params.id);
  if (!review) return res.sendStatus(404);
  if (review.deviceId !== deviceId) return res.sendStatus(403);

  await review.remove();
  await recomputeAvg(review.movieId);
  res.json({ message: 'Deleted' });
});

export default reviewRouter;
