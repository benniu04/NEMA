import express from 'express';
import { Comment } from '../models/comment.model.js';

const router = express.Router();

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
router.post('/', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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
