import { describe, it, expect, beforeEach } from '@jest/globals';
import { Review } from '../../models/review.model.js';
import { Movie } from '../../models/movie.model.js';
import { createMockMovie, createMockReview } from '../helpers.js';

describe('Review Model', () => {
  let testMovie;

  beforeEach(async () => {
    // Create a test movie for reviews
    testMovie = await Movie.create(createMockMovie());
  });

  describe('Schema Validation', () => {
    it('should create a valid review', async () => {
      const reviewData = createMockReview(testMovie._id);
      const review = new Review(reviewData);
      const savedReview = await review.save();

      expect(savedReview._id).toBeDefined();
      expect(savedReview.movieId.toString()).toBe(testMovie._id.toString());
      expect(savedReview.deviceId).toBe(reviewData.deviceId);
      expect(savedReview.nickname).toBe(reviewData.nickname);
      expect(savedReview.rating).toBe(reviewData.rating);
      expect(savedReview.comment).toBe(reviewData.comment);
      expect(savedReview.createdAt).toBeDefined();
      expect(savedReview.updatedAt).toBeDefined();
    });

    it('should fail when movieId is missing', async () => {
      const review = new Review({
        deviceId: 'test-device',
        rating: 5
      });
      
      await expect(review.save()).rejects.toThrow();
    });

    it('should fail when deviceId is missing', async () => {
      const review = new Review({
        movieId: testMovie._id,
        rating: 5
      });
      
      await expect(review.save()).rejects.toThrow();
    });

    it('should fail when rating is missing', async () => {
      const review = new Review({
        movieId: testMovie._id,
        deviceId: 'test-device'
      });
      
      await expect(review.save()).rejects.toThrow();
    });

    it('should fail when rating is below 1', async () => {
      const reviewData = createMockReview(testMovie._id, { rating: 0 });
      const review = new Review(reviewData);
      
      await expect(review.save()).rejects.toThrow();
    });

    it('should fail when rating is above 10', async () => {
      const reviewData = createMockReview(testMovie._id, { rating: 11 });
      const review = new Review(reviewData);
      
      await expect(review.save()).rejects.toThrow();
    });

    it('should default nickname to Anonymous', async () => {
      const review = new Review({
        movieId: testMovie._id,
        deviceId: 'test-device',
        rating: 5
      });
      const savedReview = await review.save();
      
      expect(savedReview.nickname).toBe('Anonymous');
    });

    it('should default comment to empty string', async () => {
      const review = new Review({
        movieId: testMovie._id,
        deviceId: 'test-device',
        rating: 5
      });
      const savedReview = await review.save();
      
      expect(savedReview.comment).toBe('');
    });

    it('should accept valid ratings from 1 to 10', async () => {
      for (let rating = 1; rating <= 10; rating++) {
        const reviewData = createMockReview(testMovie._id, { 
          rating,
          deviceId: `test-device-${rating}` // Unique device ID
        });
        const review = new Review(reviewData);
        const savedReview = await review.save();
        
        expect(savedReview.rating).toBe(rating);
      }
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create test reviews
      await Review.create([
        createMockReview(testMovie._id, { 
          deviceId: 'device-1',
          rating: 8,
          comment: 'Great movie!'
        }),
        createMockReview(testMovie._id, { 
          deviceId: 'device-2',
          rating: 6,
          comment: 'Good movie'
        }),
        createMockReview(testMovie._id, { 
          deviceId: 'device-3',
          rating: 10,
          comment: 'Excellent!'
        }),
      ]);
    });

    it('should find all reviews for a movie', async () => {
      const reviews = await Review.find({ movieId: testMovie._id });
      expect(reviews).toHaveLength(3);
    });

    it('should calculate average rating', async () => {
      const reviews = await Review.find({ movieId: testMovie._id });
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      
      expect(avgRating).toBe(8); // (8 + 6 + 10) / 3 = 8
    });

    it('should find reviews by rating', async () => {
      const highRatedReviews = await Review.find({ 
        movieId: testMovie._id,
        rating: { $gte: 8 }
      });
      
      expect(highRatedReviews).toHaveLength(2);
    });

    it('should update a review', async () => {
      const review = await Review.findOne({ deviceId: 'device-1' });
      review.rating = 9;
      review.comment = 'Updated review';
      const updatedReview = await review.save();
      
      expect(updatedReview.rating).toBe(9);
      expect(updatedReview.comment).toBe('Updated review');
    });

    it('should delete a review', async () => {
      const review = await Review.findOne({ deviceId: 'device-1' });
      await Review.findByIdAndDelete(review._id);
      
      const deletedReview = await Review.findById(review._id);
      expect(deletedReview).toBeNull();
      
      const remainingReviews = await Review.find({ movieId: testMovie._id });
      expect(remainingReviews).toHaveLength(2);
    });
  });

  describe('Population', () => {
    it('should populate movie details', async () => {
      const reviewData = createMockReview(testMovie._id, { rating: 9 });
      await Review.create(reviewData);
      
      const review = await Review.findOne({ movieId: testMovie._id })
        .populate('movieId');
      
      expect(review.movieId).toBeDefined();
      expect(review.movieId.title).toBe(testMovie.title);
      expect(review.movieId.description).toBe(testMovie.description);
    });
  });
});

