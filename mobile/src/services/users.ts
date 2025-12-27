import api from './api';
import type { User, PublicUser } from '../types';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  bio?: string;
  stats?: {
    filmsWatched: number;
    reviewsWritten: number;
    followersCount: number;
    followingCount: number;
  };
  isFollowing?: boolean;
}

export interface Activity {
  _id: string;
  userId: string;
  type: 'review' | 'comment' | 'watchlist_add' | 'favorite_add' | 'watched';
  movieId?: {
    _id: string;
    title: string;
    posterUrl?: string;
  };
  rating?: number;
  content?: string;
  createdAt: string;
}

export const usersService = {
  // Search users
  async searchUsers(query: string): Promise<UserProfile[]> {
    try {
      const response = await api.get('/api/users/search', { params: { q: query } });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  },

  // Get suggested users to follow
  async getSuggestedUsers(): Promise<UserProfile[]> {
    try {
      const response = await api.get('/api/users/suggested');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      return [];
    }
  },

  // Get user profile by username
  async getUserProfile(username: string): Promise<UserProfile | null> {
    try {
      const response = await api.get(`/api/users/profile/${username}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },

  // Get user's followers
  async getFollowers(userId: string): Promise<UserProfile[]> {
    try {
      const response = await api.get(`/api/users/${userId}/followers`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching followers:', error);
      return [];
    }
  },

  // Get user's following
  async getFollowing(userId: string): Promise<UserProfile[]> {
    try {
      const response = await api.get(`/api/users/${userId}/following`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching following:', error);
      return [];
    }
  },

  // Follow a user
  async followUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.post(`/api/users/follow/${userId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to follow user' };
    }
  },

  // Unfollow a user
  async unfollowUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.delete(`/api/users/follow/${userId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to unfollow user' };
    }
  },

  // Block a user
  async blockUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.post(`/api/users/block/${userId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to block user' };
    }
  },

  // Unblock a user
  async unblockUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.delete(`/api/users/block/${userId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to unblock user' };
    }
  },

  // Get blocked users
  async getBlockedUsers(): Promise<UserProfile[]> {
    try {
      const response = await api.get('/api/users/blocked');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }
  },

  // Get current user's activity
  async getMyActivity(limit = 20): Promise<Activity[]> {
    try {
      const response = await api.get('/api/users/activity', { params: { limit } });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching activity:', error);
      return [];
    }
  },

  // Get activity feed from followed users
  async getActivityFeed(limit = 20, offset = 0): Promise<Activity[]> {
    try {
      const response = await api.get('/api/users/feed', { params: { limit, offset } });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      return [];
    }
  },

  // Update user profile
  async updateProfile(updates: {
    displayName?: string;
    bio?: string;
    favoriteGenres?: string[];
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await api.put('/api/users/me', updates);
      return { success: true, user: response.data.user };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to update profile' };
    }
  },

  // Delete account
  async deleteAccount(password: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.delete('/api/users/account', { data: { password } });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to delete account' };
    }
  },
};
