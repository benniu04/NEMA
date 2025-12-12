import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 * Works with your existing UserContext
 */
const ProtectedRoute = ({ children, redirectTo = '/login' }) => {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-amber-100/60">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // User is authenticated, render children
  return children;
};

export default ProtectedRoute;
