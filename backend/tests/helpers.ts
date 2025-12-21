import jwt from 'jsonwebtoken';
import { ENV_VARS } from '../src/config/envVars';
import { Types } from 'mongoose';

interface MockMovie {
  title: string;
  description: string;
  rating: number;
  releaseDate: Date;
  genre: string[];
  director: string;
  cast: string[];
  language: string;
  videoUrls: Record<string, string>;
  posterKey: string;
  thumbnailKey: string;
  [key: string]: unknown;
}

interface MockComment {
  movieId: string | Types.ObjectId;
  deviceId: string;
  nickname: string;
  content: string;
  [key: string]: unknown;
}

interface MockReview {
  movieId: string | Types.ObjectId;
  deviceId: string;
  nickname: string;
  rating: number;
  comment: string;
  [key: string]: unknown;
}

/**
 * Generate a valid admin JWT token for testing
 */
export const generateAdminToken = (): string => {
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
export const createMockMovie = (overrides: Partial<MockMovie> = {}): MockMovie => ({
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
export const createMockComment = (movieId: string | Types.ObjectId, overrides: Partial<MockComment> = {}): MockComment => ({
  movieId,
  deviceId: 'test-device-id',
  nickname: 'Test User',
  content: 'This is a test comment',
  ...overrides
});

/**
 * Create a mock review object
 */
export const createMockReview = (movieId: string | Types.ObjectId, overrides: Partial<MockReview> = {}): MockReview => ({
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
export const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
