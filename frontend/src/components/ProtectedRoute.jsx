import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import API_BASE_URL from '../config/api.js';

const ProtectedRoute = ({ children }) => {
  const [authStatus, setAuthStatus] = useState('checking');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          if (userData.isAdmin) {
            setAuthStatus('authenticated');
            return;
          }
        }
        
        setAuthStatus('unauthenticated');
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthStatus('unauthenticated');
      }
    };

    checkAuth();

    // Check authentication periodically (every 5 minutes)
    const interval = setInterval(checkAuth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute; 