import express from 'express';
import { Comment } from '../models/comment.model.js';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { validateComment, validateCommentDelete } from '../middleware/validation.middleware.js';
import logger from '../config/logger.js';

const router = express.Router();

// Helper to extract client IP (always server-side, never from client input)
const getClientIp = (req) => {
  // Check x-forwarded-for header (when behind proxy/load balancer)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list, take the first IP
    return forwardedFor.split(',')[0].trim();
  }
  // Fallback to direct connection IP
  return req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
};

// Rate limiting keys (always use server-detected IP)
const commentPostKey = (req) => `${getClientIp(req)}:${req.body?.movieId || ''}`;
const commentDeleteKey = (req) => getClientIp(req);

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
  // ALWAYS use server-side IP (never trust client-provided deviceId)
  const deviceId = getClientIp(req);
  
  const comment = new Comment({
    movieId: req.body.movieId,
    deviceId: deviceId, // Server-determined IP only
    nickname: req.body.nickname || 'Anonymous',
    content: req.body.content
  });

  try {
    const newComment = await comment.save();
    logger.info('Comment created', { 
      commentId: newComment._id, 
      movieId: req.body.movieId, 
      deviceId 
    });
    res.status(201).json(newComment);
  } catch (error) {
    logger.error('Error creating comment:', { 
      error: error.message, 
      movieId: req.body.movieId 
    });
    res.status(400).json({ message: 'Failed to create comment' });
  }
});

// Delete a comment (only allowed for the same device/IP)
router.delete('/:id', commentDeleteLimiter, commentDeleteSlow, validateCommentDelete, async (req, res) => {
  try {
    // ALWAYS use server-side IP (never trust client input)
    const deviceId = getClientIp(req);
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Authorization check - only allow deletion from same IP that created it
    if (comment.deviceId === deviceId) {
      await Comment.findByIdAndDelete(req.params.id);
      logger.info('Comment deleted', { 
        commentId: req.params.id, 
        deviceId 
      });
      res.json({ message: 'Comment deleted' });
    } else {
      logger.warn('Unauthorized comment deletion attempt', { 
        commentId: req.params.id, 
        attemptedFrom: deviceId,
        commentOwner: comment.deviceId 
      });
      res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
  } catch (error) {
    logger.error('Error deleting comment:', { 
      error: error.message, 
      commentId: req.params.id 
    });
    res.status(500).json({ message: 'Failed to delete comment' });
  }
});

export default router;
