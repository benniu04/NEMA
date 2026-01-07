// API Configuration
// For physical devices, use your computer's local IP address
const API_BASE_URL = __DEV__
  ? 'http://172.16.27.142:5000'  // Your local IP - update if it changes
  : 'https://nema-nc78.onrender.com';

export default API_BASE_URL;
