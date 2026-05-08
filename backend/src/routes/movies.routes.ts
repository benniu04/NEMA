import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Movie } from '../models/movie.model.js';
import { User } from '../models/user.model.js';
import { WatchTime } from '../models/watchTime.model.js';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware.js';
import { validateMovie } from '../middleware/validation.middleware.js';
import { generateCloudfrontSignedUrl, deleteS3Object } from '../config/s3.js';
import { cache, clearCache } from '../config/cache.js';
import { getClientIp } from '../utils/clientIp.js';
import { getBehaviorRecommendations, scoreMoviesByTaste } from '../services/recommendations.service.js';
import logger from '../config/logger.js';
import type { AuthenticatedRequest, IMovie } from '../types/index.js';

const moviesRoutes = express.Router();

// Allow-list for admin-settable Movie fields. Anything not on this list (e.g.
// `views`, `_id`, `createdAt`, `updatedAt`, `__v`, or any future field) is
// stripped from req.body before reaching Mongoose. Prevents mass assignment
// where an admin (or any future bug that loosens the admin gate) could
// flip server-managed fields by including them in the JSON body.
const MOVIE_WRITABLE_FIELDS = [
  'title',
  'description',
  'rating',
  'releaseDate',
  'genre',
  'director',
  'cast',
  'language',
  'videoUrls',
  'subtitleUrls',
  'posterKey',
  'thumbnailKey',
  'posterUrl',
  'thumbnailUrl',
  'hasImageVariants',
  'isFeatured',
  'isHero',
  'tags'
] as const;

const pickMovieFields = (body: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of MOVIE_WRITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      out[key] = body[key];
    }
  }
  return out;
};

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

// Get the hero movie (the one displayed in the hero banner)
moviesRoutes.get('/hero', async (_req: Request, res: Response): Promise<void> => {
  try {
    // No server-side caching for hero - it changes frequently
    const heroMovie = await Movie.findOne({ isHero: true });
    if (!heroMovie) {
      res.status(404).json({ message: 'No hero movie set' });
      return;
    }

    const movieObj = heroMovie.toObject();
    const freshUrls = await generateFreshSignedUrls(heroMovie);
    const responseData = { ...movieObj, ...freshUrls };

    // Disable browser caching so hero changes take effect immediately
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).json(responseData);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching hero movie:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Failed to fetch hero movie' });
  }
});

