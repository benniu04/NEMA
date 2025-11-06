import ReactGA from 'react-ga4';

// Initialize Google Analytics
export const initGA = () => {
  // Replace with your actual Measurement ID from Google Analytics
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';
  
  if (measurementId && measurementId !== 'G-XXXXXXXXXX') {
    ReactGA.initialize(measurementId);
    console.log('📊 Google Analytics initialized');
  }
};

// Track page views
export const trackPageView = (path) => {
  ReactGA.send({ hitType: 'pageview', page: path });
};

// Track custom events
export const trackEvent = (category, action, label, value) => {
  ReactGA.event({
    category,
    action,
    label,
    value,
  });
};

// Specific event trackers for your site
export const analytics = {
  // Track when a user plays a video
  playVideo: (movieTitle) => {
    trackEvent('Video', 'Play', movieTitle);
  },
  
  // Track when a user submits a review
  submitReview: (movieTitle, rating) => {
    trackEvent('Review', 'Submit', movieTitle, rating);
  },
  
  // Track when a user deletes a review
  deleteReview: (movieTitle) => {
    trackEvent('Review', 'Delete', movieTitle);
  },
  
  // Track catalog filtering
  filterCatalog: (filterType, filterValue) => {
    trackEvent('Catalog', 'Filter', `${filterType}: ${filterValue}`);
  },
};

