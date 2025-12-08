import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['review', 'comment', 'watchlist_add', 'favorite_add', 'watched'],
    required: true
  },
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true
  },
  reviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  },
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
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

export const Activity = mongoose.model('Activity', activitySchema);

