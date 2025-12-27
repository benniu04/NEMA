import api, { setAuthToken, removeAuthToken } from './api';
import type { User, AuthResponse } from '../types';

export interface LoginCredentials {
  login: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export const authService = {
  // Login with email/username and password
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await api.post<AuthResponse>('/api/users/login', credentials);
      const { user, token } = response.data;

      if (token) {
        await setAuthToken(token);
      }

      return { success: true, user };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, error: message };
    }
  },

  // Register new user
  async register(credentials: RegisterCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await api.post<AuthResponse>('/api/users/register', credentials);
      const { user, token } = response.data;

      if (token) {
        await setAuthToken(token);
      }

      return { success: true, user };
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Registration failed';
      return { success: false, error: message };
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await api.post('/api/users/logout');
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      await removeAuthToken();
    }
  },

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get<User>('/api/users/me');
      return response.data;
    } catch (error) {
      return null;
    }
  },

  // Update profile
  async updateProfile(updates: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await api.put('/api/users/me', updates);
      return { success: true, user: response.data.user };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Update failed' };
    }
  },

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.put('/api/users/me/password', { currentPassword, newPassword });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Password change failed' };
    }
  },
};
