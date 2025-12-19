import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Movie } from '../models/movie.model.js';
import { User } from '../models/user.model.js';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware.js';
import { generateCloudfrontSignedUrl, deleteS3Object } from '../config/s3.js';
import { cache, clearCache } from '../config/cache.js';
import logger from '../config/logger.js';
import type { AuthenticatedRequest, IMovie } from '../types/index.js';

const moviesRoutes = express.Router();

interface UrlResult {
  type: 'video' | 'poster' | 'thumbnail';
  quality?: string;
  url: string | null;
}

interface FreshUrls {
  videoUrls?: Record<string, string | null>;
  posterUrl?: string | null;
  thumbnailUrl?: string | null;
}

// Helper function to generate fresh signed URLs from S3 keys via CloudFront
const generateFreshSignedUrls = async (movie: IMovie): Promise<FreshUrls> => {
  const freshData: FreshUrls = {};
  const urlPromises: Promise<UrlResult>[] = [];
  
  if (movie.videoUrls) {
    freshData.videoUrls = {};
    const videoPromises = Object.entries(movie.videoUrls).map(async ([quality, s3Key]): Promise<UrlResult> => {
      if (s3Key && s3Key.trim() !== '') {
        try {
          const signedUrl = await generateCloudfrontSignedUrl(s3Key);
          return { type: 'video', quality, url: signedUrl };
        } catch (error) {
          const err = error as Error;
          logger.error(`Error generating CloudFront URL for ${quality}:`, { error: err.message, s3Key });
          return { type: 'video', quality, url: null };
        }
      }
      return { type: 'video', quality, url: '' };
    });
    urlPromises.push(...videoPromises);
  }
  
  if (movie.posterKey) {
    urlPromises.push(
      generateCloudfrontSignedUrl(movie.posterKey)
        .then((url): UrlResult => ({ type: 'poster', url }))
        .catch((error): UrlResult => {
          logger.error('Error generating CloudFront URL for poster:', { error: (error as Error).message, posterKey: movie.posterKey });
          return { type: 'poster', url: null };
        })
    );
  }
  
  if (movie.thumbnailKey) {
    urlPromises.push(
      generateCloudfrontSignedUrl(movie.thumbnailKey)
        .then((url): UrlResult => ({ type: 'thumbnail', url }))
        .catch((error): UrlResult => {
          logger.error('Error generating CloudFront URL for thumbnail:', { error: (error as Error).message, thumbnailKey: movie.thumbnailKey });
          return { type: 'thumbnail', url: null };
        })
    );
  }
  
  const results = await Promise.all(urlPromises);
  
  results.forEach(result => {
    if (result.type === 'video' && result.quality) {
      // Only add video URLs that are not empty/null
      if (result.url && result.url.trim() !== '') {
        if (!freshData.videoUrls) freshData.videoUrls = {};
        freshData.videoUrls[result.quality] = result.url;
      }
    } else if (result.type === 'poster') {
      freshData.posterUrl = result.url;
    } else if (result.type === 'thumbnail') {
      freshData.thumbnailUrl = result.url;
    }
  });
  
  return freshData;
};

// Public routes
moviesRoutes.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = req.originalUrl;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, max-age=300, must-revalidate');
      res.set('X-Cache', 'HIT');
      res.json(cached);
      return;
    }
    
    const { limit, exclude } = req.query;
    const query: Record<string, unknown> = {};

    if (exclude) {
      query._id = { $ne: exclude };
    }

    let moviesQuery = Movie.find(query);

    if (limit) {
      moviesQuery = moviesQuery.limit(parseInt(limit as string));
    }

    const movies = await moviesQuery;
    
    const moviesWithFreshUrls = await Promise.all(
      movies.map(async (movie) => {
        const movieObj = movie.toObject();
        const freshUrls = await generateFreshSignedUrls(movie);
        return { ...movieObj, ...freshUrls };
      })
    );

    cache.set(cacheKey, moviesWithFreshUrls, { ttl: 1000 * 60 * 30 });
    res.set('Cache-Control', 'public, max-age=300, must-revalidate');
    res.set('X-Cache', 'MISS');
    res.status(200).json(moviesWithFreshUrls);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching movies:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Failed to fetch movies" });
  }
});

