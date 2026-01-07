// ============================================
// User Types
// ============================================
export interface UserStats {
  filmsWatched: number;
  reviewsWritten: number;
  commentsWritten: number;
  followersCount?: number;
  followingCount?: number;
}

export interface WatchedFilm {
  movieId: string | Movie;
  watchedAt: string;
}

export interface User {
  id: string;
  _id?: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  banner?: string | null;
  bio: string;
  favoriteGenres: string[];
  favoriteFilms: (string | Movie)[];
  watchlist: (string | Movie)[];
  watchedFilms: WatchedFilm[];
  following: (string | User)[];
  followers: (string | User)[];
  blockedUsers: (string | User)[];
  stats: UserStats;
  isVerified: boolean;
  isAdmin: boolean;
  authProvider?: 'local' | 'google';
  lastLogin?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  bio: string;
  favoriteGenres: string[];
  stats: UserStats;
  createdAt: string;
  isFollowing?: boolean;
}

// ============================================
// Movie Types
// ============================================
export interface VideoUrls {
  '720p'?: string;
  '1080p'?: string;
  'hls'?: string;
  [key: string]: string | undefined;
}

export interface SubtitleUrls {
  en?: string;
  es?: string;
  fr?: string;
  [key: string]: string | undefined;
}

export interface Movie {
  _id: string;
  title: string;
  description: string;
  rating: number;
  releaseDate: string;
  genre: string[];
  director: string;
  cast: string[];
  language: string;
  duration?: number; // Duration in minutes
  videoUrls: VideoUrls;
  subtitleUrls?: SubtitleUrls;
  posterKey?: string;
  thumbnailKey?: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  views: number;
  isFeatured: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Review Types
// ============================================
export interface Review {
  _id: string;
  movieId: string | Movie;
  userId?: string | User;
  deviceId: string;
  nickname: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Notification Types
// ============================================
export type NotificationType = 'follow' | 'like' | 'comment' | 'reply' | 'message' | 'system';

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    fromUserId?: string;
    fromUsername?: string;
    fromAvatar?: string;
    movieId?: string;
    movieTitle?: string;
    reviewId?: string;
    commentId?: string;
  };
  isRead: boolean;
  createdAt: string;
}

// ============================================
// API Response Types
// ============================================
export interface ApiError {
  message: string;
  error?: string;
  errors?: Array<{ msg: string; param?: string }>;
}

export interface AuthResponse {
  message: string;
  user: User;
  token?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================
// Navigation Types
// ============================================
export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
  MovieDetail: { movieId: string };
  VideoPlayer: { movieId: string; startTime?: number };
  Profile: { username?: string };
  Settings: undefined;
  Search: undefined;
  Messages: undefined;
  Conversation: { conversationId: string };
  Notifications: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Catalog: undefined;
  Watchlist: undefined;
  ProfileTab: undefined;
};

// ============================================
// Watch Progress Types
// ============================================
export interface WatchProgressItem {
  movieId: string;
  position: number;        // Current position in milliseconds
  duration: number;        // Total duration in milliseconds
  percentage: number;      // Progress percentage (0-100)
  lastWatched: string;     // ISO timestamp
  thumbnailUrl?: string;   // Cached for quick display
  title?: string;          // Cached for quick display
}

export interface CategoryData {
  id: string;
  title: string;
  movies: Movie[];
  type: 'continueWatching' | 'trending' | 'newReleases' | 'genre' | 'similar' | 'recommended';
}
