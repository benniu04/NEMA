import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Vote } from '../models/vote.model.js';
import { Comment } from '../models/comment.model.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createNotification } from './notifications.routes.js';
import { getIO } from '../config/socket.js';
import logger from '../config/logger.js';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import type { AuthenticatedRequest } from '../types/index.js';

const router = express.Router();

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return (forwardedFor as string).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
};

const voteLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { message: 'Too many vote requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp
});

const voteSlow = slowDown({
  windowMs: 1 * 60 * 1000,
  delayAfter: 10,
  delayMs: () => 200,
  keyGenerator: getClientIp,
  validate: { delayMs: false }
});

// Recalculate and update a comment's vote score
const updateCommentScore = async (commentId: string, session?: mongoose.ClientSession): Promise<number> => {
  const opts = session ? { session } : {};
  const [upvotes, downvotes] = await Promise.all([
    Vote.countDocuments({ commentId, voteType: 'upvote' }).session(session ?? null),
    Vote.countDocuments({ commentId, voteType: 'downvote' }).session(session ?? null)
  ]);
  const newScore = upvotes - downvotes;
  await Comment.findByIdAndUpdate(commentId, { voteScore: newScore }, opts);
  return newScore;
};

const emitVoteUpdate = (movieId: string, commentId: string, newScore: number): void => {
  try {
    const io = getIO();
    io.to(`movie:${movieId}`).emit('comment:vote', { commentId, voteScore: newScore });
  } catch (socketError) {
    logger.error('Failed to emit vote socket event:', { error: (socketError as Error).message });
  }
};

// Helper to handle upvote/downvote logic
const handleVote = async (req: AuthenticatedRequest, res: Response, voteType: 'upvote' | 'downvote'): Promise<void> => {
  try {
    const { commentId } = req.params;
    const userId = req.user!.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    // Prevent voting on own comment
    if (comment.userId && comment.userId === userId) {
      res.status(403).json({ message: 'Cannot vote on your own comment' });
      return;
    }

    const existingVote = await Vote.findOne({ commentId, userId });
    let previousVote: string | null = null;

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        res.status(400).json({ message: `Already ${voteType}d this comment` });
        return;
      }
    }

    // Wrap vote mutation + score update in a transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    let newScore: number;
    try {
      if (existingVote) {
        previousVote = existingVote.voteType;
        existingVote.voteType = voteType;
        await existingVote.save({ session });
      } else {
        await Vote.create([{ commentId, userId, voteType }], { session });
      }

      newScore = await updateCommentScore(commentId, session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // Side effects after commit
    emitVoteUpdate(comment.movieId, commentId, newScore);

    if (voteType === 'upvote' && comment.userId && comment.userId !== userId) {
      try {
        await createNotification({
          userId: comment.userId,
          type: 'like',
          title: 'Comment Upvoted',
          message: 'Someone upvoted your comment',
          relatedUserId: userId,
          relatedMovieId: comment.movieId,
          relatedCommentId: commentId
        });
      } catch (notifError) {
        logger.error('Failed to create upvote notification:', { error: (notifError as Error).message });
      }
    }

    res.json({ message: 'Vote recorded', voteType, newScore, previousVote });
  } catch (error) {
    const err = error as Error;
    logger.error(`Error ${voteType} comment:`, { error: err.message, commentId: req.params.commentId });
    res.status(500).json({ message: 'Failed to record vote' });
  }
};

// POST /comments/:commentId/upvote
router.post('/comments/:commentId/upvote', voteLimiter, voteSlow, authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  return handleVote(req, res, 'upvote');
});

// POST /comments/:commentId/downvote
router.post('/comments/:commentId/downvote', voteLimiter, voteSlow, authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  return handleVote(req, res, 'downvote');
});

// DELETE /comments/:commentId - Remove vote
router.delete('/comments/:commentId', voteLimiter, voteSlow, authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const userId = req.user!.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    const existingVote = await Vote.findOne({ commentId, userId });
    if (!existingVote) {
      res.status(404).json({ message: 'No vote found to remove' });
      return;
    }

    // Wrap delete + score update in a transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    let newScore: number;
    try {
      await Vote.findOneAndDelete({ commentId, userId }, { session });
      newScore = await updateCommentScore(commentId, session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // Side effects after commit
    emitVoteUpdate(comment.movieId, commentId, newScore);

    res.json({ message: 'Vote removed', newScore });
  } catch (error) {
    const err = error as Error;
    logger.error('Error removing vote:', { error: err.message, commentId: req.params.commentId });
    res.status(500).json({ message: 'Failed to remove vote' });
  }
});

// GET /comments/:commentId - Get current user's vote on a comment
router.get('/comments/:commentId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const vote = await Vote.findOne({ commentId, userId: req.user!.id });
    res.json({ voteType: vote ? vote.voteType : null });
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching vote:', { error: err.message, commentId: req.params.commentId });
    res.status(500).json({ message: 'Failed to fetch vote' });
  }
});

export default router;
