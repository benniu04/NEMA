import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useSettings } from '../context/SettingsContext';
import API_BASE_URL from '../config/api';

interface FormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

interface FormErrors {
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  displayName?: string;
  submit?: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, loading } = useUser();
  const { t } = useSettings();

  const [formData, setFormData] = useState<FormData>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const trimmedValue = (name === 'email' || name === 'username') ? value.trim() : value;

    setFormData(prev => ({ ...prev, [name]: trimmedValue }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    } else if (emailAvailable === false) {
      newErrors.email = 'This email is already registered';
    }

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

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.displayName && formData.displayName.length > 50) {
      newErrors.displayName = 'Display name cannot exceed 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    const result = await register(
      formData.email,
      formData.username,
      formData.password,
      formData.displayName || undefined
    );

    if (result.success) {
      navigate('/profile');
    } else {
      setErrors({ submit: result.error });
    }

    setIsSubmitting(false);
  };

  const getInputClasses = (fieldName: string, isValid?: boolean) => {
    const baseClasses = "w-full bg-white/[0.03] border rounded-lg px-4 py-3 focus:outline-none transition-all duration-200 text-white placeholder:text-white/20";

    if (errors[fieldName as keyof FormErrors]) {
      return `${baseClasses} border-red-500/50 bg-red-500/[0.02]`;
    }
    if (isValid) {
      return `${baseClasses} border-green-500/50 bg-green-500/[0.02]`;
    }
    if (focusedInput === fieldName) {
      return `${baseClasses} border-amber-500/50 bg-white/[0.05]`;
    }
    return `${baseClasses} border-white/10 hover:border-white/20`;
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
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero-image.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-black/40" />

        {/* Overlay Content */}
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16">
          <blockquote className="max-w-md">
            <p className="text-xl text-white/90 font-light italic leading-relaxed mb-4">
              "Every great film should seem new every time you see it."
            </p>
            <footer className="text-white/50 text-sm">— Roger Ebert</footer>
          </blockquote>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative overflow-y-auto">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] via-transparent to-transparent" />

        <div className="w-full max-w-sm relative z-10 py-8">
          {/* Header */}
          <div className={`mb-8 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h1 className="text-3xl font-light text-white mb-2">Create account</h1>
            <p className="text-white/50 text-sm">Join the NEMA community today</p>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 mb-6 text-sm rounded-lg">
              {errors.submit}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className={`transition-all duration-500 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  className={getInputClasses('email', emailAvailable === true)}
                  placeholder="Enter your email"
                />
                {checkingEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white/60 rounded-full"></div>
                  </div>
                )}
                {!checkingEmail && emailAvailable === true && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email}</p>}
            </div>

            {/* Username */}
            <div className={`transition-all duration-500 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  onFocus={() => setFocusedInput('username')}
                  onBlur={() => setFocusedInput(null)}
                  className={getInputClasses('username', usernameAvailable === true)}
                  placeholder="Choose a username"
                />
                {checkingUsername && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white/60 rounded-full"></div>
                  </div>
                )}
                {!checkingUsername && usernameAvailable === true && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.username && <p className="text-red-400 text-xs mt-1.5">{errors.username}</p>}
              {!errors.username && usernameAvailable === false && (
                <p className="text-red-400 text-xs mt-1.5">This username is already taken</p>
              )}
            </div>

            {/* Display Name */}
            <div className={`transition-all duration-500 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Display Name <span className="text-white/20">(optional)</span>
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                onFocus={() => setFocusedInput('displayName')}
                onBlur={() => setFocusedInput(null)}
                className={getInputClasses('displayName')}
                placeholder="How should we call you?"
              />
              {errors.displayName && <p className="text-red-400 text-xs mt-1.5">{errors.displayName}</p>}
            </div>

            {/* Password */}
            <div className={`transition-all duration-500 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                className={getInputClasses('password', formData.password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password))}
                placeholder="Create a password"
              />
              {errors.password ? (
                <p className="text-red-400 text-xs mt-1.5">{errors.password}</p>
              ) : formData.password ? (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-1 h-1 rounded-full ${formData.password.length >= 8 ? 'bg-green-400' : 'bg-white/20'}`}></div>
                    <span className={formData.password.length >= 8 ? 'text-green-400' : 'text-white/30'}>8+ characters</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-1 h-1 rounded-full ${/(?=.*[a-z])(?=.*[A-Z])/.test(formData.password) ? 'bg-green-400' : 'bg-white/20'}`}></div>
                    <span className={/(?=.*[a-z])(?=.*[A-Z])/.test(formData.password) ? 'text-green-400' : 'text-white/30'}>Upper & lowercase</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-1 h-1 rounded-full ${/\d/.test(formData.password) ? 'bg-green-400' : 'bg-white/20'}`}></div>
                    <span className={/\d/.test(formData.password) ? 'text-green-400' : 'text-white/30'}>Contains number</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Confirm Password */}
            <div className={`transition-all duration-500 delay-600 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onFocus={() => setFocusedInput('confirmPassword')}
                onBlur={() => setFocusedInput(null)}
                className={getInputClasses('confirmPassword', formData.confirmPassword !== '' && formData.password === formData.confirmPassword)}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1.5">{errors.confirmPassword}</p>}
              {!errors.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="text-green-400 text-xs mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Passwords match
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className={`pt-2 transition-all duration-500 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <button
                type="submit"
                disabled={isSubmitting || checkingUsername || checkingEmail}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium py-3.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </>
                ) : 'Create Account'}
              </button>
            </div>
          </form>

          {/* Sign In Link */}
          <p className={`mt-8 text-center text-white/40 text-sm transition-all duration-500 delay-800 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            Already have an account?{' '}
            <Link to="/login" className="text-amber-500 hover:text-amber-400 transition-colors">
              Sign in
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

export default RegisterPage;
