import React, { useState, useEffect, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import API_BASE_URL from '../config/api';

interface AdminUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  redirectTo?: string;
}

/**
 * Protected Route Component
 * Redirects to login if user/admin is not authenticated
 * Checks both regular user (UserContext) and admin authentication
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false, 
  redirectTo = '/login' 
}) => {
  const { user, loading: userLoading } = useUser();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminLoading, setAdminLoading] = useState<boolean>(true);

  // Check for admin authentication
  useEffect(() => {
    const checkAdminAuth = async (): Promise<void> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData: AdminUser = await response.json();
          if (userData.isAdmin) {
            setAdminUser(userData);
          }
        }
      } catch (error) {
        console.log('No admin authentication');
      } finally {
        setAdminLoading(false);
      }
    };

    checkAdminAuth();
  }, []);

  // Show loading state while checking authentication
  if (userLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-amber-100/60">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if admin is required and if admin is authenticated
  if (requireAdmin) {
    if (!adminUser) {
      return <Navigate to="/admin/login" replace />;
    }
    return <>{children}</>;
  }

  // For non-admin routes, check regular user or admin
  if (!user && !adminUser) {
    return <Navigate to={redirectTo} replace />;
  }

  // User or admin is authenticated, render children
  return <>{children}</>;
};

export default ProtectedRoute;

