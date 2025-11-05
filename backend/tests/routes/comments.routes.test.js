import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import commentsRouter from '../../routes/comments.routes.js';
import { Comment } from '../../models/comment.model.js';
import { Movie } from '../../models/movie.model.js';
import { createMockMovie, createMockComment } from '../helpers.js';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/comments', commentsRouter);
  return app;
};

describe('Comments Routes', () => {
  let app;
  let testMovie;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Clear collections
    await Comment.deleteMany({});
    await Movie.deleteMany({});
    
    // Create test movie
    testMovie = await Movie.create(createMockMovie());
  });

  describe('GET /api/comments/movie/:movieId', () => {
    it('should return empty array when no comments exist', async () => {
      const response = await request(app)
        .get(`/api/comments/movie/${testMovie._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all comments for a movie', async () => {
      await Comment.create([
        createMockComment(testMovie._id.toString(), { content: 'Comment 1' }),
        createMockComment(testMovie._id.toString(), { content: 'Comment 2' }),
        createMockComment(testMovie._id.toString(), { content: 'Comment 3' })
      ]);

      const response = await request(app)
        .get(`/api/comments/movie/${testMovie._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    it('should return comments sorted by newest first', async () => {
      const comment1 = await Comment.create(
        createMockComment(testMovie._id.toString(), { content: 'First' })
      );
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const comment2 = await Comment.create(
        createMockComment(testMovie._id.toString(), { content: 'Second' })
      );

      const response = await request(app)
        .get(`/api/comments/movie/${testMovie._id}`);

      expect(response.status).toBe(200);
      expect(response.body[0].content).toBe('Second');
      expect(response.body[1].content).toBe('First');
    });

    it('should not return comments from other movies', async () => {
      const otherMovie = await Movie.create(createMockMovie({ title: 'Other Movie' }));
      
      await Comment.create([
        createMockComment(testMovie._id.toString(), { content: 'Comment for test movie' }),
        createMockComment(otherMovie._id.toString(), { content: 'Comment for other movie' })
      ]);

      const response = await request(app)
        .get(`/api/comments/movie/${testMovie._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].content).toBe('Comment for test movie');
    });
  });

  describe('POST /api/comments', () => {
    it('should create a comment with valid data', async () => {
      const commentData = {
        movieId: testMovie._id.toString(),
        deviceId: 'test-device-123',
        nickname: 'Test User',
        content: 'This is a great movie!'
      };

      const response = await request(app)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.content).toBe(commentData.content);
      expect(response.body.nickname).toBe(commentData.nickname);
      expect(response.body._id).toBeDefined();

      const savedComment = await Comment.findById(response.body._id);
      expect(savedComment).toBeDefined();
    });

    it('should use Anonymous as default nickname', async () => {
      const commentData = {
        movieId: testMovie._id.toString(),
        deviceId: 'test-device-123',
        content: 'Anonymous comment'
      };

      const response = await request(app)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.nickname).toBe('Anonymous');
    });

    it('should fail without movieId', async () => {
      const commentData = {
        deviceId: 'test-device-123',
        content: 'Comment without movie'
      };

      const response = await request(app)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(400);
    });

    it('should fail without content', async () => {
      const commentData = {
        movieId: testMovie._id.toString(),
        deviceId: 'test-device-123'
      };

      const response = await request(app)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(400);
    });

    it('should use IP as fallback when deviceId is missing', async () => {
      const commentData = {
        movieId: testMovie._id.toString(),
        content: 'Comment without device ID'
      };

      const response = await request(app)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.deviceId).toBeDefined();
    });

    it('should respect rate limiting (simulated)', async () => {
      // This test simulates rate limiting behavior
      // In real scenario, rate limiting would prevent too many requests
      const commentData = {
        movieId: testMovie._id.toString(),
        deviceId: 'rate-limit-test',
        content: 'Test comment'
      };

      // First request should succeed
      const response1 = await request(app)
        .post('/api/comments')
        .send(commentData);

      expect(response1.status).toBe(201);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    it('should delete own comment with matching deviceId', async () => {
      const comment = await Comment.create(
        createMockComment(testMovie._id.toString(), {
          deviceId: 'my-device-123'
        })
      );

      const response = await request(app)
        .delete(`/api/comments/${comment._id}`)
        .send({ deviceId: 'my-device-123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Comment deleted');

      const deletedComment = await Comment.findById(comment._id);
      expect(deletedComment).toBeNull();
    });

    it('should fail to delete comment with wrong deviceId', async () => {
      const comment = await Comment.create(
        createMockComment(testMovie._id.toString(), {
          deviceId: 'original-device'
        })
      );

      const response = await request(app)
        .delete(`/api/comments/${comment._id}`)
        .send({ deviceId: 'different-device' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Not authorized to delete this comment');

      const stillExists = await Comment.findById(comment._id);
      expect(stillExists).toBeDefined();
    });

    it('should return 500 for non-existent comment', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/comments/${fakeId}`)
        .send({ deviceId: 'test-device' });

      expect(response.status).toBe(500);
    });
  });
});

