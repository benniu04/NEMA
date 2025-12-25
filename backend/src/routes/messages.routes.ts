import express, { Response } from 'express';
import mongoose from 'mongoose';
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { User } from '../models/user.model.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import logger from '../config/logger.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { getIO } from '../config/socket.js';

const router = express.Router();

// Helper: Check if two users mutually follow each other and neither has blocked the other
const canMessageUser = async (userId1: string, userId2: string): Promise<{ canMessage: boolean; reason?: string }> => {
  try {
    const [user1, user2] = await Promise.all([
      User.findById(userId1),
      User.findById(userId2)
    ]);

    if (!user1 || !user2) return { canMessage: false, reason: 'User not found' };

    // Convert to strings for reliable comparison
    const userId1Str = userId1.toString();
    const userId2Str = userId2.toString();

    // Check if either user has blocked the other
    if (user1.blockedUsers?.some((id: any) => id.toString() === userId2Str)) {
      return { canMessage: false, reason: 'You have blocked this user' };
    }
    if (user2.blockedUsers?.some((id: any) => id.toString() === userId1Str)) {
      return { canMessage: false, reason: 'You cannot message this user' };
    }

    const user1FollowsUser2 = user1.following.some((id: any) => id.toString() === userId2Str);
    const user2FollowsUser1 = user2.following.some((id: any) => id.toString() === userId1Str);

    if (!user1FollowsUser2 || !user2FollowsUser1) {
      return { canMessage: false, reason: 'You can only message users who follow you back' };
    }

    return { canMessage: true };
  } catch (error) {
    logger.error('Error in canMessageUser:', { error: (error as Error).message, userId1, userId2 });
    return { canMessage: false, reason: 'Error checking message permission' };
  }
};

// Helper: Get or create conversation between two users
const getOrCreateConversation = async (userId1: string, userId2: string) => {
  // Check for existing conversation
  let conversation = await Conversation.findOne({
    participants: { $all: [userId1, userId2] },
    isActive: true
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userId1, userId2]
    });
  }

  return conversation;
};

// Helper: Emit message event to conversation room
export const emitMessageEvent = (conversationId: string, event: string, data: unknown): void => {
  try {
    const io = getIO();
    io.to(`conversation:${conversationId}`).emit(event, data);
  } catch (error) {
    logger.error('Failed to emit message event:', { error: (error as Error).message, conversationId, event });
  }
};

// Helper: Emit event to specific user
export const emitUserMessageEvent = (userId: string, event: string, data: unknown): void => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit(event, data);
  } catch (error) {
    logger.error('Failed to emit user message event:', { error: (error as Error).message, userId, event });
  }
};

// Check if user can message another user (mutual follow check + block check)
router.get('/can-message/:userId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await canMessageUser(req.user!.id, req.params.userId);
    res.json(result);
  } catch (error) {
    logger.error('Error checking message permission:', { error: (error as Error).message });
    res.status(500).json({ message: 'Failed to check message permission' });
  }
});

// Get all conversations for authenticated user
router.get('/conversations', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const conversations = await Conversation.find({
      participants: req.user!.id,
      isActive: true
    })
      .populate('participants', 'username displayName avatar')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: req.user!.id },
          isRead: false,
          isDeleted: false
        });

        const convObj = conv.toObject();
        return {
          ...convObj,
          unreadCount
        };
      })
    );

    res.json(conversationsWithUnread);
  } catch (error) {
    logger.error('Error fetching conversations:', { error: (error as Error).message, userId: req.user!.id });
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

// Start a new conversation with a user
router.post('/conversations', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }

    if (userId === req.user!.id) {
      res.status(400).json({ message: 'Cannot start conversation with yourself' });
      return;
    }

    // Check mutual follow and blocks
    const messageCheck = await canMessageUser(req.user!.id, userId);
    if (!messageCheck.canMessage) {
      res.status(403).json({ message: messageCheck.reason || 'Cannot message this user' });
      return;
    }

    const conversation = await getOrCreateConversation(req.user!.id, userId);

    // Populate participants
    await conversation.populate('participants', 'username displayName avatar');

    res.json(conversation);
  } catch (error) {
    logger.error('Error creating conversation:', { error: (error as Error).message, userId: req.user!.id });
    res.status(500).json({ message: 'Failed to create conversation' });
  }
});

