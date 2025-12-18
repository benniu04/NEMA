import express, { Request, Response } from 'express';
import { Comment } from '../models/comment.model.js';
import { Activity } from '../models/activity.model.js';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { validateComment, validateCommentDelete } from '../middleware/validation.middleware.js';
import { optionalAuthMiddleware } from '../middleware/auth.middleware.js';
import logger from '../config/logger.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = express.Router();

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return (forwardedFor as string).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
};

const commentPostKey = (req: Request): string => `${getClientIp(req)}:${req.body?.movieId || ''}`;
const commentDeleteKey = (req: Request): string => getClientIp(req);

const commentPostLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { message: 'Too many comments, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: commentPostKey
});

const commentPostSlow = slowDown({
  windowMs: 5 * 60 * 1000,
  delayAfter: 2,
  delayMs: () => 500,
  keyGenerator: commentPostKey,
  validate: { delayMs: false }
});

const commentDeleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many delete attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: commentDeleteKey
});

const commentDeleteSlow = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 2,
  delayMs: () => 500,
  keyGenerator: commentDeleteKey,
  validate: { delayMs: false }
});

router.get('/movie/:movieId', async (req: Request, res: Response): Promise<void> => {
  try {
    const comments = await Comment.find({ movieId: req.params.movieId }).sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching comments:', { error: err.message, movieId: req.params.movieId });
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

router.post('/', commentPostLimiter, commentPostSlow, optionalAuthMiddleware, validateComment, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const deviceId = getClientIp(req);
  
  const comment = new Comment({
    movieId: req.body.movieId,
    deviceId,
    nickname: req.body.nickname || 'Anonymous',
    content: req.body.content
  });

  try {
    const newComment = await comment.save();
    
    if (req.user) {
      try {
        await Activity.create({
          userId: req.user.id,
          type: 'comment',
          movieId: req.body.movieId,
          commentId: newComment._id,
          content: req.body.content
        });
      } catch (activityError) {
        logger.error('Failed to create activity for comment:', { error: (activityError as Error).message });
      }
    }
    
    logger.info('Comment created', { commentId: newComment._id, movieId: req.body.movieId, deviceId });
    res.status(201).json(newComment);
  } catch (error) {
    const err = error as Error;
    logger.error('Error creating comment:', { error: err.message, movieId: req.body.movieId });
    res.status(400).json({ message: 'Failed to create comment' });
  }
});

router.delete('/:id', commentDeleteLimiter, commentDeleteSlow, validateCommentDelete, async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = getClientIp(req);
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }
    
    if (comment.deviceId === deviceId) {
      await Comment.findByIdAndDelete(req.params.id);
      logger.info('Comment deleted', { commentId: req.params.id, deviceId });
      res.json({ message: 'Comment deleted' });
    } else {
      logger.warn('Unauthorized comment deletion attempt', { commentId: req.params.id, attemptedFrom: deviceId, commentOwner: comment.deviceId });
      res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
  } catch (error) {
    const err = error as Error;
    logger.error('Error deleting comment:', { error: err.message, commentId: req.params.id });
    res.status(500).json({ message: 'Failed to delete comment' });
  }
});

export default router;

