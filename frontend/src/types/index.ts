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
}

export interface SubtitleUrls {
  en?: string;
  es?: string;
  fr?: string;
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
  recommendationType?: string;
}

// ============================================
// Comment Types
// ============================================
export interface Comment {
  _id: string;
  movieId: string;
  deviceId: string;
  nickname: string;
  content: string;
  createdAt: string;
}

// ============================================
// Review Types
// ============================================
export interface Review {
  _id: string;
  movieId: string | Movie;
  deviceId: string;
  nickname: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Activity Types
// ============================================
export type ActivityType = 'review' | 'comment' | 'watchlist_add' | 'favorite_add' | 'watched';

export interface Activity {
  _id: string;
  userId: string | User;
  type: ActivityType;
  movieId: string | Movie;
  reviewId?: string;
  commentId?: string;
  rating?: number;
  content?: string;
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
// Context Types
// ============================================
export interface UserContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  register: (email: string, username: string, password: string, displayName?: string | null) => Promise<{ success: boolean; user?: User; error?: string }>;
  login: (login: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; user?: User; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  addToWatchlist: (movieId: string) => Promise<{ success: boolean; error?: string }>;
  removeFromWatchlist: (movieId: string) => Promise<{ success: boolean; error?: string }>;
  isInWatchlist: (movieId: string) => boolean;
  addToFavorites: (movieId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  removeFromFavorites: (movieId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  isInFavorites: (movieId: string) => boolean;
  followUser: (userId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  unfollowUser: (userId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  isFollowing: (userId: string) => boolean;
  refreshUser: () => Promise<void>;
}

export interface SettingsContextValue {
  autoplay: boolean;
  setAutoplay: (value: boolean) => void;
  defaultQuality: '720p' | '1080p';
  setDefaultQuality: (value: '720p' | '1080p') => void;
  notifications: boolean;
  setNotifications: (value: boolean) => void;
}

// ============================================
// Component Props Types
// ============================================
export interface MovieCardProps {
  movie: Movie;
}

export interface CarouselRowProps {
  title: string;
  movies: Movie[];
  viewAllLink?: string;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export interface CommentSectionProps {
  movieId: string;
}

export interface ReviewSectionProps {
  movieId: string;
}

export interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export interface LazyImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: string;
}

