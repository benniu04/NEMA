import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { WatchTime } from '../models/watchTime.model.js';
import { Movie } from '../models/movie.model.js';
import { Activity } from '../models/activity.model.js';
import rateLimit from 'express-rate-limit';
import logger from '../config/logger.js';
import { clearCache } from '../config/cache.js';
import { optionalAuthMiddleware } from '../middleware/auth.middleware.js';
import { generateCloudfrontSignedUrl } from '../config/s3.js';
import type { AuthenticatedRequest } from '../types/index.js';

const watchTimeRouter = express.Router();

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return (forwardedFor as string).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
};

const watchTimeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { message: 'Too many watch time updates, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => `${getClientIp(req)}:${req.body?.movieId || ''}`
});

watchTimeRouter.post('/track', watchTimeLimiter, optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const deviceId = getClientIp(req);
    const { movieId, sessionId, currentTime, videoDuration, quality = '720p' } = req.body;

    if (!movieId || !sessionId || typeof currentTime !== 'number' || typeof videoDuration !== 'number') {
      res.status(400).json({ message: 'Missing required fields: movieId, sessionId, currentTime, videoDuration' });
      return;
    }

    if (currentTime < 0 || videoDuration <= 0) {
      res.status(400).json({ message: 'Invalid time values' });
      return;
    }

    let watchTime = await WatchTime.findOne({ movieId, deviceId, sessionId });
    const isNewSession = !watchTime;
    
    if (!watchTime) {
      const previousWatchQuery: Record<string, unknown> = { movieId, completed: true };
      if (req.user) {
        previousWatchQuery.userId = req.user.id;
      } else {
        previousWatchQuery.deviceId = deviceId;
      }
      
      const previousWatch = await WatchTime.findOne(previousWatchQuery).sort({ createdAt: -1 });

      watchTime = new WatchTime({
        movieId,
        userId: req.user ? req.user.id : null,
        deviceId,
        sessionId,
        videoDuration,
        quality,
        rewatched: !!previousWatch,
        startedAt: new Date()
      });
      
      await Movie.findByIdAndUpdate(movieId, { $inc: { views: 1 } });
      clearCache();
    }

    const timeDiff = currentTime - (watchTime.maxTimeReached || 0);
    const wasCompleted = watchTime.completed;
    
    if (timeDiff > 0 && timeDiff < videoDuration) {
      watchTime.watchTime += timeDiff;
      watchTime.maxTimeReached = Math.max(watchTime.maxTimeReached || 0, currentTime);
      watchTime.lastUpdatedAt = new Date();
    }

    await watchTime.save();

    if (req.user && watchTime.completed && !wasCompleted) {
      try {
        await Activity.create({
          userId: req.user.id,
          type: 'watched',
          movieId
        });
      } catch (activityError) {
        logger.error('Failed to create activity for watched movie:', { error: (activityError as Error).message });
      }
    }

    res.status(200).json({ 
      success: true,
      watchTime: watchTime.watchTime,
      completionPercentage: watchTime.completionPercentage
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error tracking watch time:', { error: err.message, movieId: req.body?.movieId, stack: err.stack });
    res.status(500).json({ message: 'Failed to track watch time' });
  }
});

watchTimeRouter.post('/end', watchTimeLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = getClientIp(req);
    const { movieId, sessionId } = req.body;

    if (!movieId || !sessionId) {
      res.status(400).json({ message: 'Missing movieId or sessionId' });
      return;
    }

    const watchTime = await WatchTime.findOne({ movieId, deviceId, sessionId });
    
    if (!watchTime) {
      res.status(404).json({ message: 'Watch session not found' });
      return;
    }

    watchTime.endedAt = new Date();
    await watchTime.save();

    res.status(200).json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('Error ending watch session:', { error: err.message, movieId: req.body?.movieId });
    res.status(500).json({ message: 'Failed to end watch session' });
  }
});

