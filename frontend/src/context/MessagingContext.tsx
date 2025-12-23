import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import API_BASE_URL from '../config/api';
import { useUser } from './UserContext';

interface User {
  _id: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

interface Message {
  _id: string;
  conversationId: string;
  senderId: string | User;
  content: string;
  isRead: boolean;
  readAt?: string;
  isDeleted: boolean;
  createdAt: string;
}

interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: Message;
  lastMessageAt: string;
  unreadCount: number;
}

interface MessagingContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  unreadCount: number;
  loading: boolean;
  messagesLoading: boolean;
  typingUsers: Record<string, string[]>;

  fetchConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<boolean>;
  markAsRead: (conversationId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  startConversation: (userId: string) => Promise<string | null>;
  canMessageUser: (userId: string) => Promise<boolean>;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  clearCurrentConversation: () => void;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const MessagingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/conversations`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data);

        // Calculate total unread
        const total = data.reduce((sum: number, conv: Conversation) => sum + (conv.unreadCount || 0), 0);
        setUnreadCount(total);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/unread-count`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [isAuthenticated]);

  // Select a conversation and load its messages
  const selectConversation = async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      // Find conversation from list
      const conv = conversations.find(c => c._id === conversationId);
      if (conv) {
        setCurrentConversation(conv);
      }

      // Fetch messages
      const response = await fetch(
        `${API_BASE_URL}/api/messages/conversations/${conversationId}/messages`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);

        // Join conversation room for real-time updates
        if (socketRef.current) {
          socketRef.current.emit('join-conversation', conversationId);
        }

        // Mark messages as read
        await markAsRead(conversationId);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Send a message
  const sendMessage = async (conversationId: string, content: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/messages/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content })
        }
      );

      if (response.ok) {
        const newMessage = await response.json();
        // Message will be added via socket event, but add it immediately for responsiveness
        setMessages(prev => [...prev, newMessage]);

        // Update conversation's last message
        setConversations(prev =>
          prev.map(conv =>
            conv._id === conversationId
              ? { ...conv, lastMessage: newMessage, lastMessageAt: newMessage.createdAt }
              : conv
          ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        );

        // Stop typing indicator
        stopTyping(conversationId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  };

  // Mark all messages in conversation as read
  const markAsRead = async (conversationId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/messages/conversations/${conversationId}/read`, {
        method: 'PUT',
        credentials: 'include'
      });

      // Update local state
      setConversations(prev =>
        prev.map(conv =>
          conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );

      // Recalculate total unread
      setConversations(prev => {
        const total = prev.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
        setUnreadCount(total);
        return prev;
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  // Delete a message
  const deleteMessage = async (messageId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId ? { ...msg, isDeleted: true, content: '' } : msg
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete message:', error);
      return false;
    }
  };

  // Start a new conversation
  const startConversation = async (userId: string): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        const conversation = await response.json();
        // Add to conversations if not already there
        setConversations(prev => {
          const exists = prev.find(c => c._id === conversation._id);
          if (exists) return prev;
          return [{ ...conversation, unreadCount: 0 }, ...prev];
        });
        return conversation._id;
      }
      return null;
    } catch (error) {
      console.error('Failed to start conversation:', error);
      return null;
    }
  };

  // Check if can message user
  const canMessageUser = async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/can-message/${userId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data.canMessage;
      }
      return false;
    } catch (error) {
      console.error('Failed to check message permission:', error);
      return false;
    }
  };

  // Start typing indicator
  const startTyping = (conversationId: string) => {
    if (socketRef.current && user) {
      socketRef.current.emit('typing:start', {
        conversationId,
        userId: user.id || user._id
      });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Auto-stop after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(conversationId);
      }, 3000);
    }
  };

  // Stop typing indicator
  const stopTyping = (conversationId: string) => {
    if (socketRef.current && user) {
      socketRef.current.emit('typing:stop', {
        conversationId,
        userId: user.id || user._id
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Clear current conversation
  const clearCurrentConversation = () => {
    if (currentConversation && socketRef.current) {
      socketRef.current.emit('leave-conversation', currentConversation._id);
    }
    setCurrentConversation(null);
    setMessages([]);
  };

  // Initialize Socket.io connection
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const newSocket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Messaging socket connected');
      newSocket.emit('join-user', user.id || user._id);
    });

    // Listen for new messages
    newSocket.on('message:new', (message: Message) => {
      console.log('New message received:', message);

      // Add to messages if in current conversation
      setMessages(prev => {
        // Avoid duplicates
        if (prev.find(m => m._id === message._id)) return prev;
        return [...prev, message];
      });

      // Update conversation list
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv._id === message.conversationId) {
            const isCurrentConv = currentConversation?._id === conv._id;
            return {
              ...conv,
              lastMessage: message,
              lastMessageAt: message.createdAt,
              unreadCount: isCurrentConv ? conv.unreadCount : conv.unreadCount + 1
            };
          }
          return conv;
        });

        // Sort by most recent
        return updated.sort((a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
      });

      // Update total unread count
      fetchUnreadCount();
    });

    // Listen for read receipts
    newSocket.on('message:read', ({ conversationId, readAt }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg.conversationId === conversationId && !msg.isRead
            ? { ...msg, isRead: true, readAt }
            : msg
        )
      );
    });

    // Listen for deleted messages
    newSocket.on('message:deleted', ({ messageId }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId ? { ...msg, isDeleted: true, content: '' } : msg
        )
      );
    });

    // Listen for typing indicators
    newSocket.on('typing:start', ({ conversationId, userId }) => {
      if (userId !== (user.id || user._id)) {
        setTypingUsers(prev => ({
          ...prev,
          [conversationId]: [...new Set([...(prev[conversationId] || []), userId])]
        }));
      }
    });

    newSocket.on('typing:stop', ({ conversationId, userId }) => {
      setTypingUsers(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(id => id !== userId)
      }));
    });

    newSocket.on('disconnect', () => {
      console.log('Messaging socket disconnected');
    });

    socketRef.current = newSocket;

    return () => {
      if (user) {
        newSocket.emit('leave-user', user.id || user._id);
      }
      newSocket.close();
    };
  }, [isAuthenticated, user]);

  // Fetch conversations on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    } else {
      setConversations([]);
      setMessages([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchConversations]);

  return (
    <MessagingContext.Provider
      value={{
        conversations,
        currentConversation,
        messages,
        unreadCount,
        loading,
        messagesLoading,
        typingUsers,
        fetchConversations,
        selectConversation,
        sendMessage,
        markAsRead,
        deleteMessage,
        startConversation,
        canMessageUser,
        startTyping,
        stopTyping,
        clearCurrentConversation
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};
