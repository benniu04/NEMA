import express from 'express';
import { Movie } from '../models/movie.model.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { generateCloudfrontSignedUrl, deleteS3Object } from '../config/s3.js';
import { cache, clearCache } from '../config/cache.js';
import logger from '../config/logger.js';

const moviesRoutes = express.Router();

// Helper function to generate fresh signed URLs from S3 keys via CloudFront
// OPTIMIZED: Generate all URLs in parallel for significant speed improvement
const generateFreshSignedUrls = async (movie) => {
  const freshData = {};
  const urlPromises = [];
  
  // Collect all URL generation promises to run in parallel
  if (movie.videoUrls) {
    freshData.videoUrls = {};
    const videoPromises = Object.entries(movie.videoUrls).map(async ([quality, s3Key]) => {
      if (s3Key && s3Key.trim() !== '') {
        try {
          const signedUrl = await generateCloudfrontSignedUrl(s3Key);
          return { type: 'video', quality, url: signedUrl };
        } catch (error) {
          logger.error(`Error generating CloudFront URL for ${quality}:`, { error: error.message, s3Key });
          return { type: 'video', quality, url: null };
        }
      }
      return { type: 'video', quality, url: '' };
    });
    urlPromises.push(...videoPromises);
  }
  
  // Add poster URL promise
  if (movie.posterKey) {
    urlPromises.push(
      generateCloudfrontSignedUrl(movie.posterKey)
        .then(url => ({ type: 'poster', url }))
        .catch(error => {
          logger.error('Error generating CloudFront URL for poster:', { error: error.message, posterKey: movie.posterKey });
          return { type: 'poster', url: null };
        })
    );
  }
  
  // Add thumbnail URL promise
  if (movie.thumbnailKey) {
    urlPromises.push(
      generateCloudfrontSignedUrl(movie.thumbnailKey)
        .then(url => ({ type: 'thumbnail', url }))
        .catch(error => {
          logger.error('Error generating CloudFront URL for thumbnail:', { error: error.message, thumbnailKey: movie.thumbnailKey });
          return { type: 'thumbnail', url: null };
        })
    );
  }
  
  // Generate ALL URLs in parallel - MUCH faster!
  const results = await Promise.all(urlPromises);
  
  // Map results back to freshData
  results.forEach(result => {
    if (result.type === 'video') {
      if (!freshData.videoUrls) freshData.videoUrls = {};
      freshData.videoUrls[result.quality] = result.url;
    } else if (result.type === 'poster') {
      freshData.posterUrl = result.url;
    } else if (result.type === 'thumbnail') {
      freshData.thumbnailUrl = result.url;
    }
  });
  
  return freshData;
};

// Public routes
moviesRoutes.get('/', async (req, res) => {
  try {
    const cacheKey = req.originalUrl;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, max-age=300, must-revalidate');
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    const { limit, exclude } = req.query;
    let query = {};

    if (exclude) {
      query._id = { $ne: exclude };
    }

    let moviesQuery = Movie.find(query);

    if (limit) {
      moviesQuery = moviesQuery.limit(parseInt(limit));
    }

    const movies = await moviesQuery;
    
    // Generate fresh signed URLs for each movie
    const moviesWithFreshUrls = await Promise.all(
      movies.map(async (movie) => {
        const movieObj = movie.toObject();
        const freshUrls = await generateFreshSignedUrls(movie);
        return { ...movieObj, ...freshUrls };
      })
    );

    // Cache for 30 minutes on server
    cache.set(cacheKey, moviesWithFreshUrls, { ttl: 1000 * 60 * 30 });
    // Cache for 5 minutes in browser
    res.set('Cache-Control', 'public, max-age=300, must-revalidate');
    res.set('X-Cache', 'MISS');
    res.status(200).json(moviesWithFreshUrls);
  } catch (error) {
    logger.error('Error fetching movies:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: "Failed to fetch movies" });
  }
});

// Lightweight search with text index + fuzzy fallback
moviesRoutes.get('/search', async (req, res) => {
  const query = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit) || 10, 20);

  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    // Primary: text search ranked by score
    const textResults = await Movie.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(limit);

    // Fallback: regex-based partial matches to fill remaining slots
    const remaining = limit - textResults.length;
    let fallbackResults = [];

    if (remaining > 0) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');

      fallbackResults = await Movie.find({
        _id: { $nin: textResults.map(movie => movie._id) },
        $or: [
          { title: regex },
          { description: regex },
          { director: regex },
          { cast: regex },
          { tags: regex }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(remaining);
    }

    const combinedResults = [...textResults, ...fallbackResults];

    // Refresh signed URLs before returning
    const moviesWithFreshUrls = await Promise.all(
      combinedResults.map(async (movie) => {
        const movieObj = movie.toObject();
        const freshUrls = await generateFreshSignedUrls(movie);
        return { ...movieObj, ...freshUrls };
      })
    );

    res.status(200).json(moviesWithFreshUrls);
  } catch (error) {
    logger.error('Error searching movies:', { error: error.message, query, stack: error.stack });
    res.status(500).json({ message: 'Failed to search movies' });
  }
});

moviesRoutes.get('/:id', async (req, res) => {
  try {
    const cacheKey = req.originalUrl;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, max-age=30, must-revalidate');
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }
    
    const movieObj = movie.toObject();
    const freshUrls = await generateFreshSignedUrls(movie);
    const responseData = { ...movieObj, ...freshUrls };
    
    // Cache for 1 hour on server (signed URLs valid for 24h)
    cache.set(cacheKey, responseData, { ttl: 1000 * 60 * 60 });
    // Cache for 5 minutes in browser (balance between freshness and performance)
    res.set('Cache-Control', 'public, max-age=300, must-revalidate');
    res.set('X-Cache', 'MISS');
    res.status(200).json(responseData);
  } catch (error) {
    logger.error('Error fetching movie:', { error: error.message, movieId: req.params.id, stack: error.stack });
    res.status(500).json({ message: "Failed to fetch movie" });
  }
});

