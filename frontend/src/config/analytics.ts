import ReactGA from 'react-ga4';

// Initialize Google Analytics
export const initGA = (): void => {
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
        // Explicitly set cookie domain for Netlify
        cookieDomain: window.location.hostname,
        // Use secure cookies for HTTPS
        cookieFlags: 'SameSite=Lax;Secure',
      },
      gtagOptions: {
        send_page_view: false, // We handle this manually
        cookie_domain: window.location.hostname,
        cookie_flags: 'SameSite=Lax;Secure',
      },
    });
    console.log('📊 Google Analytics initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Google Analytics:', error);
  }
};

// Track page views
export const trackPageView = (path: string): void => {
  if (!import.meta.env.VITE_GA_MEASUREMENT_ID) return;
  try {
    ReactGA.send({ hitType: 'pageview', page: path });
  } catch (error) {
    // Silently fail if GA not initialized
  }
};

// Track custom events
export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number
): void => {
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
  playVideo: (movieTitle: string): void => {
    trackEvent('Video', 'Play', movieTitle);
  },
  
  // Track when a user submits a review
  submitReview: (movieTitle: string, rating: number): void => {
    trackEvent('Review', 'Submit', movieTitle, rating);
  },
  
  // Track when a user deletes a review
  deleteReview: (movieTitle: string): void => {
    trackEvent('Review', 'Delete', movieTitle);
  },
  
  // Track catalog filtering
  filterCatalog: (filterType: string, filterValue: string): void => {
    trackEvent('Catalog', 'Filter', `${filterType}: ${filterValue}`);
  },
  
  // Track watch time milestones
  trackWatchMilestone: (movieTitle: string, percentage: number): void => {
    trackEvent('Video', 'Watch Milestone', `${movieTitle} - ${percentage}%`);
  },
  
  // Track video completion
  trackVideoComplete: (movieTitle: string): void => {
    trackEvent('Video', 'Complete', movieTitle);
  },
};

