import express, { Request, Response } from 'express';
import { Comment } from '../models/comment.model.js';
import { Activity } from '../models/activity.model.js';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { validateComment, validateCommentDelete } from '../middleware/validation.middleware.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware.js';
import logger from '../config/logger.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { getIO } from '../config/socket.js';

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
  const { movieId, nickname, content, deviceId, parentId } = req.body;
  
  // Validate deviceId is provided
  if (!deviceId || typeof deviceId !== 'string') {
    res.status(400).json({ message: 'Device ID is required' });
    return;
  }
  
  const comment = new Comment({
    movieId,
    deviceId,
    userId: req.user?.id || null, // Save userId if authenticated
    nickname: nickname || 'Anonymous',
    content,
    parentId: parentId || null
  });

  try {
    const newComment = await comment.save();

    if (req.user) {
      try {
        await Activity.create({
          userId: req.user.id,
          type: 'comment',
          movieId,
          commentId: newComment._id,
          content
        });
      } catch (activityError) {
        logger.error('Failed to create activity for comment:', { error: (activityError as Error).message });
      }
    }

    // Emit socket event for real-time update
    try {
      const io = getIO();
      io.to(`movie:${movieId}`).emit('comment:new', newComment);
      logger.info('Socket event emitted: comment:new', { commentId: newComment._id, movieId });
    } catch (socketError) {
      logger.error('Failed to emit socket event:', { error: (socketError as Error).message });
    }

    logger.info('Comment created', { commentId: newComment._id, movieId, deviceId: deviceId.substring(0, 8) + '...' });
    res.status(201).json(newComment);
  } catch (error) {
    const err = error as Error;
    logger.error('Error creating comment:', { error: err.message, movieId });
    res.status(400).json({ message: 'Failed to create comment' });
  }
});

router.put('/:id', commentPostLimiter, commentPostSlow, authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ message: 'Content is required' });
      return;
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    // Only the authenticated user who created the comment can edit it
    // Anonymous comments cannot be edited (no userId to verify ownership)
    if (!comment.userId || req.user?.id !== comment.userId) {
      logger.warn('Unauthorized comment edit attempt', {
        commentId: req.params.id,
        commentUserId: comment.userId ? comment.userId.substring(0, 8) + '...' : 'anonymous',
        currentUserId: req.user?.id ? req.user.id.substring(0, 8) + '...' : 'not authenticated'
      });
      res.status(403).json({ message: 'Not authorized to edit this comment' });
      return;
    }

    // Update comment
    comment.content = content.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();

    const updatedComment = await comment.save();

    // Emit socket event for real-time update
    try {
      const io = getIO();
      io.to(`movie:${comment.movieId}`).emit('comment:edited', updatedComment);
      logger.info('Socket event emitted: comment:edited', { commentId: req.params.id, movieId: comment.movieId });
    } catch (socketError) {
      logger.error('Failed to emit socket event:', { error: (socketError as Error).message });
    }

    logger.info('Comment edited', { commentId: req.params.id, userId: req.user?.id });
    res.json(updatedComment);
  } catch (error) {
    const err = error as Error;
    logger.error('Error editing comment:', { error: err.message, commentId: req.params.id });
    res.status(500).json({ message: 'Failed to edit comment' });
  }
});

router.delete('/:id', commentDeleteLimiter, commentDeleteSlow, authMiddleware, validateCommentDelete, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    // Only the authenticated user who created the comment can delete it
    // Anonymous comments cannot be deleted (no userId to verify ownership)
    if (!comment.userId || req.user?.id !== comment.userId) {
      logger.warn('Unauthorized comment deletion attempt', {
        commentId: req.params.id,
        commentUserId: comment.userId ? comment.userId.substring(0, 8) + '...' : 'anonymous',
        currentUserId: req.user?.id ? req.user.id.substring(0, 8) + '...' : 'not authenticated'
      });
      res.status(403).json({ message: 'Not authorized to delete this comment' });
      return;
    }

    const movieId = comment.movieId;
    await Comment.findByIdAndDelete(req.params.id);

    // Emit socket event for real-time update
    try {
      const io = getIO();
      io.to(`movie:${movieId}`).emit('comment:deleted', { commentId: req.params.id });
      logger.info('Socket event emitted: comment:deleted', { commentId: req.params.id, movieId });
    } catch (socketError) {
      logger.error('Failed to emit socket event:', { error: (socketError as Error).message });
    }

    logger.info('Comment deleted', { commentId: req.params.id, userId: req.user?.id });
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    const err = error as Error;
    logger.error('Error deleting comment:', { error: err.message, commentId: req.params.id });
    res.status(500).json({ message: 'Failed to delete comment' });
  }
});

export default router;

