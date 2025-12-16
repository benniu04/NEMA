import React, { useState, useEffect } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth } from '../config/firebase';
import API_BASE_URL from '../config/api';

/**
 * Google OAuth Component
 * Uses popup mode on desktop, redirect mode on mobile
 */
const GoogleOAuth = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  
  // Detect if user is on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Check for redirect result on component mount (for mobile)
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        // Check if we're returning from a redirect
        const pendingRedirect = sessionStorage.getItem('pendingRedirect');
        
        const result = await getRedirectResult(auth);
        if (result) {
          setLoading(true);
          sessionStorage.removeItem('pendingRedirect'); // Clear the flag
          await processAuthResult(result);
          setLoading(false);
        } else if (pendingRedirect === 'true') {
          // Redirect happened but no result - might be an error
          sessionStorage.removeItem('pendingRedirect');
          setLoading(false);
        }
      } catch (error) {
        console.error('Redirect result error:', error);
        sessionStorage.removeItem('pendingRedirect');
        setLoading(false);
        if (onError) {
          onError(error.message || 'Authentication failed');
        }
      }
    };

    handleRedirectResult();
  }, [onSuccess, onError]);

  // Process authentication result (used by both popup and redirect)
  const processAuthResult = async (result) => {
    try {
      const user = result.user;

      // Get Firebase ID token
      const idToken = await user.getIdToken();

      // Send to backend for verification and MongoDB user creation
      const response = await fetch(`${API_BASE_URL}/api/users/firebase-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          firebaseToken: idToken,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend authentication failed:', errorData);
        throw new Error(errorData.message || 'Authentication failed');
      }

      const data = await response.json();

      // Store token in localStorage for mobile browsers
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      // Call success callback
      if (onSuccess) {
        onSuccess(data.user);
      }
    } catch (error) {
      console.error('Authentication processing error:', error);
      throw error;
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      if (isMobile) {
        // Mobile: Use redirect flow (better for mobile browsers)
        sessionStorage.setItem('pendingRedirect', 'true'); // Set flag before redirect
        await signInWithRedirect(auth, provider);
        // Note: The page will redirect away, result handled in useEffect
      } else {
        // Desktop: Use popup flow
        const result = await signInWithPopup(auth, provider);
        await processAuthResult(result);
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      
      let errorMessage = 'Failed to sign in with Google';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in cancelled';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Please allow popups for this site';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (onError) {
        onError(errorMessage);
      }
      
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="w-full bg-white text-black py-3.5 font-light tracking-wide hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
          <span>SIGNING IN...</span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>CONTINUE WITH GOOGLE</span>
        </>
      )}
    </button>
  );
};

export default GoogleOAuth;
