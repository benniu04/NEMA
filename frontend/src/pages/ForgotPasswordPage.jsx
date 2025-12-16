import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import API_BASE_URL from '../config/api';

const API_BASE = API_BASE_URL;

const ForgotPasswordPage = () => {
  const { t } = useSettings();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError(t('forgotPassword.enterEmail'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/users/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
      } else {
        setError(data.message || t('forgotPassword.error'));
      }
    } catch (err) {
      setError(t('forgotPassword.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

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
          {submitted ? (
            // Success State
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border border-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-light mb-4 tracking-wide">{t('forgotPassword.checkEmail')}</h2>
              <p className="text-white/60 mb-8">
                {t('forgotPassword.emailSent')}
              </p>
              <Link
                to="/login"
                className="inline-block px-8 py-3 border border-white/20 text-white/80 hover:bg-white/5 transition-colors"
              >
                {t('forgotPassword.backToLogin')}
              </Link>
            </div>
          ) : (
            // Form State
            <>
              <h2 className="text-2xl font-light text-center mb-4 tracking-wide">{t('forgotPassword.title')}</h2>
              <p className="text-white/50 text-center text-sm mb-8">
                {t('forgotPassword.description')}
              </p>

              {error && (
                <div className="bg-white/5 border border-white/20 text-white/90 px-4 py-3 mb-6 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full bg-transparent border-b border-white/20 px-0 py-3 focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
                    placeholder={t('forgotPassword.emailPlaceholder')}
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-white text-black py-3.5 font-light tracking-wide hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
                >
                  {isSubmitting ? t('forgotPassword.sending') : t('forgotPassword.sendLink')}
                </button>
              </form>

              <div className="mt-8 text-center">
                <Link
                  to="/login"
                  className="text-white/40 text-sm hover:text-white/70 transition-colors"
                >
                  {t('forgotPassword.backToLogin')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
