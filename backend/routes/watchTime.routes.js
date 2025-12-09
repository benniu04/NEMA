import express from 'express';
import mongoose from 'mongoose';
import { WatchTime } from '../models/watchTime.model.js';
import { Movie } from '../models/movie.model.js';
import { Activity } from '../models/activity.model.js';
import rateLimit from 'express-rate-limit';
import logger from '../config/logger.js';
import { clearCache } from '../config/cache.js';
import { optionalAuthMiddleware } from '../middleware/auth.middleware.js';

const watchTimeRouter = express.Router();

// Helper to extract client IP (same as reviews)
const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
};

// Rate limiting - allow frequent updates but prevent abuse
const watchTimeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 updates per minute (1 per second)
  message: { message: 'Too many watch time updates, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${getClientIp(req)}:${req.body?.movieId || ''}`
});

// Track watch time update
watchTimeRouter.post('/track', watchTimeLimiter, optionalAuthMiddleware, async (req, res) => {
  try {
    const deviceId = getClientIp(req);
    const { movieId, sessionId, currentTime, videoDuration, quality = '720p' } = req.body;

    // Validation
    if (!movieId || !sessionId || typeof currentTime !== 'number' || typeof videoDuration !== 'number') {
      return res.status(400).json({ message: 'Missing required fields: movieId, sessionId, currentTime, videoDuration' });
    }

    if (currentTime < 0 || videoDuration <= 0) {
      return res.status(400).json({ message: 'Invalid time values' });
    }

    // Find or create watch time record
    let watchTime = await WatchTime.findOne({ movieId, deviceId, sessionId });

    const isNewSession = !watchTime;
    
    if (!watchTime) {
      // New session - check if user has watched this before (for rewatch tracking)
      const previousWatch = await WatchTime.findOne({ 
        movieId, 
        deviceId,
        completed: true 
      }).sort({ createdAt: -1 });

      watchTime = new WatchTime({
        movieId,
        deviceId,
        sessionId,
        videoDuration,
        quality,
        rewatched: !!previousWatch,
        startedAt: new Date()
      });
      
      // Update movie views count (only once per new session)
      await Movie.findByIdAndUpdate(movieId, { $inc: { views: 1 } });
      clearCache(); // Clear cache so views update
    }

    // Update watch time data
    const timeDiff = currentTime - (watchTime.maxTimeReached || 0);
    const wasCompleted = watchTime.completed;
    
    // Only add positive time differences (prevent time travel)
    if (timeDiff > 0 && timeDiff < videoDuration) {
      watchTime.watchTime += timeDiff;
      watchTime.maxTimeReached = Math.max(watchTime.maxTimeReached || 0, currentTime);
      watchTime.lastUpdatedAt = new Date();
    }

    await watchTime.save();

    // Create activity record if user is authenticated and just completed the movie
    if (req.user && watchTime.completed && !wasCompleted) {
      try {
        await Activity.create({
          userId: req.user.id,
          type: 'watched',
          movieId
        });
        logger.info('Activity created for completed movie', { userId: req.user.id, movieId });
      } catch (activityError) {
        // Don't fail the watch time tracking if activity fails
        logger.error('Failed to create activity for watched movie:', { error: activityError.message });
      }
    }

    res.status(200).json({ 
      success: true,
      watchTime: watchTime.watchTime,
      completionPercentage: watchTime.completionPercentage
    });
  } catch (error) {
    logger.error('Error tracking watch time:', { 
      error: error.message, 
      movieId: req.body?.movieId,
      stack: error.stack 
    });
    res.status(500).json({ message: 'Failed to track watch time' });
  }
});

// Mark session as ended
watchTimeRouter.post('/end', watchTimeLimiter, async (req, res) => {
  try {
    const deviceId = getClientIp(req);
    const { movieId, sessionId } = req.body;

    if (!movieId || !sessionId) {
      return res.status(400).json({ message: 'Missing movieId or sessionId' });
    }

    const watchTime = await WatchTime.findOne({ movieId, deviceId, sessionId });
    
    if (!watchTime) {
      return res.status(404).json({ message: 'Watch session not found' });
    }

    watchTime.endedAt = new Date();
    await watchTime.save();

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error ending watch session:', { 
      error: error.message, 
      movieId: req.body?.movieId 
    });
    res.status(500).json({ message: 'Failed to end watch session' });
  }
});

// Get watch history for a device (user's watch history)
watchTimeRouter.get('/history', optionalAuthMiddleware, async (req, res) => {
  try {
    const deviceId = getClientIp(req);
    const limit = parseInt(req.query.limit) || 20;

    const watchHistory = await WatchTime.find({ deviceId })
      .populate('movieId', 'title director thumbnailUrl posterUrl releaseDate')
      .sort({ lastUpdatedAt: -1 })
      .limit(limit);

    res.json(watchHistory);
  } catch (error) {
    logger.error('Error fetching watch history:', { error: error.message });
    res.status(500).json({ message: 'Failed to fetch watch history' });
  }
});

// Get analytics for a movie (admin only - you can add auth middleware)
watchTimeRouter.get('/movie/:movieId/analytics', async (req, res) => {
  try {
    const { movieId } = req.params;

    // Aggregate watch time statistics
    const stats = await WatchTime.aggregate([
      { $match: { movieId: new mongoose.Types.ObjectId(movieId) } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalWatchTime: { $sum: '$watchTime' },
          avgWatchTime: { $avg: '$watchTime' },
          avgCompletion: { $avg: '$completionPercentage' },
          completedCount: {
            $sum: { $cond: ['$completed', 1, 0] }
          },
          rewatchCount: {
            $sum: { $cond: ['$rewatched', 1, 0] }
          },
          uniqueViewers: { $addToSet: '$deviceId' }
        }
      },
      {
        $project: {
          _id: 0,
          totalSessions: 1,
          totalWatchTime: 1,
          avgWatchTime: { $round: ['$avgWatchTime', 2] },
          avgCompletion: { $round: ['$avgCompletion', 2] },
          completionRate: {
            $round: [
              { $multiply: [{ $divide: ['$completedCount', '$totalSessions'] }, 100] },
              2
            ]
          },
          rewatchRate: {
            $round: [
              { $multiply: [{ $divide: ['$rewatchCount', '$totalSessions'] }, 100] },
              2
            ]
          },
          uniqueViewers: { $size: '$uniqueViewers' }
        }
      }
    ]);

    // Get drop-off points (where users stop watching)
    const dropOffPoints = await WatchTime.aggregate([
      { $match: { movieId: new mongoose.Types.ObjectId(movieId) } },
      {
        $bucket: {
          groupBy: '$completionPercentage',
          boundaries: [0, 10, 25, 50, 75, 90, 100],
          default: 'other',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    res.json({
      stats: stats[0] || {},
      dropOffPoints
    });
  } catch (error) {
    logger.error('Error fetching watch analytics:', { 
      error: error.message, 
      movieId: req.params.movieId 
    });
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

export default watchTimeRouter;

