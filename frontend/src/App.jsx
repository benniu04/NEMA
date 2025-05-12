import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import CatalogPage from './pages/CatalogPage'
import VideoPlayerPage from './pages/VideoPlayerPage'
import { Routes, Route } from 'react-router-dom'


function App() {

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/catalog" element={<CatalogPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/video/:id" element={<VideoPlayerPage />} />
    </Routes>
  )
}

export default App