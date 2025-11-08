import { LRUCache } from 'lru-cache';

export const cache = new LRUCache({
  max: 500,              // Max 500 cache entries
  maxSize: 100 * 1024 * 1024,  // Max 100MB total cache size
  sizeCalculation: (value) => {
    // Calculate size of each cached item
    return JSON.stringify(value).length;
  },
  ttl: 1000 * 60 * 10,  // 10 minutes default TTL
  allowStale: false,    
  updateAgeOnGet: false, 
  updateAgeOnHas: false,
});

// Helper function for cache invalidation
export const clearCache = () => {
  cache.clear();
};