// Get featured movies (for the featured section)
moviesRoutes.get('/featured', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 6, 20);
    const cacheKey = `movies:featured:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, max-age=60, must-revalidate');
      res.set('X-Cache', 'HIT');
      res.json(cached);
      return;
    }

    const featuredMovies = await Movie.find({ isFeatured: true })
      .sort({ createdAt: -1 })
      .limit(limit);

    const moviesWithFreshUrls = await Promise.all(
      featuredMovies.map(async (movie) => {
        const movieObj = movie.toObject();
        const freshUrls = await generateFreshSignedUrls(movie);
        return { ...movieObj, ...freshUrls };
      })
    );

    cache.set(cacheKey, moviesWithFreshUrls, { ttl: 1000 * 60 * 5 }); // 5 min cache
    res.set('Cache-Control', 'public, max-age=60, must-revalidate');
    res.set('X-Cache', 'MISS');
    res.status(200).json(moviesWithFreshUrls);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching featured movies:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Failed to fetch featured movies' });
  }
});

moviesRoutes.get('/recommendations', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cacheKey = req.user ? `recommendations:${req.user.id}` : `recommendations:device:${getClientIp(req)}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'private, max-age=300');
      res.set('X-Cache', 'HIT');
      res.json(cached);
      return;
    }

    let recommendations: IMovie[] = [];
    let recommendationType: 'behavior' | 'personalized' | 'popular' = 'popular';

    const identity = req.user
      ? { userId: req.user.id }
      : { deviceId: getClientIp(req) };

    const { movies: behaviorMovies } = await getBehaviorRecommendations(identity, limit);
    if (behaviorMovies.length > 0) {
      recommendations = behaviorMovies;
      recommendationType = 'behavior';
    }

    if (recommendations.length === 0 && req.user) {
      const user = await User.findById(req.user.id);
      if (user) {
        const favoriteGenres = user.favoriteGenres || [];
        const watchedMovieIds = (user.watchedFilms || []).map(w => w.movieId);
        const favoriteFilmIds = user.favoriteFilms || [];
        const watchlistIds = user.watchlist || [];
        const excludeIds = [...new Set(
          [...watchedMovieIds, ...favoriteFilmIds, ...watchlistIds]
            .map(id => id?.toString())
            .filter(Boolean)
        )];

        if (favoriteGenres.length > 0) {
          const excludeObjectIds = excludeIds.map(id => new mongoose.Types.ObjectId(id));
          recommendations = await scoreMoviesByTaste({
            topGenres: favoriteGenres,
            topDirectors: [],
            excludeMovieIds: excludeObjectIds,
            limit
          });
          if (recommendations.length > 0) {
            recommendationType = 'personalized';
          }
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

    const ttl = recommendationType === 'behavior'
      ? 1000 * 60 * 10
      : req.user ? 1000 * 60 * 5 : 1000 * 60 * 15;
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

moviesRoutes.get('/because-you-watched', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 12, 30);
    const cacheKey = req.user
      ? `becauseYouWatched:${req.user.id}:${limit}`
      : `becauseYouWatched:device:${getClientIp(req)}:${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'private, max-age=300');
      res.set('X-Cache', 'HIT');
      res.json(cached);
      return;
    }

    const match = req.user
      ? { userId: new mongoose.Types.ObjectId(req.user.id), completionPercentage: { $gte: 50 } }
      : { deviceId: getClientIp(req), completionPercentage: { $gte: 50 } };

    const [anchorSession] = await WatchTime.aggregate([
      { $match: match },
      { $sort: { lastUpdatedAt: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'movies',
          localField: 'movieId',
          foreignField: '_id',
          as: 'movie'
        }
      },
      { $unwind: '$movie' }
    ]);

    if (!anchorSession) {
      const empty = { anchorMovie: null, recommendations: [] };
      cache.set(cacheKey, empty, { ttl: 1000 * 60 * 5 });
      res.set('X-Cache', 'MISS');
      res.status(200).json(empty);
      return;
    }

    const anchor = anchorSession.movie as IMovie;
    const watchedIds = await WatchTime.distinct('movieId', match.userId
      ? { userId: match.userId }
      : { deviceId: match.deviceId });
    const excludeIds = [
      new mongoose.Types.ObjectId(String(anchor._id)),
      ...watchedIds.map((id: mongoose.Types.ObjectId) => new mongoose.Types.ObjectId(String(id)))
    ];

    const scored = await scoreMoviesByTaste({
      topGenres: anchor.genre || [],
      topDirectors: anchor.director ? [anchor.director] : [],
      excludeMovieIds: excludeIds,
      limit
    });

    const recommendations = await Promise.all(
      scored.map(async (movie) => {
        const freshUrls = await generateFreshSignedUrls(movie);
        return { ...movie, ...freshUrls };
      })
    );

    let anchorPosterUrl: string | null = null;
    if (anchor.posterKey) {
      try {
        anchorPosterUrl = await generateCloudfrontSignedUrl(anchor.posterKey);
      } catch (error) {
        logger.error('Error signing anchor poster:', { error: (error as Error).message });
      }
    }

    const payload = {
      anchorMovie: {
        _id: anchor._id,
        title: anchor.title,
        posterUrl: anchorPosterUrl,
        genre: anchor.genre || []
      },
      recommendations
    };

    cache.set(cacheKey, payload, { ttl: 1000 * 60 * 5 });
    res.set('Cache-Control', 'private, max-age=300');
    res.set('X-Cache', 'MISS');
    res.status(200).json(payload);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching because-you-watched:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Failed to fetch recommendations' });
  }
});

moviesRoutes.get('/trending', async (req: Request, res: Response): Promise<void> => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 7, 1), 30);
    const limit = Math.min(parseInt(req.query.limit as string) || 12, 50);
    const cacheKey = `movies:trending:${days}:${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, max-age=900');
      res.set('X-Cache', 'HIT');
      res.json(cached);
      return;
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trending = await WatchTime.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$movieId', sessionCount: { $sum: 1 } } },
      { $sort: { sessionCount: -1 } },
      { $limit: limit * 2 },
      {
        $lookup: {
          from: 'movies',
          localField: '_id',
          foreignField: '_id',
          as: 'movie'
        }
      },
      { $unwind: '$movie' },
      { $limit: limit },
      {
        $replaceRoot: {
          newRoot: { $mergeObjects: ['$movie', { trendingScore: '$sessionCount' }] }
        }
      }
    ]);

    const moviesWithFreshUrls = await Promise.all(
      trending.map(async (movie: IMovie & { trendingScore: number }) => {
        const freshUrls = await generateFreshSignedUrls(movie);
        return { ...movie, ...freshUrls };
      })
    );

    cache.set(cacheKey, moviesWithFreshUrls, { ttl: 1000 * 60 * 15 });
    res.set('Cache-Control', 'public, max-age=900');
    res.set('X-Cache', 'MISS');
    res.status(200).json(moviesWithFreshUrls);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching trending movies:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Failed to fetch trending movies' });
  }
});