// Protected admin routes
moviesRoutes.post('/', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const movie = new Movie(req.body);
    await movie.save();
    clearCache();
    res.status(201).json(movie);
  } catch (error) {
    logger.error('Error creating movie:', { error: error.message, stack: error.stack });
    res.status(400).json({ message: "Failed to add movie" });
  }
});

moviesRoutes.put('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }
    
    clearCache();
    res.status(200).json(movie);
  } catch (error) {
    logger.error('Error updating movie:', { error: error.message, movieId: req.params.id, stack: error.stack });
    res.status(400).json({ message: "Failed to update movie" });
  }
});

moviesRoutes.delete('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }
    
    // Collect all S3 keys to delete
    const keysToDelete = [];
    
    // Add video URLs (720p, 1080p, etc.)
    if (movie.videoUrls) {
      Object.values(movie.videoUrls).forEach(key => {
        if (key && key.trim() !== '') {
          keysToDelete.push(key);
        }
      });
    }
    
    // Add poster key
    if (movie.posterKey && movie.posterKey.trim() !== '') {
      keysToDelete.push(movie.posterKey);
    }
    
    // Add thumbnail key
    if (movie.thumbnailKey && movie.thumbnailKey.trim() !== '') {
      keysToDelete.push(movie.thumbnailKey);
    }
    
    // Delete all S3 objects
    const deletePromises = keysToDelete.map(key => 
      deleteS3Object(key).catch(error => {
        logger.error('Failed to delete S3 object, continuing...', { key, error: error.message });
        // Don't throw - continue with deletion even if some S3 objects fail
      })
    );
    
    await Promise.all(deletePromises);
    logger.info('Deleted S3 objects for movie', { movieId: req.params.id, keysDeleted: keysToDelete.length });
    
    // Now delete the movie from database
    await Movie.findByIdAndDelete(req.params.id);
    
    clearCache();
    res.status(200).json({ 
      message: "Movie deleted successfully",
      s3ObjectsDeleted: keysToDelete.length 
    });
  } catch (error) {
    logger.error('Error deleting movie:', { error: error.message, movieId: req.params.id, stack: error.stack });
    res.status(500).json({ message: "Failed to delete movie" });
  }
});

// Add this route for fixing malformed keys
moviesRoutes.post('/fix-keys/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const fixes = [];

    // Fix video URLs
    if (movie.videoUrls) {
      const fixedVideoUrls = {};
      for (const [quality, key] of Object.entries(movie.videoUrls)) {
        if (key && typeof key === 'string') {
          let fixedKey = key;
          
          // Fix missing dot before extension
          if (fixedKey.includes('mp4') && !fixedKey.includes('.mp4')) {
            fixedKey = fixedKey.replace('mp4', '.mp4');
            fixes.push(`Fixed video ${quality}: added .mp4 extension`);
          }
          if (fixedKey.includes('mov') && !fixedKey.includes('.mov')) {
            fixedKey = fixedKey.replace('mov', '.mov');
            fixes.push(`Fixed video ${quality}: added .mov extension`);
          }
          
          fixedVideoUrls[quality] = fixedKey;
        }
      }
      movie.videoUrls = fixedVideoUrls;
    }

    // Fix poster key
    if (movie.posterKey) {
      let fixedKey = movie.posterKey;
      
      // Fix double extensions
      if (fixedKey.includes('PNGpng')) {
        fixedKey = fixedKey.replace('PNGpng', '.png');
        fixes.push('Fixed poster: removed duplicate PNG extension');
      }
      if (fixedKey.includes('JPGjpg')) {
        fixedKey = fixedKey.replace('JPGjpg', '.jpg');
        fixes.push('Fixed poster: removed duplicate JPG extension');
      }
      if (fixedKey.includes('JPEGjpeg')) {
        fixedKey = fixedKey.replace('JPEGjpeg', '.jpeg');
        fixes.push('Fixed poster: removed duplicate JPEG extension');
      }
      
      movie.posterKey = fixedKey;
    }

    // Fix thumbnail key
    if (movie.thumbnailKey) {
      let fixedKey = movie.thumbnailKey;
      
      // Fix double extensions
      if (fixedKey.includes('PNGpng')) {
        fixedKey = fixedKey.replace('PNGpng', '.png');
        fixes.push('Fixed thumbnail: removed duplicate PNG extension');
      }
      if (fixedKey.includes('JPGjpg')) {
        fixedKey = fixedKey.replace('JPGjpg', '.jpg');
        fixes.push('Fixed thumbnail: removed duplicate JPG extension');
      }
      if (fixedKey.includes('JPEGjpeg')) {
        fixedKey = fixedKey.replace('JPEGjpeg', '.jpeg');
        fixes.push('Fixed thumbnail: removed duplicate JPEG extension');
      }
      
      movie.thumbnailKey = fixedKey;
    }

    // Clear old URL fields (they should be generated dynamically)
    movie.posterUrl = '';
    movie.thumbnailUrl = '';

    await movie.save();

    res.status(200).json({ 
      message: "Keys fixed successfully", 
      fixes,
      movie 
    });

  } catch (error) {
    logger.error('Error fixing keys:', { error: error.message, movieId: req.params.id, stack: error.stack });
    res.status(500).json({ message: "Failed to fix keys" });
  }
});

export default moviesRoutes;
