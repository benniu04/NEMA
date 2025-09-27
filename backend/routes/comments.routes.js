import express from 'express';
import { Comment } from '../models/comment.model.js';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

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
    res.status(500).json({ message: error.message });
  }
});

// Add a new comment
router.post('/', commentPostLimiter, commentPostSlow, async (req, res) => {
  // Get IP address as fallback
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  const comment = new Comment({
    movieId: req.body.movieId,
    deviceId: req.body.deviceId || ip,
    nickname: req.body.nickname || 'Anonymous',
    content: req.body.content
  });

  try {
    const newComment = await comment.save();
    res.status(201).json(newComment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a comment (only allowed for the same device/IP)
router.delete('/:id', commentDeleteLimiter, commentDeleteSlow, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const comment = await Comment.findById(req.params.id);
    
    if (comment.deviceId === req.body.deviceId || comment.deviceId === ip) {
      await Comment.findByIdAndDelete(req.params.id);
      res.json({ message: 'Comment deleted' });
    } else {
      res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
