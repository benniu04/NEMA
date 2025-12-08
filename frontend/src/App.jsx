import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import ProtectedRoute from './components/ProtectedRoute'
import { trackPageView } from './config/analytics'

// Lazy load all page components for code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const VideoPlayerPage = lazy(() => import('./pages/VideoPlayerPage'))
const AdminUploadPage = lazy(() => import('./pages/AdminUploadPage'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
      <p className="text-amber-100/60 text-sm">Loading...</p>
    </div>
  </div>
)

function App() {
  const location = useLocation()

  // Track page views on route changes
  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location])

  return (
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
          <Route path="/profile" element={<ProfilePage />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route 
            path="/admin/upload" 
            element={
              <ProtectedRoute>
                <AdminUploadPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Suspense>
    </UserProvider>
  )
}

export default App