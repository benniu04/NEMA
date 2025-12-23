import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: string; // Recipient user ID
  type: 'follow' | 'comment' | 'review' | 'like' | 'system';
  title: string;
  message: string;
  relatedUserId?: string; // e.g., user who followed
  relatedMovieId?: string; // e.g., movie that was commented on
  relatedCommentId?: string;
  relatedReviewId?: string;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['follow', 'comment', 'review', 'like', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedUserId: {
    type: String,
    default: null
  },
  relatedMovieId: {
    type: String,
    default: null
  },
  relatedCommentId: {
    type: String,
    default: null
  },
  relatedReviewId: {
    type: String,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for fetching user's notifications
notificationSchema.index({ userId: 1, createdAt: -1 });

// Index for fetching unread notifications
notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
