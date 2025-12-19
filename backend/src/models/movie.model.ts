import mongoose, { Schema } from 'mongoose';
import type { IMovie } from '../types/index.js';

const movieSchema = new Schema<IMovie>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 10,
  },
  releaseDate: {
    type: Date,
    required: true,
  },
  genre: {
    type: [String], // Support multiple genres (e.g. ["Action", "Sci-Fi"])
    required: true,
  },
  director: {
    type: String,
    required: true,
  },
  cast: {
    type: [String],
  },
  language: {
    type: String,
    default: "English",
  },
  videoUrls: {
    '720p': String,     // Legacy: Direct MP4 URL
    '1080p': String,    // Legacy: Direct MP4 URL
    hls: String         // HLS master playlist (adaptive bitrate) - S3 key path
  },
  subtitleUrls: {
    en: String,   // English
    es: String,   // Spanish
    fr: String    // …etc
  },
  posterKey: String,     
  thumbnailKey: String,  
  posterUrl: String,
  thumbnailUrl: String,
  views: {
    type: Number,
    default: 0,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  tags: {
    type: [String],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// 1. Genre queries (filtering by genre)
// Query: Movie.find({ genre: 'Action' })
movieSchema.index({ genre: 1 });

// 2. Featured movies sorted by creation date
// Query: Movie.find({ isFeatured: true }).sort({ createdAt: -1 })
movieSchema.index({ isFeatured: 1, createdAt: -1 });

// 3. Title search (case-insensitive partial match)
// Query: Movie.find({ title: /search term/i })
movieSchema.index({ title: 'text', description: 'text' });

// 4. Rating-based queries (top rated movies)
// Query: Movie.find().sort({ rating: -1 })
movieSchema.index({ rating: -1 });

// 5. Recent movies query
// Query: Movie.find().sort({ releaseDate: -1 })
movieSchema.index({ releaseDate: -1 });

// 6. Director lookup
// Query: Movie.find({ director: 'Director Name' })
movieSchema.index({ director: 1 });

// Note: _id is automatically indexed by MongoDB
// Note: Compound indexes can be used for queries on prefix fields
// Example: { isFeatured: 1, createdAt: -1 } can be used for:
//   - { isFeatured: 1 } 
//   - { isFeatured: 1, createdAt: -1 }

export const Movie = mongoose.model<IMovie>('Movie', movieSchema);

