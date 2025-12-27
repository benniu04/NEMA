import api from './api';
import type { Movie, Review, PaginatedResponse } from '../types';

export const moviesService = {
  // Get all movies with optional limit
  async getMovies(page = 1, limit = 20): Promise<{ movies: Movie[]; total: number; hasMore: boolean }> {
    try {
      const response = await api.get('/api/movies', { params: { limit } });
      // Backend returns array directly
      const movies = Array.isArray(response.data) ? response.data : [];
      return {
        movies,
        total: movies.length,
        hasMore: false, // Backend doesn't paginate, returns all with limit
      };
    } catch (error) {
      console.error('Error fetching movies:', error);
      return { movies: [], total: 0, hasMore: false };
    }
  },

  // Get featured movies (filter from all movies where isFeatured is true)
  async getFeaturedMovies(): Promise<Movie[]> {
    try {
      const response = await api.get('/api/movies');
      const movies = Array.isArray(response.data) ? response.data : [];
      return movies.filter((movie: Movie) => movie.isFeatured);
    } catch (error) {
      console.error('Error fetching featured movies:', error);
      return [];
    }
  },

  // Get personalized recommendations (or popular movies if not logged in)
  async getRecommendations(limit = 20): Promise<Movie[]> {
    try {
      const response = await api.get('/api/movies/recommendations', { params: { limit } });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  },

  // Get movie by ID
  async getMovieById(movieId: string): Promise<Movie | null> {
    try {
      const response = await api.get(`/api/movies/${movieId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching movie:', error);
      return null;
    }
  },

  // Get movies by genre (filter from all movies)
  async getMoviesByGenre(genre: string, limit = 50): Promise<Movie[]> {
    try {
      const response = await api.get('/api/movies');
      const movies = Array.isArray(response.data) ? response.data : [];
      return movies
        .filter((movie: Movie) => movie.genre.includes(genre))
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching movies by genre:', error);
      return [];
    }
  },

  // Search movies
  async searchMovies(query: string): Promise<Movie[]> {
    try {
      const response = await api.get('/api/movies/search', { params: { q: query, limit: 20 } });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error searching movies:', error);
      return [];
    }
  },

  // Get movie reviews
  async getMovieReviews(movieId: string): Promise<{ reviews: Review[]; total: number }> {
    try {
      const response = await api.get(`/api/reviews/movie/${movieId}`);
      const reviews = Array.isArray(response.data) ? response.data : [];
      return { reviews, total: reviews.length };
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return { reviews: [], total: 0 };
    }
  },

  // Submit a review (requires deviceId for anonymous reviews)
  async submitReview(
    movieId: string,
    rating: number,
    comment: string,
    nickname: string,
    deviceId: string
  ): Promise<{ success: boolean; review?: Review; error?: string }> {
    try {
      const response = await api.post('/api/reviews', {
        movieId,
        rating,
        comment,
        nickname,
        deviceId
      });
      return { success: true, review: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to submit review' };
    }
  },

  // Delete a review
  async deleteReview(reviewId: string, deviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.delete(`/api/reviews/${reviewId}`, { params: { deviceId } });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to delete review' };
    }
  },

  // Add to watchlist
  async addToWatchlist(movieId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.post(`/api/users/watchlist/${movieId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to add to watchlist' };
    }
  },

  // Remove from watchlist
  async removeFromWatchlist(movieId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.delete(`/api/users/watchlist/${movieId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to remove from watchlist' };
    }
  },

  // Add to favorites
  async addToFavorites(movieId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.post(`/api/users/favorites/${movieId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to add to favorites' };
    }
  },

  // Remove from favorites
  async removeFromFavorites(movieId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.delete(`/api/users/favorites/${movieId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to remove from favorites' };
    }
  },
};
