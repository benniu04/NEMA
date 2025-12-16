import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useUser } from '../context/UserContext';
import API_BASE_URL from '../config/api';

const API_BASE = API_BASE_URL;

const VerifyEmailPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useSettings();
  const { refreshUser } = useUser();

  const [isVerifying, setIsVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/users/verify-email/${token}`, {
          method: 'POST',
        });

        const data = await response.json();

        if (response.ok) {
          setSuccess(true);
          // Refresh user data to update verification status
          await refreshUser();
          // Redirect to profile after 3 seconds
          setTimeout(() => {
            navigate('/profile');
          }, 3000);
        } else {
          setError(data.message || t('verifyEmail.error'));
        }
      } catch (err) {
        setError(t('verifyEmail.error'));
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [token, t, refreshUser, navigate]);

  // Loading state
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">{t('verifyEmail.verifying')}</p>
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

        {/* Content Container */}
        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-10">
          {success ? (
            // Success State
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border border-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-light mb-4 tracking-wide">{t('verifyEmail.success')}</h2>
              <p className="text-white/60 mb-8">
                {t('verifyEmail.successDescription')}
              </p>
              <Link
                to="/profile"
                className="inline-block px-8 py-3 bg-white text-black font-light tracking-wide hover:bg-white/90 transition-colors"
              >
                {t('verifyEmail.goToProfile')}
              </Link>
            </div>
          ) : (
            // Error State
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border border-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-light mb-4 tracking-wide">{t('verifyEmail.failed')}</h2>
              <p className="text-white/60 mb-8">
                {error || t('verifyEmail.invalidToken')}
              </p>
              <div className="space-y-4">
                <Link
                  to="/profile"
                  className="block px-8 py-3 bg-white text-black font-light tracking-wide hover:bg-white/90 transition-colors"
                >
                  {t('verifyEmail.goToProfile')}
                </Link>
                <p className="text-white/40 text-sm">
                  {t('verifyEmail.resendHint')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
