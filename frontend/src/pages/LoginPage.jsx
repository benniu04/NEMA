import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading } = useUser();
  
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get redirect path from location state, or default to profile
  const from = location.state?.from?.pathname || '/profile';

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, from]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.login || !formData.password) {
      setError('Please enter your email/username and password');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    const result = await login(formData.login, formData.password);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
    
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p>Loading...</p>
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

        {/* Login Form */}
        <div className="bg-white/[0.02] border border-white/10 p-10">
          <h2 className="text-2xl font-light text-center mb-8 tracking-wide">Sign In</h2>
          
          {error && (
            <div className="bg-white/5 border border-white/20 text-white/90 px-4 py-3 mb-6 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                name="login"
                value={formData.login}
                onChange={handleChange}
                className="w-full bg-transparent border-b border-white/20 px-0 py-3 focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
                placeholder="Email or Username"
                autoComplete="username"
              />
            </div>

            <div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-transparent border-b border-white/20 px-0 py-3 focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
                placeholder="Password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-white text-black py-3.5 font-light tracking-wide hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {isSubmitting ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-white/40 text-sm">
              Don't have an account?{' '}
              <Link 
                to="/register"
                className="text-white hover:text-white/70 transition-colors underline underline-offset-4"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-white/30">
          <Link to="/" className="hover:text-white/50 transition-colors">
            Home
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

export default LoginPage;