moviesRoutes.get('/search', async (req: Request, res: Response): Promise<void> => {
  const query = ((req.query.q as string) || '').trim();
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

  if (!query) {
    res.status(400).json({ message: 'Search query is required' });
    return;
  }

  try {
    const textResults = await Movie.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(limit);

    const remaining = limit - textResults.length;
    let fallbackResults: typeof textResults = [];

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

    const moviesWithFreshUrls = await Promise.all(
      combinedResults.map(async (movie) => {
        const movieObj = movie.toObject();
        const freshUrls = await generateFreshSignedUrls(movie);
        return { ...movieObj, ...freshUrls };
      })
    );

    res.status(200).json(moviesWithFreshUrls);
  } catch (error) {
    const err = error as Error;
    logger.error('Error searching movies:', { error: err.message, query, stack: err.stack });
    res.status(500).json({ message: 'Failed to search movies' });
  }
});

moviesRoutes.get('/recommendations', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cacheKey = req.user ? `recommendations:${req.user.id}` : 'recommendations:anonymous';

    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'private, max-age=300');
      res.set('X-Cache', 'HIT');
      res.json(cached);
      return;
    }

    let recommendations: IMovie[] = [];
    let recommendationType = 'popular';

    if (req.user) {
      const user = await User.findById(req.user.id);

      if (user) {
        const favoriteGenres = user.favoriteGenres || [];
        const watchedMovieIds = (user.watchedFilms || []).map(w => w.movieId);
        const favoriteFilmIds = user.favoriteFilms || [];
        const watchlistIds = user.watchlist || [];

        const excludeIds = [...new Set([...watchedMovieIds, ...favoriteFilmIds, ...watchlistIds].map(id => id?.toString()).filter(Boolean))];

        if (favoriteGenres.length > 0) {
          recommendationType = 'personalized';

          const excludeObjectIds = excludeIds.map(id => new mongoose.Types.ObjectId(id));

          recommendations = await Movie.aggregate([
            {
              $match: {
                _id: { $nin: excludeObjectIds },
                genre: { $in: favoriteGenres }
              }
            },
            {
              $addFields: {
                genreMatchScore: {
                  $size: {
                    $setIntersection: ['$genre', favoriteGenres]
                  }
                }
              }
            },
            {
              $sort: { genreMatchScore: -1, rating: -1, views: -1 }
            },
            {
              $limit: limit
            }
          ]);
        }
      }
    }

    if (recommendations.length === 0) {
      recommendationType = 'popular';
      recommendations = await Movie.find()
        .sort({ views: -1, rating: -1 })
        .limit(limit);
    }

    const moviesWithFreshUrls = await Promise.all(
      recommendations.map(async (movie) => {
        const movieObj = 'toObject' in movie ? (movie as any).toObject() : movie;
        const freshUrls = await generateFreshSignedUrls(movie as IMovie);
        return { ...movieObj, ...freshUrls, recommendationType };
      })
    );

    const ttl = req.user ? 1000 * 60 * 5 : 1000 * 60 * 15;
    cache.set(cacheKey, moviesWithFreshUrls, { ttl });

    res.set('Cache-Control', req.user ? 'private, max-age=300' : 'public, max-age=900');
    res.set('X-Cache', 'MISS');
    res.status(200).json(moviesWithFreshUrls);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching recommendations:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Failed to fetch recommendations' });
  }
});

moviesRoutes.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = req.originalUrl;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, max-age=30, must-revalidate');
      res.set('X-Cache', 'HIT');
      res.json(cached);
      return;
    }

    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      res.status(404).json({ message: "Movie not found" });
      return;
    }
    
    const movieObj = movie.toObject();
    const freshUrls = await generateFreshSignedUrls(movie);
    const responseData = { ...movieObj, ...freshUrls };
    
    cache.set(cacheKey, responseData, { ttl: 1000 * 60 * 60 });
    res.set('Cache-Control', 'public, max-age=300, must-revalidate');
    res.set('X-Cache', 'MISS');
    res.status(200).json(responseData);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching movie:', { error: err.message, movieId: req.params.id, stack: err.stack });
    res.status(500).json({ message: "Failed to fetch movie" });
  }
});