moviesRoutes.get('/:id/similar', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 12, 30);
    const id = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid movie id' });
      return;
    }

    const cacheKey = `movies:similar:${id}:${limit}`;
    const cached = cache.get(cacheKey) as Array<Record<string, unknown>> | undefined;
    let pool: Array<Record<string, unknown>>;
    let cacheHit = true;

    if (cached) {
      pool = cached;
    } else {
      cacheHit = false;
      const source = await Movie.findById(id);
      if (!source) {
        res.status(404).json({ message: 'Movie not found' });
        return;
      }

      const fetchSize = Math.max(limit + 20, 30);
      const scored = await scoreMoviesByTaste({
        topGenres: source.genre || [],
        topDirectors: source.director ? [source.director] : [],
        excludeMovieIds: [new mongoose.Types.ObjectId(id)],
        limit: fetchSize
      });

      pool = await Promise.all(
        scored.map(async (movie) => {
          const freshUrls = await generateFreshSignedUrls(movie);
          return { ...movie, ...freshUrls } as Record<string, unknown>;
        })
      );
      cache.set(cacheKey, pool, { ttl: 1000 * 60 * 30 });
    }

    let filtered = pool;
    if (req.user) {
      const user = await User.findById(req.user.id).select('watchedFilms favoriteFilms watchlist');
      if (user) {
        const watched = new Set([
          ...(user.watchedFilms || []).map(w => String(w.movieId)),
          ...(user.favoriteFilms || []).map(String),
          ...(user.watchlist || []).map(String)
        ]);
        filtered = pool.filter(m => !watched.has(String(m._id)));
      }
    }

    res.set('Cache-Control', 'private, max-age=300');
    res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
    res.status(200).json(filtered.slice(0, limit));
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching similar movies:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Failed to fetch similar movies' });
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
moviesRoutes.post('/', [authMiddleware, adminMiddleware, ...validateMovie], async (req: Request, res: Response): Promise<void> => {
  try {
    const movie = new Movie(pickMovieFields(req.body));
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
      pickMovieFields(req.body),
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

// Set a movie as the hero (only one movie can be hero at a time)
moviesRoutes.put('/:id/set-hero', [authMiddleware, adminMiddleware], async (req: Request, res: Response): Promise<void> => {
  try {
    const movieId = req.params.id;

    // First, find the movie to set as hero
    const movie = await Movie.findById(movieId);
    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    // Unset any existing hero movie
    await Movie.updateMany({ isHero: true }, { isHero: false });

    // Set the new hero movie
    movie.isHero = true;
    await movie.save();

    clearCache();
    logger.info('Set movie as hero', { movieId, title: movie.title });

    res.status(200).json({
      message: 'Movie set as hero successfully',
      movie
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error setting hero movie:', { error: err.message, movieId: req.params.id, stack: err.stack });
    res.status(500).json({ message: 'Failed to set hero movie' });
  }
});

// Remove hero status from a movie
moviesRoutes.delete('/:id/set-hero', [authMiddleware, adminMiddleware], async (req: Request, res: Response): Promise<void> => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    movie.isHero = false;
    await movie.save();

    clearCache();
    res.status(200).json({ message: 'Hero status removed', movie });
  } catch (error) {
    const err = error as Error;
    logger.error('Error removing hero status:', { error: err.message, movieId: req.params.id, stack: err.stack });
    res.status(500).json({ message: 'Failed to remove hero status' });
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

