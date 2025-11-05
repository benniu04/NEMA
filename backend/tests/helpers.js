import jwt from 'jsonwebtoken';
import { ENV_VARS } from '../config/envVars.js';

/**
 * Generate a valid admin JWT token for testing
 */
export const generateAdminToken = () => {
  return jwt.sign(
    { 
      id: 'admin',
      username: ENV_VARS.ADMIN_USERNAME,
      isAdmin: true 
    },
    ENV_VARS.JWT_SECRET,
    { expiresIn: '2h' }
  );
};

/**
 * Create a mock movie object
 */
export const createMockMovie = (overrides = {}) => ({
  title: 'Test Movie',
  description: 'Test Description',
  rating: 8.5,
  releaseDate: new Date('2024-01-01'),
  genre: ['Action', 'Sci-Fi'],
  director: 'Test Director',
  cast: ['Actor 1', 'Actor 2'],
  language: 'English',
  videoUrls: {
    '720p': 'video/test720p.mp4',
    '1080p': 'video/test1080p.mp4'
  },
  posterKey: 'image/test-poster.jpg',
  thumbnailKey: 'image/test-thumbnail.jpg',
  ...overrides
});

/**
 * Create a mock comment object
 */
export const createMockComment = (movieId, overrides = {}) => ({
  movieId,
  deviceId: 'test-device-id',
  nickname: 'Test User',
  content: 'This is a test comment',
  ...overrides
});

/**
 * Create a mock review object
 */
export const createMockReview = (movieId, overrides = {}) => ({
  movieId,
  deviceId: 'test-device-id',
  nickname: 'Test Reviewer',
  rating: 4,
  comment: 'This is a test review',
  ...overrides
});

/**
 * Wait for a specified amount of time
 */
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

