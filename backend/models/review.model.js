import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  movieId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  deviceId:  { type: String, required: true },
  nickname:  { type: String, default: 'Anonymous' },
  rating:    { type: Number, required: true, min: 1, max: 10 },
  comment:   { type: String, default: '' },
}, { timestamps: true });

export const Review = mongoose.model('Review', reviewSchema);
