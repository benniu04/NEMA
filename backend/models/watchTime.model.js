import mongoose from 'mongoose';

const watchTimeSchema = new mongoose.Schema({
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  // Total watch time in seconds for this session
  watchTime: {
    type: Number,
    default: 0,
    min: 0
  },
  // Video duration in seconds (to calculate completion percentage)
  videoDuration: {
    type: Number,
    required: true
  },
  // Maximum time reached in the video (for drop-off analysis)
  maxTimeReached: {
    type: Number,
    default: 0,
    min: 0
  },
  // Completion percentage (0-100)
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Track if video was completed
  completed: {
    type: Boolean,
    default: false
  },
  // Track if video was rewatched
  rewatched: {
    type: Boolean,
    default: false
  },
  // Quality watched
  quality: {
    type: String,
    enum: ['720p', '1080p'],
    default: '720p'
  },
  // Timestamps
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  }
}, { timestamps: true });

// Compound indexes for efficient queries
// 1. Get watch time for a specific movie and user/device
watchTimeSchema.index({ movieId: 1, userId: 1 });
watchTimeSchema.index({ movieId: 1, deviceId: 1 });

// 2. Get all watch sessions for a movie (for analytics)
watchTimeSchema.index({ movieId: 1, createdAt: -1 });

// 3. Get user's watch history (by userId or deviceId)
watchTimeSchema.index({ userId: 1, createdAt: -1 });
watchTimeSchema.index({ deviceId: 1, createdAt: -1 });

// 4. Get completed watches
watchTimeSchema.index({ movieId: 1, completed: 1 });

// 5. Session-based queries
watchTimeSchema.index({ sessionId: 1 });

// Pre-save hook to calculate completion percentage
watchTimeSchema.pre('save', function(next) {
  if (this.videoDuration > 0) {
    this.completionPercentage = Math.min(100, Math.round((this.maxTimeReached / this.videoDuration) * 100));
    this.completed = this.completionPercentage >= 90; // Consider 90%+ as completed
  }
  this.lastUpdatedAt = new Date();
  next();
});

export const WatchTime = mongoose.model('WatchTime', watchTimeSchema);