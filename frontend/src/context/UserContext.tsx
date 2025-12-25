import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import API_BASE_URL from '../config/api';
import type { User, UserContextValue } from '../types';

const UserContext = createContext<UserContextValue | null>(null);

export const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on mount
  const checkAuth = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      // Get token from localStorage (remember me) or sessionStorage (session only)
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        credentials: 'include', // Still try cookies for desktop
        headers
      });

      if (response.ok) {
        const userData: User = await response.json();
        setUser(userData);
      } else {
        setUser(null);
        // Clear invalid tokens
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Register new user
  const register = async (
    email: string,
    username: string,
    password: string,
    displayName: string | null = null
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, username, password, displayName })
      });

      const data = await response.json();

      if (!response.ok) {
        // If there are validation errors, format them nicely
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map((err: { msg: string }) => err.msg).join(', ');
          throw new Error(errorMessages);
        }
        throw new Error(data.message || 'Registration failed');
      }

      setUser(data.user);
      
      // Store token in localStorage for mobile browsers
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      
      // Fetch full user profile with populated watchlist and favorites
      await checkAuth();
      
      return { success: true, user: data.user };
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Login user
  const login = async (
    login: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ login, password, rememberMe })
      });

      const data = await response.json();

      if (!response.ok) {
        // If there are validation errors, format them nicely
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map((err: { msg: string }) => err.msg).join(', ');
          throw new Error(errorMessages);
        }
        throw new Error(data.message || 'Login failed');
      }

      setUser(data.user);

      // Store token in localStorage if rememberMe is checked, otherwise use sessionStorage
      if (data.token) {
        if (rememberMe) {
          localStorage.setItem('authToken', data.token);
          sessionStorage.removeItem('authToken');
        } else {
          sessionStorage.setItem('authToken', data.token);
          localStorage.removeItem('authToken');
        }
      }

      // Fetch full user profile with populated watchlist and favorites
      await checkAuth();

      return { success: true, user: data.user };
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Logout user
  const logout = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await fetch(`${API_BASE_URL}/api/users/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      // Clear tokens from both storage types
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      return { success: true };
    } catch (err) {
      const error = err as Error;
      console.error('Logout failed:', err);
      // Still clear user locally even if server request fails
      setUser(null);
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      return { success: false, error: error.message };
    }
  };

  // Update profile
  const updateProfile = async (
    updates: Partial<User>
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Update failed');
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Change password
  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/users/me/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Password change failed');
      }

      return { success: true };
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Add to watchlist
  const addToWatchlist = async (movieId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/watchlist/${movieId}`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add to watchlist');
      }

      // Update local user state
      setUser(prev => prev ? { ...prev, watchlist: data.watchlist } : null);
      return { success: true };
    } catch (err) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  };

  // Remove from watchlist
  const removeFromWatchlist = async (movieId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/watchlist/${movieId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove from watchlist');
      }

      // Update local user state
      setUser(prev => prev ? { ...prev, watchlist: data.watchlist } : null);
      return { success: true };
    } catch (err) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  };

  // Check if movie is in watchlist
  const isInWatchlist = (movieId: string): boolean => {
    if (!user || !user.watchlist) return false;
    return user.watchlist.some((id) => {
      if (typeof id === 'string') return id === movieId;
      return (id as { _id?: string })._id === movieId;
    });
  };

  // Add to favorites
  const addToFavorites = async (movieId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/favorites/${movieId}`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add to favorites');
      }

      // Update local user state
      setUser(prev => prev ? { ...prev, favoriteFilms: data.favorites } : null);
      return { success: true, message: data.message };
    } catch (err) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  };

  // Remove from favorites
  const removeFromFavorites = async (movieId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/favorites/${movieId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove from favorites');
      }

      // Update local user state
      setUser(prev => prev ? { ...prev, favoriteFilms: data.favorites } : null);
      return { success: true, message: data.message };
    } catch (err) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  };

  // Check if movie is in favorites
  const isInFavorites = (movieId: string): boolean => {
    if (!user || !user.favoriteFilms) return false;
    return user.favoriteFilms.some((id) => {
      if (typeof id === 'string') return id === movieId;
      return (id as { _id?: string })._id === movieId;
    });
  };

  // Follow a user
  const followUser = async (userId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/follow/${userId}`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to follow user');
      }

      // Update local user state
      setUser(prev => prev ? { 
        ...prev, 
        following: data.following,
        stats: {
          ...prev.stats,
          followingCount: data.followingCount
        }
      } : null);
      return { success: true, message: data.message };
    } catch (err) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  };

  // Unfollow a user
  const unfollowUser = async (userId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/follow/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to unfollow user');
      }

      // Update local user state
      setUser(prev => prev ? { 
        ...prev, 
        following: data.following,
        stats: {
          ...prev.stats,
          followingCount: data.followingCount
        }
      } : null);
      return { success: true, message: data.message };
    } catch (err) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  };

  // Check if following a user
  const isFollowing = (userId: string): boolean => {
    if (!user || !user.following) return false;
    return user.following.some((id) => {
      if (typeof id === 'string') return id === userId;
      return (id as { _id?: string })._id === userId;
    });
  };

  // Block a user
  const blockUser = async (userId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/block/${userId}`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to block user');
      }

      // Update local user state - add to blockedUsers and remove from following/followers
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          blockedUsers: [...(prev.blockedUsers || []), userId],
          following: prev.following.filter(id => {
            if (typeof id === 'string') return id !== userId;
            return (id as { _id?: string })._id !== userId;
          }),
          followers: prev.followers.filter(id => {
            if (typeof id === 'string') return id !== userId;
            return (id as { _id?: string })._id !== userId;
          }),
          stats: {
            ...prev.stats,
            followersCount: data.followersCount ?? prev.stats.followersCount,
            followingCount: data.followingCount ?? prev.stats.followingCount
          }
        };
      });
      return { success: true, message: data.message };
    } catch (err) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  };

  // Unblock a user
  const unblockUser = async (userId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/block/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to unblock user');
      }

      // Update local user state - remove from blockedUsers
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          blockedUsers: (prev.blockedUsers || []).filter(id => {
            if (typeof id === 'string') return id !== userId;
            return (id as { _id?: string })._id !== userId;
          })
        };
      });
      return { success: true, message: data.message };
    } catch (err) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  };

  // Check if a user is blocked
  const isBlocked = (userId: string): boolean => {
    if (!user || !user.blockedUsers) return false;
    return user.blockedUsers.some((id) => {
      if (typeof id === 'string') return id === userId;
      return (id as { _id?: string })._id === userId;
    });
  };

  // Delete account
  const deleteAccount = async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/users/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete account');
      }

      // Clear user state and tokens
      setUser(null);
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');

      return { success: true };
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const value: UserContextValue = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    deleteAccount,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    addToFavorites,
    removeFromFavorites,
    isInFavorites,
    followUser,
    unfollowUser,
    isFollowing,
    blockUser,
    unblockUser,
    isBlocked,
    refreshUser: checkAuth
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;

