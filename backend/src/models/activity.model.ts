import mongoose, { Schema, Document, Types } from 'mongoose';

export type ActivityType = 'review' | 'comment' | 'watchlist_add' | 'favorite_add' | 'watched';

export interface IActivity extends Document {
  userId: Types.ObjectId;
  type: ActivityType;
  movieId: Types.ObjectId;
  reviewId?: Types.ObjectId;
  commentId?: Types.ObjectId;
  rating?: number;
  content?: string;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['review', 'comment', 'watchlist_add', 'favorite_add', 'watched'],
    required: true
  },
  movieId: {
    type: Schema.Types.ObjectId,
    ref: 'Movie',
    required: true
  },
  reviewId: {
    type: Schema.Types.ObjectId,
    ref: 'Review'
  },
  commentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  },
  rating: {
    type: Number,
    min: 1,
    max: 10
  },
  content: {
    type: String,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for querying user activities
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ movieId: 1, createdAt: -1 });

export const Activity = mongoose.model<IActivity>('Activity', activitySchema);

