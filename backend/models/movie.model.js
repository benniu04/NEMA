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
  },
  cast: {
    type: [String],
  },
  language: {
    type: String,
    default: "English",
  },
  videoUrls: {
    type: Map,
    of: String, // e.g. { "720p": "...", "1080p": "..." }
  },
  thumbnailUrl: {
    type: String,
  },
  posterUrl: {
    type: String,
  },
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
}, { timestamps: true });

export const Movie = mongoose.model('Movie', movieSchema);
