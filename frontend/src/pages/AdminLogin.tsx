import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API_BASE_URL from '../config/api';

interface FormData {
  username: string;
  password: string;
}

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include'
        });

        if (response.ok) {
          const userData = await response.json();
          if (userData.isAdmin) {
            navigate('/admin/upload');
            return;
          }
        }
      } catch (error) {
        console.log('Not authenticated');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        const raw = await response.text();
        console.error('JSON parse error:', parseError);
        console.error('Response text:', raw);
        throw new Error(`Server returned invalid JSON: ${raw.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (!data.user.isAdmin) {
        throw new Error('Access denied: Admin privileges required');
      }

      navigate('/admin/upload');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-amber-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500 animate-spin"></div>
          </div>
          <p className="text-amber-300/60 text-sm">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/30 via-[#0a0a0a] to-orange-950/20"></div>

        {/* Animated orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-600/15 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-orange-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-900/10 rounded-full blur-[150px]"></div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(245, 158, 11, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        ></div>

        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#0a0a0a_70%)]"></div>
      </div>

      {/* Content */}
      <div className="relative w-full max-w-md">
        {/* Decorative top line */}
        <div className={`absolute -top-px left-1/2 -translate-x-1/2 w-48 h-px transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
        </div>

        {/* Card */}
        <div className={`relative transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Card glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-b from-amber-500/20 via-transparent to-orange-500/20 rounded-2xl blur-sm"></div>

          {/* Card content */}
          <div className="relative bg-[#0f0f0f]/90 backdrop-blur-xl rounded-2xl border border-white/[0.05] overflow-hidden">
            {/* Top accent */}
            <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500"></div>

            <div className="p-8 sm:p-10">
              {/* Header */}
              <div className={`text-center mb-10 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {/* Icon */}
                <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl rotate-45 transform"></div>
                  <div className="absolute inset-0.5 bg-[#0f0f0f] rounded-[14px] rotate-45 transform"></div>
                  <svg className="relative w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>

                <h1 className="text-2xl font-medium text-white mb-2">Admin Portal</h1>
                <p className="text-white/40 text-sm">Secure access to control panel</p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-red-300/90 text-sm">{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username */}
                <div className={`transition-all duration-500 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <label className="block text-xs text-white/40 uppercase tracking-widest mb-2.5 ml-1">
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
                      required
                      className={`w-full bg-white/[0.03] border rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none transition-all duration-300 ${
                        focusedInput === 'username'
                          ? 'border-amber-500/50 bg-amber-500/[0.05] shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                          : 'border-white/[0.08] hover:border-white/[0.15]'
                      }`}
                      placeholder="Enter username"
                    />
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 opacity-0 transition-opacity duration-300 pointer-events-none ${focusedInput === 'username' ? 'opacity-100' : ''}`} style={{ filter: 'blur(20px)' }}></div>
                  </div>
                </div>

                {/* Password */}
                <div className={`transition-all duration-500 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <label className="block text-xs text-white/40 uppercase tracking-widest mb-2.5 ml-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => setFocusedInput('password')}
                      onBlur={() => setFocusedInput(null)}
                      required
                      className={`w-full bg-white/[0.03] border rounded-xl px-4 py-3.5 pr-12 text-white placeholder:text-white/20 focus:outline-none transition-all duration-300 ${
                        focusedInput === 'password'
                          ? 'border-amber-500/50 bg-amber-500/[0.05] shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                          : 'border-white/[0.08] hover:border-white/[0.15]'
                      }`}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <div className={`pt-3 transition-all duration-500 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="relative w-full group"
                  >
                    {/* Button glow */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition-opacity"></div>

                    {/* Button content */}
                    <div className={`relative flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-medium py-3.5 rounded-xl transition-all ${
                      isLoading ? 'opacity-80' : 'hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                    }`}>
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <span>Access Portal</span>
                          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </form>

              {/* Footer */}
              <div className={`mt-10 pt-6 border-t border-white/[0.05] transition-all duration-500 delay-600 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                <Link
                  to="/"
                  className="flex items-center justify-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors group"
                >
                  <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Return to NEMA</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative bottom line */}
        <div className={`absolute -bottom-px left-1/2 -translate-x-1/2 w-32 h-px transition-all duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
        </div>
      </div>

      {/* Corner accents */}
      <div className="fixed top-0 left-0 w-32 h-32">
        <div className="absolute top-4 left-4 w-px h-16 bg-gradient-to-b from-amber-500/50 to-transparent"></div>
        <div className="absolute top-4 left-4 w-16 h-px bg-gradient-to-r from-amber-500/50 to-transparent"></div>
      </div>
      <div className="fixed top-0 right-0 w-32 h-32">
        <div className="absolute top-4 right-4 w-px h-16 bg-gradient-to-b from-orange-500/50 to-transparent"></div>
        <div className="absolute top-4 right-4 w-16 h-px bg-gradient-to-l from-orange-500/50 to-transparent"></div>
      </div>
      <div className="fixed bottom-0 left-0 w-32 h-32">
        <div className="absolute bottom-4 left-4 w-px h-16 bg-gradient-to-t from-amber-500/30 to-transparent"></div>
        <div className="absolute bottom-4 left-4 w-16 h-px bg-gradient-to-r from-amber-500/30 to-transparent"></div>
      </div>
      <div className="fixed bottom-0 right-0 w-32 h-32">
        <div className="absolute bottom-4 right-4 w-px h-16 bg-gradient-to-t from-orange-500/30 to-transparent"></div>
        <div className="absolute bottom-4 right-4 w-16 h-px bg-gradient-to-l from-orange-500/30 to-transparent"></div>
      </div>
    </div>
  );
};

export default AdminLogin;
