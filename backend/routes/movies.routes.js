import express from 'express';
import { Movie } from '../models/movie.model.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { generateCloudfrontSignedUrl } from '../config/s3.js';
import { cache, clearCache } from '../config/cache.js';
import logger from '../config/logger.js';

const moviesRoutes = express.Router();

// Helper function to generate fresh signed URLs from S3 keys via CloudFront
const generateFreshSignedUrls = async (movie) => {
  const freshData = {};
  
  // Generate fresh video URLs from S3 keys via CloudFront
  if (movie.videoUrls) {
    freshData.videoUrls = {};
    for (const [quality, s3Key] of Object.entries(movie.videoUrls)) {
      if (s3Key && s3Key.trim() !== '') {
        try {
          const signedUrl = await generateCloudfrontSignedUrl(s3Key);
          freshData.videoUrls[quality] = signedUrl;
        } catch (error) {
          logger.error(`Error generating CloudFront URL for ${quality}:`, { error: error.message, s3Key });
          freshData.videoUrls[quality] = null;
        }
      } else {
        freshData.videoUrls[quality] = '';
      }
    }
  }
  
  // Generate fresh image URLs from S3 keys via CloudFront
  if (movie.posterKey) {
    try {
      freshData.posterUrl = await generateCloudfrontSignedUrl(movie.posterKey);
    } catch (error) {
      logger.error('Error generating CloudFront URL for poster:', { error: error.message, posterKey: movie.posterKey });
      freshData.posterUrl = null;
    }
  }
  
  if (movie.thumbnailKey) {
    try {
      freshData.thumbnailUrl = await generateCloudfrontSignedUrl(movie.thumbnailKey);
    } catch (error) {
      logger.error('Error generating CloudFront URL for thumbnail:', { error: error.message, thumbnailKey: movie.thumbnailKey });
      freshData.thumbnailUrl = null;
    }
  }
  
  return freshData;
};

// Public routes
moviesRoutes.get('/', async (req, res) => {
  try {
    const cacheKey = req.originalUrl;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      // Use shorter browser cache with must-revalidate for editable content
      res.set('Cache-Control', 'public, max-age=30, must-revalidate');
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

    // Cache for 5 minutes on server
    cache.set(cacheKey, moviesWithFreshUrls, { ttl: 1000 * 60 * 5 });
    // But only 30 seconds in browser with must-revalidate
    res.set('Cache-Control', 'public, max-age=30, must-revalidate');
    res.set('X-Cache', 'MISS');
    res.status(200).json(moviesWithFreshUrls);
  } catch (error) {
    logger.error('Error fetching movies:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: "Failed to fetch movies" });
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
    
    // Cache for 10 minutes on server
    cache.set(cacheKey, responseData, { ttl: 1000 * 60 * 10 });
    // But only 30 seconds in browser with must-revalidate
    res.set('Cache-Control', 'public, max-age=30, must-revalidate');
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
    const movie = await Movie.findByIdAndDelete(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }
    
    clearCache();
    res.status(200).json({ message: "Movie deleted successfully" });
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
