// API Base URL configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.PROD 
    ? 'https://nema-nc78.onrender.com'  // Production: Your Render backend
    : 'http://localhost:5001'            // Development: Local backend
);

export default API_BASE_URL; 