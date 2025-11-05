import { describe, it, expect, beforeEach } from '@jest/globals';
import { Comment } from '../../models/comment.model.js';
import { Movie } from '../../models/movie.model.js';
import { createMockMovie, createMockComment } from '../helpers.js';

describe('Comment Model', () => {
  let testMovie;

  beforeEach(async () => {
    // Create a test movie for comments
    testMovie = await Movie.create(createMockMovie());
  });

  describe('Schema Validation', () => {
    it('should create a valid comment', async () => {
      const commentData = createMockComment(testMovie._id.toString());
      const comment = new Comment(commentData);
      const savedComment = await comment.save();

      expect(savedComment._id).toBeDefined();
      expect(savedComment.movieId).toBe(commentData.movieId);
      expect(savedComment.deviceId).toBe(commentData.deviceId);
      expect(savedComment.nickname).toBe(commentData.nickname);
      expect(savedComment.content).toBe(commentData.content);
      expect(savedComment.createdAt).toBeDefined();
    });

    it('should fail when movieId is missing', async () => {
      const comment = new Comment({
        deviceId: 'test-device',
        content: 'Test comment'
      });
      
      await expect(comment.save()).rejects.toThrow();
    });

    it('should fail when deviceId is missing', async () => {
      const comment = new Comment({
        movieId: testMovie._id.toString(),
        content: 'Test comment'
      });
      
      await expect(comment.save()).rejects.toThrow();
    });

    it('should fail when content is missing', async () => {
      const comment = new Comment({
        movieId: testMovie._id.toString(),
        deviceId: 'test-device'
      });
      
      await expect(comment.save()).rejects.toThrow();
    });

    it('should default nickname to Anonymous', async () => {
      const comment = new Comment({
        movieId: testMovie._id.toString(),
        deviceId: 'test-device',
        content: 'Test comment'
      });
      const savedComment = await comment.save();
      
      expect(savedComment.nickname).toBe('Anonymous');
    });

    it('should accept custom nickname', async () => {
      const commentData = createMockComment(testMovie._id.toString(), {
        nickname: 'Custom User'
      });
      const comment = new Comment(commentData);
      const savedComment = await comment.save();
      
      expect(savedComment.nickname).toBe('Custom User');
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create test comments
      await Comment.create([
        createMockComment(testMovie._id.toString(), { 
          nickname: 'User 1',
          content: 'First comment' 
        }),
        createMockComment(testMovie._id.toString(), { 
          nickname: 'User 2',
          content: 'Second comment' 
        }),
        createMockComment(testMovie._id.toString(), { 
          nickname: 'User 3',
          content: 'Third comment' 
        }),
      ]);
    });

    it('should find all comments for a movie', async () => {
      const comments = await Comment.find({ movieId: testMovie._id.toString() });
      expect(comments).toHaveLength(3);
    });

    it('should sort comments by createdAt descending', async () => {
      const comments = await Comment.find({ movieId: testMovie._id.toString() })
        .sort({ createdAt: -1 });
      
      expect(comments).toHaveLength(3);
      // Verify sorting is working (most recent first)
      expect(new Date(comments[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(comments[1].createdAt).getTime()
      );
      expect(new Date(comments[1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(comments[2].createdAt).getTime()
      );
    });

    it('should find comment by deviceId', async () => {
      const comment = await Comment.findOne({ 
        movieId: testMovie._id.toString(),
        deviceId: 'test-device-id'
      });
      
      expect(comment).toBeDefined();
    });

    it('should delete a comment', async () => {
      const comment = await Comment.findOne({ nickname: 'User 1' });
      await Comment.findByIdAndDelete(comment._id);
      
      const deletedComment = await Comment.findById(comment._id);
      expect(deletedComment).toBeNull();
      
      const remainingComments = await Comment.find({ movieId: testMovie._id.toString() });
      expect(remainingComments).toHaveLength(2);
    });
  });

  describe('Timestamps', () => {
    it('should automatically set createdAt', async () => {
      const commentData = createMockComment(testMovie._id.toString());
      const comment = new Comment(commentData);
      const savedComment = await comment.save();
      
      expect(savedComment.createdAt).toBeDefined();
      expect(savedComment.createdAt).toBeInstanceOf(Date);
    });

    it('should maintain chronological order', async () => {
      const comment1 = await Comment.create(
        createMockComment(testMovie._id.toString(), { content: 'First' })
      );
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const comment2 = await Comment.create(
        createMockComment(testMovie._id.toString(), { content: 'Second' })
      );
      
      expect(comment2.createdAt.getTime()).toBeGreaterThan(comment1.createdAt.getTime());
    });
  });
});

