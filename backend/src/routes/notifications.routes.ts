import express, { Response } from 'express';
import { Notification } from '../models/notification.model.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import logger from '../config/logger.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { getIO } from '../config/socket.js';

const router = express.Router();

// Get all notifications for authenticated user
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching notifications:', { error: err.message, userId: req.user!.id });
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread-count', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user!.id,
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching unread count:', { error: err.message, userId: req.user!.id });
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user!.id
    });

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    notification.isRead = true;
    await notification.save();

    res.json(notification);
  } catch (error) {
    const err = error as Error;
    logger.error('Error marking notification as read:', { error: err.message, notificationId: req.params.id });
    res.status(500).json({ message: 'Failed to update notification' });
  }
});

// Mark all as read
router.put('/read-all', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await Notification.updateMany(
      { userId: req.user!.id, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    const err = error as Error;
    logger.error('Error marking all notifications as read:', { error: err.message, userId: req.user!.id });
    res.status(500).json({ message: 'Failed to update notifications' });
  }
});

// Helper function to create and emit notification
export const createNotification = async (data: {
  userId: string;
  type: 'follow' | 'comment' | 'review' | 'like' | 'system';
  title: string;
  message: string;
  relatedUserId?: string;
  relatedMovieId?: string;
  relatedCommentId?: string;
  relatedReviewId?: string;
}): Promise<void> => {
  try {
    const notification = await Notification.create(data);

    // Emit real-time notification via Socket.io
    try {
      const io = getIO();
      io.to(`user:${data.userId}`).emit('notification:new', notification);
      logger.info('Socket event emitted: notification:new', { userId: data.userId, type: data.type });
    } catch (socketError) {
      logger.error('Failed to emit notification socket event:', { error: (socketError as Error).message });
    }

    logger.info('Notification created', { userId: data.userId, type: data.type });
  } catch (error) {
    logger.error('Error creating notification:', { error: (error as Error).message, userId: data.userId });
  }
};

export default router;
