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

  // Search movies - tries server-side search first, falls back to client-side filtering
  async searchMovies(query: string): Promise<Movie[]> {
    const searchTerm = query.toLowerCase().trim();

    try {
      // Try server-side search first
      const response = await api.get('/api/movies/search', { params: { q: query, limit: 20 } });
      const results = Array.isArray(response.data) ? response.data : [];

      // If server search returns results, use them
      if (results.length > 0) {
        return results;
      }

      // Fall back to client-side search if server returns empty
      console.log('Server search returned empty, trying client-side search');
      return this.clientSideSearch(searchTerm);
    } catch (error: any) {
      console.error('Server search error:', error?.response?.status, error?.message);
      // Fall back to client-side search on error
      return this.clientSideSearch(searchTerm);
    }
  },

  // Client-side search fallback
  async clientSideSearch(searchTerm: string): Promise<Movie[]> {
    try {
      const response = await api.get('/api/movies', { params: { limit: 100 } });
      const allMovies = Array.isArray(response.data) ? response.data : [];

      return allMovies.filter((movie: Movie) => {
        const titleMatch = movie.title?.toLowerCase().includes(searchTerm);
        const directorMatch = movie.director?.toLowerCase().includes(searchTerm);
        const castMatch = movie.cast?.some(actor => actor.toLowerCase().includes(searchTerm));
        const genreMatch = movie.genre?.some(g => g.toLowerCase().includes(searchTerm));
        const descriptionMatch = movie.description?.toLowerCase().includes(searchTerm);

        return titleMatch || directorMatch || castMatch || genreMatch || descriptionMatch;
      });
    } catch (error) {
      console.error('Client-side search error:', error);
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
