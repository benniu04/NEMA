import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import { SettingsProvider } from './context/SettingsContext'
import ProtectedRoute from './components/ProtectedRoute'
import { trackPageView } from './config/analytics'

// Lazy load all page components for code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const VideoPlayerPage = lazy(() => import('./pages/VideoPlayerPage.tsx'))
const AdminUploadPage = lazy(() => import('./pages/AdminUploadPage'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.tsx'))
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'))
const PeoplePage = lazy(() => import('./pages/PeoplePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'))

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
      </UserProvider>
    </SettingsProvider>
  )
}

export default App