// Get messages for a conversation (paginated)
router.get('/conversations/:conversationId/messages', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string; // Cursor-based pagination

    // Verify user is part of conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user!.id
    });

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    // Build query
    const query: any = {
      conversationId,
      isDeleted: false
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    const resultMessages = messages.slice(0, limit).reverse(); // Oldest first for display

    res.json({
      messages: resultMessages,
      hasMore
    });
  } catch (error) {
    logger.error('Error fetching messages:', { error: (error as Error).message, conversationId: req.params.conversationId });
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/conversations/:conversationId/messages', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ message: 'Message content is required' });
      return;
    }

    if (content.length > 2000) {
      res.status(400).json({ message: 'Message is too long (max 2000 characters)' });
      return;
    }

    // Verify user is part of conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user!.id
    });

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    // Check if either user has blocked the other
    const otherParticipant = conversation.participants.find(
      (p: any) => p.toString() !== req.user!.id
    );
    if (otherParticipant) {
      const messageCheck = await canMessageUser(req.user!.id, otherParticipant.toString());
      if (!messageCheck.canMessage) {
        res.status(403).json({ message: messageCheck.reason || 'Cannot send message' });
        return;
      }
    }

    // Create message
    const message = await Message.create({
      conversationId,
      senderId: req.user!.id,
      content: content.trim()
    });

    // Update conversation's last message
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    // Populate sender info
    await message.populate('senderId', 'username displayName avatar');

    // Emit to each participant via their user room (not conversation room to avoid duplicates)
    const messageData = {
      ...message.toObject(),
      conversationId
    };

    for (const participantId of conversation.participants) {
      // Skip the sender - they already have the message from the API response
      if (participantId.toString() === req.user!.id) continue;
      emitUserMessageEvent(participantId.toString(), 'message:new', messageData);
    }

    res.status(201).json(message);
  } catch (error) {
    logger.error('Error sending message:', { error: (error as Error).message, conversationId: req.params.conversationId });
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Mark all messages in conversation as read
router.put('/conversations/:conversationId/read', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;

    // Verify user is part of conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user!.id
    });

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    const now = new Date();

    // Mark all unread messages from the other user as read
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: req.user!.id },
        isRead: false
      },
      {
        isRead: true,
        readAt: now
      }
    );

    // Emit read receipt event
    emitMessageEvent(conversationId, 'message:read', {
      conversationId,
      readBy: req.user!.id,
      readAt: now
    });

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    logger.error('Error marking messages as read:', { error: (error as Error).message, conversationId: req.params.conversationId });
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
});

// Delete a message (soft delete)
router.delete('/messages/:messageId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;

    const message = await Message.findOne({
      _id: messageId,
      senderId: req.user!.id // Only sender can delete
    });

    if (!message) {
      res.status(404).json({ message: 'Message not found or not authorized' });
      return;
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    // Emit delete event
    emitMessageEvent(message.conversationId.toString(), 'message:deleted', {
      messageId,
      conversationId: message.conversationId
    });

    res.json({ message: 'Message deleted' });
  } catch (error) {
    logger.error('Error deleting message:', { error: (error as Error).message, messageId: req.params.messageId });
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

// Get total unread message count across all conversations
router.get('/unread-count', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Get all conversations user is part of
    const conversations = await Conversation.find({
      participants: req.user!.id,
      isActive: true
    });

    const conversationIds = conversations.map(c => c._id);

    // Count unread messages not sent by current user
    const count = await Message.countDocuments({
      conversationId: { $in: conversationIds },
      senderId: { $ne: req.user!.id },
      isRead: false,
      isDeleted: false
    });

    res.json({ count });
  } catch (error) {
    logger.error('Error fetching unread count:', { error: (error as Error).message, userId: req.user!.id });
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

// Get list of users who can be messaged (mutual followers)
router.get('/messageable-users', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUser = await User.findById(req.user!.id);
    if (!currentUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Debug logging
    logger.info('Messageable users query:', {
      currentUserId: req.user!.id,
      followingCount: currentUser.following?.length || 0,
      followersCount: currentUser.followers?.length || 0
    });

    // If user is not following anyone, return empty array
    if (!currentUser.following || currentUser.following.length === 0) {
      res.json([]);
      return;
    }

    // Mutual followers = intersection of who I follow AND who follows me
    // Convert to string arrays for comparison
    const followingIds = currentUser.following.map((id: any) => id.toString());
    const followerIds = currentUser.followers?.map((id: any) => id.toString()) || [];
    const blockedIds = currentUser.blockedUsers?.map((id: any) => id.toString()) || [];

    // Find users who are in BOTH arrays (mutual follows) and NOT blocked
    const mutualIds = followingIds.filter((id: string) =>
      followerIds.includes(id) && !blockedIds.includes(id)
    );

    logger.info('Mutual follow check:', {
      followingIds: followingIds.slice(0, 5),
      followerIds: followerIds.slice(0, 5),
      mutualCount: mutualIds.length
    });

    if (mutualIds.length === 0) {
      res.json([]);
      return;
    }

    // Fetch the user details for mutual followers
    const mutualFollowers = await User.find({
      _id: { $in: mutualIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).select('username displayName avatar');

    logger.info('Messageable users result:', { count: mutualFollowers.length });

    res.json(mutualFollowers);
  } catch (error) {
    logger.error('Error fetching messageable users:', { error: (error as Error).message });
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

export default router;
