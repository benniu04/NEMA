import { Request, Response, NextFunction } from 'express';
import { Document, Types } from 'mongoose';

// ============================================
// Environment Variables
// ============================================
export interface EnvVars {
  MONGO_URL: string;
  PORT: string | number;
  JWT_SECRET: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD_HASH: string;
  EMAIL_USER?: string;
  EMAIL_PASS?: string;
  CONTACT_EMAIL?: string;
  AWS_REGION?: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_BUCKET_NAME: string;
  CLOUDFRONT_DOMAIN?: string;
  CLOUDFRONT_KEY_PAIR_ID?: string;
  CLOUDFRONT_PRIVATE_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
}

// ============================================
// User Types
// ============================================
export interface IWatchedFilm {
  movieId: Types.ObjectId;
  watchedAt: Date;
}

export interface IUserStats {
  filmsWatched: number;
  reviewsWritten: number;
  commentsWritten: number;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  username: string;
  password?: string;
  firebaseUid?: string | null;
  authProvider: 'local' | 'google';
  displayName: string;
  avatar?: string | null;
  banner?: string | null;
  bio: string;
  favoriteGenres: string[];
  favoriteFilms: Types.ObjectId[];
  watchlist: Types.ObjectId[];
  watchedFilms: IWatchedFilm[];
  following: Types.ObjectId[];
  followers: Types.ObjectId[];
  stats: IUserStats;
  isVerified: boolean;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  isAdmin: boolean;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generatePasswordResetToken(): string;
  generateEmailVerificationToken(): string;
  toPublicProfile(): PublicProfile;
  toPrivateProfile(): PrivateProfile;
}

export interface PublicProfile {
  id: Types.ObjectId;
  username: string;
  displayName: string;
  avatar?: string | null;
  bio: string;
  favoriteGenres: string[];
  stats: IUserStats & {
    followersCount: number;
    followingCount: number;
  };
  createdAt: Date;
}

export interface PrivateProfile extends PublicProfile {
  email: string;
  banner?: string | null;
  favoriteFilms: Types.ObjectId[];
  watchlist: Types.ObjectId[];
  watchedFilms: IWatchedFilm[];
  following: Types.ObjectId[];
  followers: Types.ObjectId[];
  isVerified: boolean;
  isAdmin: boolean;
  lastLogin?: Date | null;
  updatedAt: Date;
}

export interface IUserModel {
  findByPasswordResetToken(token: string): Promise<IUser | null>;
  findByEmailVerificationToken(token: string): Promise<IUser | null>;
}

// ============================================
// Movie Types
// ============================================
export interface IVideoUrls {
  '720p'?: string;
  '1080p'?: string;
  hls?: string;
}

export interface ISubtitleUrls {
  en?: string;
  es?: string;
  fr?: string;
}

export interface IMovie extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  rating: number;
  releaseDate: Date;
  genre: string[];
  director: string;
  cast: string[];
  language: string;
  videoUrls: IVideoUrls;
  subtitleUrls: ISubtitleUrls;
  posterKey?: string;
  thumbnailKey?: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  views: number;
  isFeatured: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Comment Types
// ============================================
export interface IComment extends Document {
  _id: Types.ObjectId;
  movieId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  likes: Types.ObjectId[];
  parentId?: Types.ObjectId | null;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Review Types
// ============================================
export interface IReview extends Document {
  _id: Types.ObjectId;
  movieId: Types.ObjectId;
  userId: Types.ObjectId;
  rating: number;
  content: string;
  likes: Types.ObjectId[];
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Activity Types
// ============================================
export type ActivityType = 'watch' | 'review' | 'comment' | 'like' | 'watchlist_add' | 'favorite_add' | 'follow';

export interface IActivity extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: ActivityType;
  movieId?: Types.ObjectId;
  targetUserId?: Types.ObjectId;
  reviewId?: Types.ObjectId;
  commentId?: Types.ObjectId;
  createdAt: Date;
}

// ============================================
// WatchTime Types
// ============================================
export interface IWatchTime extends Document {
  _id: Types.ObjectId;
  visitorId: string;
  visitorIdConfidence?: number;
  userId?: Types.ObjectId;
  movieId: Types.ObjectId;
  currentTime: number;
  duration: number;
  quality: string;
  lastUpdated: Date;
  createdAt: Date;
}

// ============================================
// Express Extended Types
// ============================================
export interface JWTPayload {
  id: string;
  username?: string;
  email?: string;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  requestId?: string;
}

export type AuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export type RouteHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next?: NextFunction
) => Promise<void | Response> | void | Response;

// ============================================
// API Response Types
// ============================================
export interface ApiError {
  message: string;
  error?: string;
  errors?: Array<{ msg: string; param?: string }>;
}

export interface ApiSuccess<T = unknown> {
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================
// Upload Types
// ============================================
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  bucket: string;
  key: string;
  acl: string;
  contentType: string;
  contentDisposition?: string;
  storageClass: string;
  serverSideEncryption?: string;
  metadata: Record<string, string>;
  location: string;
  etag: string;
}

export interface MulterS3Request extends Omit<AuthenticatedRequest, 'file' | 'files'> {
  file?: UploadedFile;
  files?: UploadedFile[] | Record<string, UploadedFile[]>;
}

