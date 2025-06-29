import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
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

export const Comment = mongoose.model('Comment', commentSchema);