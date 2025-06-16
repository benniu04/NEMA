import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
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
    '720p': String,  // "videos/1234567890-movie.mp4"
    '1080p': String  // "videos/1234567890-movie-hd.mp4"
  },
  posterKey: String,     // "posters/1234567890-poster.jpg"
  thumbnailKey: String,  // "thumbnails/1234567890-thumb.jpg"
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

export const Movie = mongoose.model('Movie', movieSchema);
