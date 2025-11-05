import { describe, it, expect, beforeEach } from '@jest/globals';
import { Movie } from '../../models/movie.model.js';
import { createMockMovie } from '../helpers.js';

describe('Movie Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid movie', async () => {
      const movieData = createMockMovie();
      const movie = new Movie(movieData);
      const savedMovie = await movie.save();

      expect(savedMovie._id).toBeDefined();
      expect(savedMovie.title).toBe(movieData.title);
      expect(savedMovie.description).toBe(movieData.description);
      expect(savedMovie.rating).toBe(movieData.rating);
      expect(savedMovie.genre).toEqual(movieData.genre);
      expect(savedMovie.director).toBe(movieData.director);
      expect(savedMovie.views).toBe(0);
      expect(savedMovie.isFeatured).toBe(false);
    });

    it('should fail when required fields are missing', async () => {
      const movie = new Movie({});
      
      await expect(movie.save()).rejects.toThrow();
    });

    it('should fail when title is missing', async () => {
      const movieData = createMockMovie();
      delete movieData.title;
      const movie = new Movie(movieData);
      
      await expect(movie.save()).rejects.toThrow();
    });

    it('should fail when description is missing', async () => {
      const movieData = createMockMovie();
      delete movieData.description;
      const movie = new Movie(movieData);
      
      await expect(movie.save()).rejects.toThrow();
    });

    it('should fail when rating is missing', async () => {
      const movieData = createMockMovie();
      delete movieData.rating;
      const movie = new Movie(movieData);
      
      await expect(movie.save()).rejects.toThrow();
    });

    it('should fail when rating is below 0', async () => {
      const movieData = createMockMovie({ rating: -1 });
      const movie = new Movie(movieData);
      
      await expect(movie.save()).rejects.toThrow();
    });

    it('should fail when rating is above 10', async () => {
      const movieData = createMockMovie({ rating: 11 });
      const movie = new Movie(movieData);
      
      await expect(movie.save()).rejects.toThrow();
    });

    it('should trim whitespace from title', async () => {
      const movieData = createMockMovie({ title: '  Test Movie  ' });
      const movie = new Movie(movieData);
      const savedMovie = await movie.save();
      
      expect(savedMovie.title).toBe('Test Movie');
    });

    it('should accept multiple genres', async () => {
      const movieData = createMockMovie({ 
        genre: ['Action', 'Sci-Fi', 'Thriller'] 
      });
      const movie = new Movie(movieData);
      const savedMovie = await movie.save();
      
      expect(savedMovie.genre).toHaveLength(3);
      expect(savedMovie.genre).toContain('Action');
      expect(savedMovie.genre).toContain('Sci-Fi');
      expect(savedMovie.genre).toContain('Thriller');
    });

    it('should default language to English', async () => {
      const movieData = createMockMovie();
      delete movieData.language;
      const movie = new Movie(movieData);
      const savedMovie = await movie.save();
      
      expect(savedMovie.language).toBe('English');
    });

    it('should default views to 0', async () => {
      const movieData = createMockMovie();
      const movie = new Movie(movieData);
      const savedMovie = await movie.save();
      
      expect(savedMovie.views).toBe(0);
    });

    it('should default isFeatured to false', async () => {
      const movieData = createMockMovie();
      const movie = new Movie(movieData);
      const savedMovie = await movie.save();
      
      expect(savedMovie.isFeatured).toBe(false);
    });
  });

  describe('Video URLs', () => {
    it('should store multiple video quality URLs', async () => {
      const movieData = createMockMovie({
        videoUrls: {
          '720p': 'video/movie-720p.mp4',
          '1080p': 'video/movie-1080p.mp4'
        }
      });
      const movie = new Movie(movieData);
      const savedMovie = await movie.save();
      
      expect(savedMovie.videoUrls['720p']).toBe('video/movie-720p.mp4');
      expect(savedMovie.videoUrls['1080p']).toBe('video/movie-1080p.mp4');
    });

    it('should handle subtitle URLs', async () => {
      const movieData = createMockMovie({
        subtitleUrls: {
          en: 'subtitles/movie-en.vtt',
          es: 'subtitles/movie-es.vtt'
        }
      });
      const movie = new Movie(movieData);
      const savedMovie = await movie.save();
      
      expect(savedMovie.subtitleUrls.en).toBe('subtitles/movie-en.vtt');
      expect(savedMovie.subtitleUrls.es).toBe('subtitles/movie-es.vtt');
    });
  });

  describe('Timestamps', () => {
    it('should automatically set createdAt and updatedAt', async () => {
      const movieData = createMockMovie();
      const movie = new Movie(movieData);
      const savedMovie = await movie.save();
      
      expect(savedMovie.createdAt).toBeDefined();
      expect(savedMovie.updatedAt).toBeDefined();
      expect(savedMovie.createdAt).toBeInstanceOf(Date);
      expect(savedMovie.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const movieData = createMockMovie();
      const movie = new Movie(movieData);
      const savedMovie = await movie.save();
      
      const originalUpdatedAt = savedMovie.updatedAt;
      
      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      savedMovie.title = 'Updated Title';
      const updatedMovie = await savedMovie.save();
      
      expect(updatedMovie.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create test movies
      await Movie.create([
        createMockMovie({ title: 'Movie 1', genre: ['Action'], rating: 8.0 }),
        createMockMovie({ title: 'Movie 2', genre: ['Comedy'], rating: 7.5 }),
        createMockMovie({ title: 'Movie 3', genre: ['Action'], rating: 9.0 }),
      ]);
    });

    it('should find all movies', async () => {
      const movies = await Movie.find({});
      expect(movies).toHaveLength(3);
    });

    it('should find movies by genre', async () => {
      const actionMovies = await Movie.find({ genre: 'Action' });
      expect(actionMovies).toHaveLength(2);
    });

    it('should find movie by title', async () => {
      const movie = await Movie.findOne({ title: 'Movie 1' });
      expect(movie).toBeDefined();
      expect(movie.title).toBe('Movie 1');
    });

    it('should update movie rating', async () => {
      const movie = await Movie.findOne({ title: 'Movie 1' });
      movie.rating = 9.5;
      const updated = await movie.save();
      
      expect(updated.rating).toBe(9.5);
    });

    it('should delete a movie', async () => {
      const movie = await Movie.findOne({ title: 'Movie 1' });
      await Movie.findByIdAndDelete(movie._id);
      
      const deletedMovie = await Movie.findById(movie._id);
      expect(deletedMovie).toBeNull();
    });
  });
});

