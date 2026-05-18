import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { FIREBASE_API_KEY, GOOGLE_OAUTH } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

interface UseGoogleSignInResult {
  signIn: () => Promise<void>;
  isReady: boolean;
  isPending: boolean;
  isConfigured: boolean;
  error: string | null;
}

/**
 * Google sign-in via expo-auth-session's Google provider helper.
 *
 * This requires a custom dev build (NOT Expo Go) so the iOS bundle ID matches
 * the iOS OAuth client registered in Google Cloud Console. The provider helper
 * computes the correct reverse-DNS redirect URI from the bundle.
 *
 * Required env vars (set the one(s) for your target platform):
 *   EXPO_PUBLIC_FIREBASE_API_KEY
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID       (iOS dev build)
 *   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID   (Android dev build)
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID       (web target)
 */
export function useGoogleSignIn(): UseGoogleSignInResult {
  const { loginWithGoogle } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured =
    !!FIREBASE_API_KEY &&
    !!(GOOGLE_OAUTH.iosClientId || GOOGLE_OAUTH.androidClientId || GOOGLE_OAUTH.webClientId);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_OAUTH.iosClientId || undefined,
    androidClientId: GOOGLE_OAUTH.androidClientId || undefined,
    webClientId: GOOGLE_OAUTH.webClientId || undefined,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken = response.authentication?.idToken ?? response.params?.id_token;
      if (!idToken) {
        setError('Google did not return an ID token.');
        setIsPending(false);
        return;
      }

      loginWithGoogle(idToken)
        .then((result) => {
          if (!result.success) setError(result.error ?? 'Google sign-in failed');
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Google sign-in failed'))
        .finally(() => setIsPending(false));
    } else if (response.type === 'error') {
      setError(response.error?.message ?? 'Google sign-in failed');
      setIsPending(false);
    } else if (response.type === 'dismiss' || response.type === 'cancel') {
      setIsPending(false);
    }
  }, [response, loginWithGoogle]);

  const signIn = async (): Promise<void> => {
    if (!configured) {
      setError(
        'Google sign-in is not configured. Set EXPO_PUBLIC_FIREBASE_API_KEY and a platform client ID (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID for iOS, EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID for Android).'
      );
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      await promptAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setIsPending(false);
    }
  };

  return {
    signIn,
    isReady: !!request,
    isPending,
    isConfigured: configured,
    error,
  };
}
