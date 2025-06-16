import express from 'express';
import { Movie } from '../models/movie.model.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { generatePresignedUrl } from '../config/s3.js';

const moviesRoutes = express.Router();

// Helper function to generate fresh URLs for both videos and images
const generateFreshUrls = async (movie) => {
  const freshData = {};
  
  // Generate fresh video URLs from S3 keys
  if (movie.videoUrls) {
    freshData.videoUrls = {};
    for (const [quality, s3Key] of Object.entries(movie.videoUrls)) {
      if (s3Key && s3Key.trim() !== '') {
        try {
          freshData.videoUrls[quality] = await generatePresignedUrl(s3Key);
        } catch (error) {
          console.error(`Error generating video URL for ${quality}:`, error);
          freshData.videoUrls[quality] = null;
        }
      }
    }
  }
  
  // Generate fresh image URLs from S3 keys
  if (movie.posterKey) {
    try {
      freshData.posterUrl = await generatePresignedUrl(movie.posterKey);
    } catch (error) {
      console.error('Error generating poster URL:', error);
      freshData.posterUrl = null;
    }
  }
  
  if (movie.thumbnailKey) {
    try {
      freshData.thumbnailUrl = await generatePresignedUrl(movie.thumbnailKey);
    } catch (error) {
      console.error('Error generating thumbnail URL:', error);
      freshData.thumbnailUrl = null;
    }
  }
  
  return freshData;
};

// Public routes
moviesRoutes.get('/', async (req, res) => {
  try {
    const { limit, exclude } = req.query;
    let query = {};

    // If exclude parameter is provided, exclude that movie from results
    if (exclude) {
      query._id = { $ne: exclude };
    }

    // Build the query
    let moviesQuery = Movie.find(query);

    // If limit is provided, limit the number of results
    if (limit) {
      moviesQuery = moviesQuery.limit(parseInt(limit));
    }

    // Execute the query
    const movies = await moviesQuery;
    res.status(200).json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ message: "Failed to fetch movies", error: error.message });
  }
});

moviesRoutes.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }
    res.status(200).json(movie);
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(500).json({ message: "Failed to fetch movie", error: error.message });
  }
});

// Protected admin routes
moviesRoutes.post('/', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const movie = new Movie(req.body);
    await movie.save();
    res.status(201).json(movie);
  } catch (error) {
    console.error('Error creating movie:', error);
    res.status(400).json({ message: "Failed to add movie", error: error.message });
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
    
    res.status(200).json(movie);
  } catch (error) {
    console.error('Error updating movie:', error);
    res.status(400).json({ message: "Failed to update movie", error: error.message });
  }
});

moviesRoutes.delete('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }
    
    res.status(200).json({ message: "Movie deleted successfully" });
  } catch (error) {
    console.error('Error deleting movie:', error);
    res.status(500).json({ message: "Failed to delete movie", error: error.message });
  }
});

export default moviesRoutes;
