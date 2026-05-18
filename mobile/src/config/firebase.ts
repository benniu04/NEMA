// Mirrors the web project config at frontend/src/config/firebase.ts so both
// clients authenticate against the same Firebase project (`nema-e66af`).
//
// The Web API key (EXPO_PUBLIC_FIREBASE_API_KEY) is required to call the
// Firebase Identity Toolkit REST endpoint that exchanges a Google ID token
// for a Firebase ID token. The OAuth client IDs come from Google Cloud
// Console / Firebase Console → Sign-in providers → Google.

export const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '';
export const FIREBASE_PROJECT_ID = 'nema-e66af';

export const GOOGLE_OAUTH = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
};

export const isGoogleSignInConfigured = (): boolean => {
  if (!FIREBASE_API_KEY) return false;
  // Need at least one platform's client ID. Expo Go uses webClientId.
  return !!(GOOGLE_OAUTH.iosClientId || GOOGLE_OAUTH.androidClientId || GOOGLE_OAUTH.webClientId);
};
