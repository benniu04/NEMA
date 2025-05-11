import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import BrowsePage from './pages/BrowsePage'
import { Routes, Route } from 'react-router-dom'


function App() {

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/browse" element={<BrowsePage />} />
    </Routes>
  )
}

export default App
