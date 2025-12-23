import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import API_BASE_URL from '../config/api';
import { useUser } from './UserContext';

interface Notification {
  _id: string;
  userId: string;
  type: 'follow' | 'comment' | 'review' | 'like' | 'system';
  title: string;
  message: string;
  relatedUserId?: string;
  relatedMovieId?: string;
  relatedCommentId?: string;
  relatedReviewId?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  showBanner: (notification: Notification) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [bannerQueue, setBannerQueue] = useState<Notification[]>([]);

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);

        // Update unread count
        const unread = data.filter((n: Notification) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
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

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Show banner notification
  const showBanner = (notification: Notification) => {
    setBannerQueue(prev => [...prev, notification]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setBannerQueue(prev => prev.filter(n => n._id !== notification._id));
    }, 5000);
  };

  // Initialize Socket.io connection
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const newSocket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Notification socket connected');
      // Join user's notification room
      newSocket.emit('join-user', user.id || user._id);
    });

    // Listen for new notifications
    newSocket.on('notification:new', (notification: Notification) => {
      console.log('New notification received:', notification);

      // Add to notifications list
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show banner
      showBanner(notification);
    });

    newSocket.on('disconnect', () => {
      console.log('Notification socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      if (user) {
        newSocket.emit('leave-user', user.id || user._id);
      }
      newSocket.close();
    };
  }, [isAuthenticated, user]);

  // Fetch notifications on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications, fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        showBanner,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
        loading
      }}
    >
      {children}
      {/* Render banner notifications */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
        {bannerQueue.map(notification => (
          <NotificationBanner
            key={notification._id}
            notification={notification}
            onClose={() => setBannerQueue(prev => prev.filter(n => n._id !== notification._id))}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

// Notification Banner Component
const NotificationBanner: React.FC<{
  notification: Notification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'follow':
        return '👤';
      case 'comment':
        return '💬';
      case 'review':
        return '⭐';
      case 'like':
        return '❤️';
      case 'system':
        return '🔔';
      default:
        return '📢';
    }
  };

  return (
    <div className="bg-black/95 backdrop-blur-md border border-amber-100/20 text-white rounded-lg shadow-xl p-4 max-w-sm animate-slide-in-right">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getIcon()}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-white">{notification.title}</h4>
          <p className="text-sm text-amber-100/70 mt-1">{notification.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-amber-100/50 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
