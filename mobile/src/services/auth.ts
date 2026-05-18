import api, { setAuthToken, removeAuthToken } from './api';
import { FIREBASE_API_KEY } from '../config/firebase';
import type { User, AuthResponse } from '../types';

interface FirebaseSignInWithIdpResponse {
  idToken: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  localId: string; // Firebase UID
}

/**
 * Exchanges a Google ID token for a Firebase ID token via Firebase's
 * Identity Toolkit REST API. The backend's /api/users/firebase-auth endpoint
 * verifies Firebase ID tokens (not raw Google ID tokens), so we need this hop.
 */
async function exchangeGoogleIdTokenForFirebase(googleIdToken: string): Promise<FirebaseSignInWithIdpResponse> {
  if (!FIREBASE_API_KEY) {
    throw new Error('Firebase Web API key is not configured (EXPO_PUBLIC_FIREBASE_API_KEY).');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postBody: `id_token=${googleIdToken}&providerId=google.com`,
        requestUri: 'http://localhost',
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Firebase sign-in failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<FirebaseSignInWithIdpResponse>;
}

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

  // Sign in with Google via Firebase Identity Toolkit. `googleIdToken` comes
  // from expo-auth-session (Google.useAuthRequest -> response.params.id_token).
  async loginWithGoogle(googleIdToken: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const firebase = await exchangeGoogleIdTokenForFirebase(googleIdToken);

      const response = await api.post<AuthResponse>('/api/users/firebase-auth', {
        firebaseToken: firebase.idToken,
        email: firebase.email,
        displayName: firebase.displayName,
        photoURL: firebase.photoUrl,
        uid: firebase.localId,
      });

      const { user, token } = response.data;
      if (token) {
        await setAuthToken(token);
      }
      return { success: true, user };
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        (error instanceof Error ? error.message : 'Google sign-in failed');
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
