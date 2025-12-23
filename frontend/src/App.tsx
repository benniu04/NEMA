import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import { SettingsProvider } from './context/SettingsContext'
import { NotificationProvider } from './context/NotificationContext'
import { MessagingProvider } from './context/MessagingContext'
import ProtectedRoute from './components/ProtectedRoute'
import { trackPageView } from './config/analytics'

// Helper function to handle lazy loading errors (e.g. when a new version is deployed and old chunks are missing)
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasBeenForceReloaded = window.localStorage.getItem('page-has-been-force-reloaded');

    try {
      const component = await componentImport();
      window.localStorage.removeItem('page-has-been-force-reloaded');
      return component;
    } catch (error) {
      if (!pageHasBeenForceReloaded) {
        // ChunkLoadError usually happens when the hash of the file doesn't match the one on the server
        console.error('Error loading chunk, forcing reload:', error);
        window.localStorage.setItem('page-has-been-force-reloaded', 'true');
        window.location.reload();
      }
      throw error;
    }
  });

// Lazy load all page components for code splitting
const HomePage = lazyWithRetry(() => import('./pages/HomePage'))
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage'))
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage'))
const CatalogPage = lazyWithRetry(() => import('./pages/CatalogPage'))
const VideoPlayerPage = lazyWithRetry(() => import('./pages/VideoPlayerPage'))
const AdminUploadPage = lazyWithRetry(() => import('./pages/AdminUploadPage'))
const AdminLogin = lazyWithRetry(() => import('./pages/AdminLogin'))
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'))
const RegisterPage = lazyWithRetry(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = lazyWithRetry(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazyWithRetry(() => import('./pages/ResetPasswordPage'))
const VerifyEmailPage = lazyWithRetry(() => import('./pages/VerifyEmailPage'))
const ProfilePage = lazyWithRetry(() => import('./pages/ProfilePage'))
const UserProfilePage = lazyWithRetry(() => import('./pages/UserProfilePage'))
const PeoplePage = lazyWithRetry(() => import('./pages/PeoplePage'))
const SettingsPage = lazyWithRetry(() => import('./pages/SettingsPage'))
const WatchlistPage = lazyWithRetry(() => import('./pages/WatchlistPage'))
const MessagesPage = lazyWithRetry(() => import('./pages/MessagesPage'))
const NotificationsPage = lazyWithRetry(() => import('./pages/NotificationsPage'))

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
      <p className="text-amber-100/60 text-sm">Loading...</p>
    </div>
  </div>
)

const App: React.FC = () => {
  const location = useLocation()

  // Track page views on route changes
  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location])

  return (
    <SettingsProvider>
      <UserProvider>
        <NotificationProvider>
          <MessagingProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/video/:id" element={<VideoPlayerPage />} />

            {/* User Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:username" element={<UserProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/upload"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminUploadPage />
                </ProtectedRoute>
              }
            />
            </Routes>
          </Suspense>
          </MessagingProvider>
        </NotificationProvider>
      </UserProvider>
    </SettingsProvider>
  )
}

export default App

