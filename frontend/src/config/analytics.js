import ReactGA from 'react-ga4';

// Initialize Google Analytics
export const initGA = () => {
  // Replace with your actual Measurement ID from Google Analytics
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  
  // Only initialize if we have a real measurement ID
  if (!measurementId || measurementId === 'G-XXXXXXXXXX' || measurementId.length < 10) {
    console.log('⚠️  Google Analytics not configured. Set VITE_GA_MEASUREMENT_ID to enable tracking.');
    return;
  }
  
  try {
    ReactGA.initialize(measurementId, {
      gaOptions: {
        // Automatically detect cookie domain for Netlify
        cookieDomain: 'auto',
        // Use secure cookies
        cookieFlags: 'SameSite=None;Secure',
      },
      // Enable in production only
      gtagOptions: {
        send_page_view: false, // We handle this manually
      },
    });
    console.log('📊 Google Analytics initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Google Analytics:', error);
  }
};

// Track page views
export const trackPageView = (path) => {
  if (!import.meta.env.VITE_GA_MEASUREMENT_ID) return;
  try {
    ReactGA.send({ hitType: 'pageview', page: path });
  } catch (error) {
    // Silently fail if GA not initialized
  }
};

// Track custom events
export const trackEvent = (category, action, label, value) => {
  if (!import.meta.env.VITE_GA_MEASUREMENT_ID) return;
  try {
    ReactGA.event({
      category,
      action,
      label,
      value,
    });
  } catch (error) {
    // Silently fail if GA not initialized
  }
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

