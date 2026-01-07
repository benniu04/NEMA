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

  // Get trending movies (sorted by views)
  async getTrending(limit = 10): Promise<Movie[]> {
    try {
      const response = await api.get('/api/movies');
      const movies = Array.isArray(response.data) ? response.data : [];
      return movies
        .sort((a: Movie, b: Movie) => (b.views || 0) - (a.views || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching trending movies:', error);
      return [];
    }
  },

  // Get new releases (last 30 days)
  async getNewReleases(limit = 10): Promise<Movie[]> {
    try {
      const response = await api.get('/api/movies');
      const movies = Array.isArray(response.data) ? response.data : [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      return movies
        .filter((m: Movie) => new Date(m.releaseDate) >= thirtyDaysAgo)
        .sort((a: Movie, b: Movie) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching new releases:', error);
      return [];
    }
  },

  // Get similar movies based on shared genres/tags
  async getSimilarMovies(movie: Movie, limit = 10): Promise<Movie[]> {
    try {
      const response = await api.get('/api/movies');
      const movies = Array.isArray(response.data) ? response.data : [];

      // Calculate similarity score based on shared genres and tags
      const calculateSimilarity = (m: Movie): number => {
        let score = 0;
        const movieGenres = movie.genre || [];
        const movieTags = movie.tags || [];

        // Shared genres (higher weight)
        const sharedGenres = (m.genre || []).filter(g => movieGenres.includes(g));
        score += sharedGenres.length * 3;

        // Shared tags
        const sharedTags = (m.tags || []).filter(t => movieTags.includes(t));
        score += sharedTags.length * 2;

        // Same director
        if (m.director === movie.director) {
          score += 2;
        }

        return score;
      };

      return movies
        .filter((m: Movie) => m._id !== movie._id) // Exclude the source movie
        .map((m: Movie) => ({ ...m, _similarityScore: calculateSimilarity(m) }))
        .filter((m: any) => m._similarityScore > 0) // Only include movies with some similarity
        .sort((a: any, b: any) => b._similarityScore - a._similarityScore)
        .slice(0, limit)
        .map(({ _similarityScore, ...m }: any) => m as Movie); // Remove similarity score from result
    } catch (error) {
      console.error('Error fetching similar movies:', error);
      return [];
    }
  },

  // Get top rated movies
  async getTopRated(limit = 10): Promise<Movie[]> {
    try {
      const response = await api.get('/api/movies');
      const movies = Array.isArray(response.data) ? response.data : [];
      return movies
        .sort((a: Movie, b: Movie) => (b.rating || 0) - (a.rating || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching top rated movies:', error);
      return [];
    }
  },
};
