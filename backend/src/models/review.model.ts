import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReview extends Document {
  movieId: Types.ObjectId;
  deviceId: string;
  nickname: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
  movieId: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  deviceId: { type: String, required: true },
  nickname: { type: String, default: 'Anonymous' },
  rating: { type: Number, required: true, min: 1, max: 10 },
  comment: { type: String, default: '' },
}, { timestamps: true });


// 1. Get all reviews for a movie
// Query: Review.find({ movieId: movieId })
// CRITICAL: This is queried on every movie page load
reviewSchema.index({ movieId: 1 });

// 2. Get reviews sorted by rating (highest first)
// Query: Review.find({ movieId: movieId }).sort({ rating: -1 })
reviewSchema.index({ movieId: 1, rating: -1 });

// 3. Find reviews by device (for user's own reviews)
// Query: Review.find({ deviceId: 'device-123' })
reviewSchema.index({ deviceId: 1 });

// 4. Recent reviews (for a "latest reviews" feature)
// Query: Review.find().sort({ createdAt: -1 })
reviewSchema.index({ createdAt: -1 });

// 5. High-rated reviews (for filtering)
// Query: Review.find({ rating: { $gte: 8 } })
reviewSchema.index({ rating: -1, createdAt: -1 });

// Note: Compound indexes are used left-to-right
// { movieId: 1, rating: -1 } works for:
//   - { movieId: 1 }
//   - { movieId: 1, rating: -1 }
// But NOT for just { rating: -1 } alone

export const Review = mongoose.model<IReview>('Review', reviewSchema);

