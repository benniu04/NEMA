import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReview extends Document {
  movieId: Types.ObjectId;
  userId?: Types.ObjectId;
  deviceId: string;
  nickname: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
  movieId: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  deviceId: { type: String, required: true },
  nickname: { type: String, default: 'Anonymous' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret: Record<string, unknown>) => {
      // deviceId is a private fingerprint — never expose it in API responses.
      delete ret.deviceId;
      return ret;
    }
  },
  toObject: {
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.deviceId;
      return ret;
    }
  }
});

reviewSchema.index({ movieId: 1 });
reviewSchema.index({ movieId: 1, rating: -1 });
reviewSchema.index({ deviceId: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ rating: -1, createdAt: -1 });

// Authenticated dedup: one review per user per movie. Sparse so legacy anon
// docs (no userId) don't collide on null.
reviewSchema.index(
  { movieId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } }
);

export const Review = mongoose.model<IReview>('Review', reviewSchema);
