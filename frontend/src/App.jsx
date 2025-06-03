import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import CatalogPage from './pages/CatalogPage'
import VideoPlayerPage from './pages/VideoPlayerPage'
import AdminUploadPage from './pages/AdminUploadPage'
import AdminLogin from './pages/AdminLogin'
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'


function App() {

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/catalog" element={<CatalogPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/video/:id" element={<VideoPlayerPage />} />
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
  )
}

export default App