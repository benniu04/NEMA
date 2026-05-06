import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useSettings } from '../context/SettingsContext';
import GoogleOAuth from '../components/GoogleOAuth';
import { User } from '../types';
import { getRedirectResult } from 'firebase/auth';
import { auth } from '../config/firebase';
import API_BASE_URL from '../config/api';

interface FormData {
  login: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading, refreshUser } = useUser();
  const { t } = useSettings();

  // Detect mobile devices - hide Google OAuth on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const [formData, setFormData] = useState<FormData>({
    login: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [checkingRedirect, setCheckingRedirect] = useState(true);

  const from = (location.state as any)?.from?.pathname || '/';

  // Handle OAuth redirect result BEFORE anything else (fixes mobile OAuth)
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const pendingRedirect = sessionStorage.getItem('pendingRedirect');

        // Only check if we're expecting a redirect result
        if (pendingRedirect === 'true') {
          const result = await getRedirectResult(auth);

          if (result) {
            sessionStorage.removeItem('pendingRedirect');

            // Get Firebase ID token and authenticate with backend
            const idToken = await result.user.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/users/firebase-auth`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                firebaseToken: idToken,
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL,
                uid: result.user.uid,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.token) {
                localStorage.setItem('authToken', data.token);
              }
              await refreshUser();
              navigate(from, { replace: true });
              return;
            }
          }

          sessionStorage.removeItem('pendingRedirect');
        }
      } catch (err) {
        console.error('Redirect result error:', err);
        sessionStorage.removeItem('pendingRedirect');
        setError('Google sign-in failed. Please try again.');
      } finally {
        setCheckingRedirect(false);
      }
    };

    handleRedirectResult();
  }, [navigate, from, refreshUser]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && !checkingRedirect && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, loading, checkingRedirect, navigate, from]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    

    if (!formData.login || !formData.password) {
      setError(t('login.enterCredentials'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    const result = await login(formData.login, formData.password, rememberMe);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Login failed');
    }

    setIsSubmitting(false);
  };

  const handleGoogleSuccess = async (user: User) => {
    await refreshUser();
    navigate(from, { replace: true });
  };

  const handleGoogleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (loading || checkingRedirect) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero-image.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-black/40" />

        {/* Overlay Content */}
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16">
          <blockquote className="max-w-md">
            <p className="text-xl text-white/90 font-light italic leading-relaxed mb-4">
              "Cinema is a matter of what's in the frame and what's out."
            </p>
            <footer className="text-white/50 text-sm">— Martin Scorsese</footer>
          </blockquote>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] via-transparent to-transparent" />

        <div className="w-full max-w-sm relative z-10">
          {/* Header */}
          <div className={`mb-8 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h1 className="text-3xl font-light text-white mb-2">Welcome back</h1>
            <p className="text-white/50 text-sm">Sign in to continue to your account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 mb-6 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className={`transition-all duration-500 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Email or Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="login"
                  value={formData.login}
                  onChange={handleChange}
                  onFocus={() => setFocusedInput('login')}
                  onBlur={() => setFocusedInput(null)}
                  className={`w-full bg-white/[0.03] border rounded-lg px-4 py-3.5 focus:outline-none transition-all duration-200 text-white placeholder:text-white/20 ${
                    focusedInput === 'login'
                      ? 'border-amber-500/50 bg-white/[0.05]'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  placeholder="Enter your email or username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className={`transition-all duration-500 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  className={`w-full bg-white/[0.03] border rounded-lg px-4 py-3.5 focus:outline-none transition-all duration-200 text-white placeholder:text-white/20 ${
                    focusedInput === 'password'
                      ? 'border-amber-500/50 bg-white/[0.05]'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className={`flex items-center justify-between transition-all duration-500 delay-400 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                    rememberMe
                      ? 'bg-amber-500 border-amber-500'
                      : 'border-white/20 group-hover:border-white/40'
                  }`}>
                    {rememberMe && (
                      <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors">
                  Remember me
                </span>
              </label>
              <Link to="/forgot-password" className="text-sm text-amber-500/80 hover:text-amber-400 transition-colors">
                Forgot password?
              </Link>
            </div>

            <div className={`pt-2 transition-all duration-500 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium py-3.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign In'}
              </button>
            </div>
          </form>

          {/* Google OAuth - hidden on mobile */}
          {!isMobile && (
            <>
              <div className={`relative my-8 transition-all duration-500 delay-600 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 text-white/30 text-xs bg-[#0a0a0a]">or continue with</span>
                </div>
              </div>

              <div className={`transition-all duration-500 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <GoogleOAuth onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
              </div>
            </>
          )}

          {/* Sign Up Link */}
          <p className={`mt-8 text-center text-white/40 text-sm transition-all duration-500 delay-800 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            Don't have an account?{' '}
            <Link to="/register" className="text-amber-500 hover:text-amber-400 transition-colors">
              Create one
            </Link>
          </p>

          {/* Footer Links */}
          <div className={`mt-12 pt-8 border-t border-white/5 flex items-center justify-center gap-4 text-xs text-white/30 transition-all duration-500 delay-900 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <Link to="/" className="hover:text-white/50 transition-colors">Home</Link>
            <span className="text-white/10">•</span>
            <Link to="/catalog" className="hover:text-white/50 transition-colors">Films</Link>
            <span className="text-white/10">•</span>
            <Link to="/about" className="hover:text-white/50 transition-colors">About</Link>
            <span className="text-white/10">•</span>
            <Link to="/admin/login" className="hover:text-white/50 transition-colors">Admin</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