watchTimeRouter.get('/history', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    // For aggregation, we need to use ObjectId for userId
    const query = req.user
      ? { userId: new mongoose.Types.ObjectId(req.user.id) }
      : { deviceId: getClientIp(req) };

    // Use aggregation to get only the most recent session per movie
    // This ensures we always show the latest watch state (completed or not)
    const watchHistory = await WatchTime.aggregate([
      { $match: query },
      { $sort: { lastUpdatedAt: -1 } },
      // Group by movieId and take the most recent session
      {
        $group: {
          _id: '$movieId',
          sessionId: { $first: '$_id' },
          movieId: { $first: '$movieId' },
          watchTime: { $first: '$watchTime' },
          videoDuration: { $first: '$videoDuration' },
          maxTimeReached: { $first: '$maxTimeReached' },
          completionPercentage: { $first: '$completionPercentage' },
          completed: { $first: '$completed' },
          lastUpdatedAt: { $first: '$lastUpdatedAt' },
          createdAt: { $first: '$createdAt' }
        }
      },
      { $sort: { lastUpdatedAt: -1 } },
      { $limit: limit },
      // Lookup movie details
      {
        $lookup: {
          from: 'movies',
          localField: 'movieId',
          foreignField: '_id',
          as: 'movieData'
        }
      },
      { $unwind: { path: '$movieData', preserveNullAndEmptyArrays: false } },
      // Reshape to match expected format
      {
        $project: {
          _id: '$sessionId',
          movieId: {
            _id: '$movieData._id',
            title: '$movieData.title',
            director: '$movieData.director',
            posterKey: '$movieData.posterKey',
            posterUrl: '$movieData.posterUrl',
            thumbnailKey: '$movieData.thumbnailKey',
            releaseDate: '$movieData.releaseDate'
          },
          watchTime: 1,
          videoDuration: 1,
          maxTimeReached: 1,
          completionPercentage: 1,
          completed: 1,
          lastUpdatedAt: 1,
          createdAt: 1
        }
      }
    ]);

    // Generate signed URLs for poster images
    // Note: aggregation returns plain objects, not mongoose documents
    const historyWithUrls = await Promise.all(
      watchHistory.map(async (session: any) => {
        if (session.movieId && session.movieId.posterKey) {
          try {
            session.movieId.posterUrl = await generateCloudfrontSignedUrl(session.movieId.posterKey);
          } catch (error) {
            logger.error('Error generating poster URL:', { error: (error as Error).message });
          }
        }
        if (session.movieId && session.movieId.thumbnailKey) {
          try {
            session.movieId.thumbnailUrl = await generateCloudfrontSignedUrl(session.movieId.thumbnailKey);
          } catch (error) {
            logger.error('Error generating thumbnail URL:', { error: (error as Error).message });
          }
        }
        return session;
      })
    );

    res.json(historyWithUrls);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching watch history:', { error: err.message });
    res.status(500).json({ message: 'Failed to fetch watch history' });
  }
});

watchTimeRouter.get('/movie/:movieId/analytics', async (req: Request, res: Response): Promise<void> => {
  try {
    const { movieId } = req.params;

    const stats = await WatchTime.aggregate([
      { $match: { movieId: new mongoose.Types.ObjectId(movieId) } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalWatchTime: { $sum: '$watchTime' },
          avgWatchTime: { $avg: '$watchTime' },
          avgCompletion: { $avg: '$completionPercentage' },
          completedCount: { $sum: { $cond: ['$completed', 1, 0] } },
          rewatchCount: { $sum: { $cond: ['$rewatched', 1, 0] } },
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
          completionRate: { $round: [{ $multiply: [{ $divide: ['$completedCount', '$totalSessions'] }, 100] }, 2] },
          rewatchRate: { $round: [{ $multiply: [{ $divide: ['$rewatchCount', '$totalSessions'] }, 100] }, 2] },
          uniqueViewers: { $size: '$uniqueViewers' }
        }
      }
    ]);

    const dropOffPoints = await WatchTime.aggregate([
      { $match: { movieId: new mongoose.Types.ObjectId(movieId) } },
      {
        $bucket: {
          groupBy: '$completionPercentage',
          boundaries: [0, 10, 25, 50, 75, 90, 100],
          default: 'other',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    res.json({ stats: stats[0] || {}, dropOffPoints });
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching watch analytics:', { error: err.message, movieId: req.params.movieId });
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

export default watchTimeRouter;

