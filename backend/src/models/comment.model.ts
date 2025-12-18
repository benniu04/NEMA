import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  movieId: string;
  deviceId: string;
  nickname: string;
  content: string;
  createdAt: Date;
}

const commentSchema = new Schema<IComment>({
  movieId: {
    type: String,
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  nickname: {
    type: String,
    default: 'Anonymous'
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 1. Get comments for a movie, sorted by most recent first
// Query: Comment.find({ movieId: '123' }).sort({ createdAt: -1 })
// This is the MOST IMPORTANT index - used on every video page load
commentSchema.index({ movieId: 1, createdAt: -1 });

// 2. Find comments by device (for deletion authorization)
// Query: Comment.find({ deviceId: 'device-123' })
commentSchema.index({ deviceId: 1 });

// 3. Cleanup old comments (optional, for future use)
// Query: Comment.find({ createdAt: { $lt: oldDate } })
commentSchema.index({ createdAt: 1 });

// Note: The compound index { movieId: 1, createdAt: -1 } can also be used for:
//   - Queries on just { movieId: 1 }
//   - Sorting by createdAt within a movieId
// This is MongoDB's "index prefix" optimization

export const Comment = mongoose.model<IComment>('Comment', commentSchema);

