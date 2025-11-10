import express from 'express';
import { Comment } from '../models/comment.model.js';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { validateComment, validateCommentDelete } from '../middleware/validation.middleware.js';
import logger from '../config/logger.js';

const router = express.Router();

// Key helpers
const getClientIp = (req) => req.headers['x-forwarded-for'] || req.socket.remoteAddress;
const getDeviceId = (req) => (req.body && req.body.deviceId) ? req.body.deviceId : getClientIp(req);
const commentPostKey = (req) => `${getDeviceId(req)}:${req.body?.movieId || ''}`;
const commentDeleteKey = (req) => getDeviceId(req);

// Per-route rate limiters
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

// Get all comments for a video
router.get('/movie/:movieId', async (req, res) => {
  try {
    const comments = await Comment.find({ movieId: req.params.movieId })
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    logger.error('Error fetching comments:', { error: error.message, movieId: req.params.movieId });
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

// Add a new comment
router.post('/', commentPostLimiter, commentPostSlow, validateComment, async (req, res) => {
  // Get IP address as fallback (server-side for security)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  const comment = new Comment({
    movieId: req.body.movieId,
    deviceId: req.body.deviceId || ip,
    nickname: req.body.nickname || 'Anonymous',
    content: req.body.content
  });

  try {
    const newComment = await comment.save();
    logger.info('Comment created', { commentId: newComment._id, movieId: req.body.movieId });
    res.status(201).json(newComment);
  } catch (error) {
    logger.error('Error creating comment:', { error: error.message, movieId: req.body.movieId });
    res.status(400).json({ message: 'Failed to create comment' });
  }
});

// Delete a comment (only allowed for the same device/IP)
router.delete('/:id', commentDeleteLimiter, commentDeleteSlow, validateCommentDelete, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Authorization check - compare with both provided deviceId and server-side IP
    if (comment.deviceId === req.body.deviceId || comment.deviceId === ip) {
      await Comment.findByIdAndDelete(req.params.id);
      logger.info('Comment deleted', { commentId: req.params.id });
      res.json({ message: 'Comment deleted' });
    } else {
      logger.warn('Unauthorized comment deletion attempt', { commentId: req.params.id, ip });
      res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
  } catch (error) {
    logger.error('Error deleting comment:', { error: error.message, commentId: req.params.id });
    res.status(500).json({ message: 'Failed to delete comment' });
  }
});

export default router;
