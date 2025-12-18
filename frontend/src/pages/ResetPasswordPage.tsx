import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import API_BASE_URL from '../config/api';

const API_BASE = API_BASE_URL;

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useSettings();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/users/reset-password/${token}/verify`);
        const data = await response.json();

        if (data.valid) {
          setTokenValid(true);
        } else {
          setError(t('resetPassword.invalidToken'));
        }
      } catch (err) {
        setError(t('resetPassword.invalidToken'));
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setError(t('resetPassword.enterPassword'));
      return;
    }

    if (password.length < 8) {
      setError(t('resetPassword.passwordLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/users/reset-password/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.message || t('resetPassword.error'));
      }
    } catch (err) {
      setError(t('resetPassword.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">{t('resetPassword.verifying')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 opacity-60"
        style={{
          backgroundImage: "url('/hero-image.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      ></div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black z-[1]"></div>

      {/* Film Grain Effect */}
      <div className="absolute inset-0 bg-[url('/film-grain.png')] opacity-[0.03] mix-blend-overlay z-[1] pointer-events-none"></div>

      {/* Vignette Effect */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{ boxShadow: "inset 0 0 200px rgba(0,0,0,0.7)" }}
      ></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-12">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-light tracking-[0.3em] text-white hover:text-white/80 transition-colors">
              NEMA
            </h1>
          </Link>
        </div>

        {/* Form Container */}
        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-10">
          {success ? (
            // Success State
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border border-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-light mb-4 tracking-wide">{t('resetPassword.success')}</h2>
              <p className="text-white/60 mb-8">
                {t('resetPassword.redirecting')}
              </p>
              <Link
                to="/login"
                className="inline-block px-8 py-3 border border-white/20 text-white/80 hover:bg-white/5 transition-colors"
              >
                {t('resetPassword.loginNow')}
              </Link>
            </div>
          ) : !tokenValid ? (
            // Invalid Token State
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border border-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-light mb-4 tracking-wide">{t('resetPassword.invalidTitle')}</h2>
              <p className="text-white/60 mb-8">
                {t('resetPassword.invalidDescription')}
              </p>
              <Link
                to="/forgot-password"
                className="inline-block px-8 py-3 bg-white text-black font-light tracking-wide hover:bg-white/90 transition-colors"
              >
                {t('resetPassword.requestNew')}
              </Link>
            </div>
          ) : (
            // Form State
            <>
              <h2 className="text-2xl font-light text-center mb-4 tracking-wide">{t('resetPassword.title')}</h2>
              <p className="text-white/50 text-center text-sm mb-8">
                {t('resetPassword.description')}
              </p>

              {error && (
                <div className="bg-white/5 border border-white/20 text-white/90 px-4 py-3 mb-6 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full bg-transparent border-b border-white/20 px-0 py-3 focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
                    placeholder={t('resetPassword.newPassword')}
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full bg-transparent border-b border-white/20 px-0 py-3 focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
                    placeholder={t('resetPassword.confirmPassword')}
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-white text-black py-3.5 font-light tracking-wide hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
                >
                  {isSubmitting ? t('resetPassword.resetting') : t('resetPassword.resetButton')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