// Protected admin routes
moviesRoutes.post('/', [authMiddleware, adminMiddleware], async (req: Request, res: Response): Promise<void> => {
  try {
    const movie = new Movie(req.body);
    await movie.save();
    clearCache();
    res.status(201).json(movie);
  } catch (error) {
    const err = error as Error;
    logger.error('Error creating movie:', { error: err.message, stack: err.stack });
    res.status(400).json({ message: "Failed to add movie" });
  }
});

moviesRoutes.put('/:id', [authMiddleware, adminMiddleware], async (req: Request, res: Response): Promise<void> => {
  try {
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!movie) {
      res.status(404).json({ message: "Movie not found" });
      return;
    }
    
    clearCache();
    res.status(200).json(movie);
  } catch (error) {
    const err = error as Error;
    logger.error('Error updating movie:', { error: err.message, movieId: req.params.id, stack: err.stack });
    res.status(400).json({ message: "Failed to update movie" });
  }
});

moviesRoutes.delete('/:id', [authMiddleware, adminMiddleware], async (req: Request, res: Response): Promise<void> => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      res.status(404).json({ message: "Movie not found" });
      return;
    }
    
    const keysToDelete: string[] = [];
    
    if (movie.videoUrls) {
      Object.values(movie.videoUrls).forEach(key => {
        if (key && key.trim() !== '') {
          keysToDelete.push(key);
        }
      });
    }
    
    if (movie.posterKey && movie.posterKey.trim() !== '') {
      keysToDelete.push(movie.posterKey);
    }
    
    if (movie.thumbnailKey && movie.thumbnailKey.trim() !== '') {
      keysToDelete.push(movie.thumbnailKey);
    }
    
    const deletePromises = keysToDelete.map(key => 
      deleteS3Object(key).catch(error => {
        logger.error('Failed to delete S3 object, continuing...', { key, error: (error as Error).message });
      })
    );
    
    await Promise.all(deletePromises);
    logger.info('Deleted S3 objects for movie', { movieId: req.params.id, keysDeleted: keysToDelete.length });
    
    await Movie.findByIdAndDelete(req.params.id);
    
    clearCache();
    res.status(200).json({ 
      message: "Movie deleted successfully",
      s3ObjectsDeleted: keysToDelete.length 
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error deleting movie:', { error: err.message, movieId: req.params.id, stack: err.stack });
    res.status(500).json({ message: "Failed to delete movie" });
  }
});

moviesRoutes.post('/fix-keys/:id', [authMiddleware, adminMiddleware], async (req: Request, res: Response): Promise<void> => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      res.status(404).json({ message: "Movie not found" });
      return;
    }

    const fixes: string[] = [];

    if (movie.videoUrls) {
      const fixedVideoUrls: Record<string, string> = {};
      for (const [quality, key] of Object.entries(movie.videoUrls)) {
        if (key && typeof key === 'string') {
          let fixedKey = key;
          
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
      movie.videoUrls = fixedVideoUrls as any;
    }

    if (movie.posterKey) {
      let fixedKey = movie.posterKey;
      
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

    if (movie.thumbnailKey) {
      let fixedKey = movie.thumbnailKey;
      
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

    movie.posterUrl = '';
    movie.thumbnailUrl = '';

    await movie.save();

    res.status(200).json({ 
      message: "Keys fixed successfully", 
      fixes,
      movie 
    });

  } catch (error) {
    const err = error as Error;
    logger.error('Error fixing keys:', { error: err.message, movieId: req.params.id, stack: err.stack });
    res.status(500).json({ message: "Failed to fix keys" });
  }
});

export default moviesRoutes;

