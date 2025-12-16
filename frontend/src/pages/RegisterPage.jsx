import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useSettings } from '../context/SettingsContext';
import API_BASE_URL from '../config/api.js';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, loading } = useUser();
  const { t } = useSettings();
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, loading, navigate]);

  // Debounced username check
  useEffect(() => {
    if (formData.username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/check-username/${formData.username}`);
        const data = await response.json();
        setUsernameAvailable(data.available);
      } catch (err) {
        console.error('Username check failed:', err);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username]);

  // Debounced email check
  useEffect(() => {
    if (!formData.email || !formData.email.includes('@')) {
      setEmailAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/check-email/${encodeURIComponent(formData.email)}`);
        const data = await response.json();
        setEmailAvailable(data.available);
      } catch (err) {
        console.error('Email check failed:', err);
      } finally {
        setCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Trim whitespace for email and username fields
    const trimmedValue = (name === 'email' || name === 'username') ? value.trim() : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: trimmedValue
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    } else if (emailAvailable === false) {
      newErrors.email = 'This email is already registered';
    }

    // Username validation
    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (formData.username.length > 30) {
      newErrors.username = 'Username cannot exceed 30 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    } else if (usernameAvailable === false) {
      newErrors.username = 'This username is already taken';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Display name validation (optional)
    if (formData.displayName && formData.displayName.length > 50) {
      newErrors.displayName = 'Display name cannot exceed 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    const result = await register(
      formData.email,
      formData.username,
      formData.password,
      formData.displayName || null
    );

    if (result.success) {
      navigate('/profile');
    } else {
      setErrors({ submit: result.error });
    }
    
    setIsSubmitting(false);
  };

  if (loading) {
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-light tracking-[0.3em] text-white hover:text-white/80 transition-colors">
              NEMA
            </h1>
          </Link>
        </div>

        {/* Register Form */}
        <div className="bg-white/[0.02] border border-white/10 p-10">
          <h2 className="text-2xl font-light text-center mb-8 tracking-wide">{t('register.title')}</h2>
            
          {errors.submit && (
            <div className="bg-white/5 border border-white/20 text-white/90 px-4 py-3 mb-6 text-sm text-center">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="relative">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-transparent border-b px-0 py-3 focus:outline-none transition-colors placeholder:text-white/30 ${
                  errors.email 
                    ? 'border-white/40' 
                    : emailAvailable === true 
                      ? 'border-white'
                      : 'border-white/20 focus:border-white'
                }`}
                placeholder={t('register.email')}
              />
              {checkingEmail && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border border-white/20 border-t-white rounded-full"></div>
                </div>
              )}
              {!checkingEmail && emailAvailable === true && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-white">✓</div>
              )}
              {errors.email && (
                <p className="text-white/50 text-xs mt-2">{errors.email}</p>
              )}
            </div>

            {/* Username */}
            <div className="relative">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`w-full bg-transparent border-b px-0 py-3 focus:outline-none transition-colors placeholder:text-white/30 ${
                  errors.username 
                    ? 'border-white/40' 
                    : usernameAvailable === true 
                      ? 'border-white'
                      : 'border-white/20 focus:border-white'
                }`}
                placeholder={t('register.username')}
              />
              {checkingUsername && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border border-white/20 border-t-white rounded-full"></div>
                </div>
              )}
              {!checkingUsername && usernameAvailable === true && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-white">✓</div>
              )}
              {errors.username && (
                <p className="text-white/50 text-xs mt-2">{errors.username}</p>
              )}
              {!errors.username && usernameAvailable === false && (
                <p className="text-white/50 text-xs mt-2">This username is already taken</p>
              )}
            </div>

            {/* Display Name (Optional) */}
            <div>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className={`w-full bg-transparent border-b px-0 py-3 focus:outline-none transition-colors placeholder:text-white/30 ${
                  errors.displayName 
                    ? 'border-white/40' 
                    : 'border-white/20 focus:border-white'
                }`}
                placeholder={t('register.displayName')}
              />
              {errors.displayName && (
                <p className="text-white/50 text-xs mt-2">{errors.displayName}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full bg-transparent border-b px-0 py-3 focus:outline-none transition-colors placeholder:text-white/30 ${
                  errors.password 
                    ? 'border-white/40' 
                    : formData.password && formData.password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)
                      ? 'border-white'
                      : 'border-white/20 focus:border-white'
                }`}
                placeholder={t('register.password')}
              />
              {errors.password ? (
                <p className="text-white/50 text-xs mt-2">{errors.password}</p>
              ) : formData.password ? (
                formData.password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password) ? (
                  <p className="text-white text-xs mt-2">✓ Password is valid</p>
                ) : (
                  <p className="text-white/30 text-xs mt-2">
                    Min 8 characters with uppercase, lowercase, and number
                  </p>
                )
              ) : null}
            </div>

            {/* Confirm Password */}
            <div>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full bg-transparent border-b px-0 py-3 focus:outline-none transition-colors placeholder:text-white/30 ${
                  errors.confirmPassword 
                    ? 'border-white/40' 
                    : formData.confirmPassword && formData.password === formData.confirmPassword
                      ? 'border-white'
                      : 'border-white/20 focus:border-white'
                }`}
                placeholder={t('register.confirmPassword')}
              />
              {errors.confirmPassword ? (
                <p className="text-white/50 text-xs mt-2">{errors.confirmPassword}</p>
              ) : formData.confirmPassword && formData.password === formData.confirmPassword ? (
                <p className="text-white text-xs mt-2">✓ Passwords match</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || checkingUsername || checkingEmail}
              className="w-full bg-white text-black py-3.5 font-light tracking-wide hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {isSubmitting ? t('register.creating') : t('register.create')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-white/40 text-sm">
              {t('register.hasAccount')}{' '}
              <Link
                to="/login"
                className="text-white hover:text-white/70 transition-colors underline underline-offset-4"
              >
                {t('nav.signIn')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-white/30">
          <Link to="/" className="hover:text-white/50 transition-colors">
            {t('nav.home')}
          </Link>
          <span>•</span>
          <Link to="/admin/login" className="hover:text-white/50 transition-colors">
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

