import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API_BASE_URL from '../config/api.js';

const UserContext = createContext(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication status on mount
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
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
  const register = async (email, username, password, displayName = null) => {
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
          const errorMessages = data.errors.map(err => err.msg).join(', ');
          throw new Error(errorMessages);
        }
        throw new Error(data.message || 'Registration failed');
      }

      setUser(data.user);
      
      // Fetch full user profile with populated watchlist and favorites
      await checkAuth();
      
      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Login user
  const login = async (login, password) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ login, password })
      });

      const data = await response.json();

      if (!response.ok) {
        // If there are validation errors, format them nicely
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map(err => err.msg).join(', ');
          throw new Error(errorMessages);
        }
        throw new Error(data.message || 'Login failed');
      }

      setUser(data.user);
      
      // Fetch full user profile with populated watchlist and favorites
      await checkAuth();
      
      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/users/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      return { success: true };
    } catch (err) {
      console.error('Logout failed:', err);
      // Still clear user locally even if server request fails
      setUser(null);
      return { success: false, error: err.message };
    }
  };

  // Update profile
  const updateProfile = async (updates) => {
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
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
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
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Add to watchlist
  const addToWatchlist = async (movieId) => {
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
      return { success: false, error: err.message };
    }
  };

  // Remove from watchlist
  const removeFromWatchlist = async (movieId) => {
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
      return { success: false, error: err.message };
    }
  };

  // Check if movie is in watchlist
  const isInWatchlist = (movieId) => {
    if (!user || !user.watchlist) return false;
    return user.watchlist.some(id => id === movieId || id._id === movieId);
  };

  // Add to favorites
  const addToFavorites = async (movieId) => {
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
      return { success: false, error: err.message };
    }
  };

  // Remove from favorites
  const removeFromFavorites = async (movieId) => {
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
      return { success: false, error: err.message };
    }
  };

  // Check if movie is in favorites
  const isInFavorites = (movieId) => {
    if (!user || !user.favoriteFilms) return false;
    return user.favoriteFilms.some(id => id === movieId || id._id === movieId);
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    addToFavorites,
    removeFromFavorites,
    isInFavorites,
    refreshUser: checkAuth
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;

