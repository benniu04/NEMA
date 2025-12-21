import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { validateMovie, validateAuth } from '../../src/middleware/validation.middleware';

interface MockRequest {
  body: Record<string, unknown>;
}

interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}

describe('Validation Middleware', () => {
  let req: MockRequest;
  let res: MockResponse;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis() as jest.Mock,
      json: jest.fn().mockReturnThis() as jest.Mock
    };
    next = jest.fn() as jest.Mock;
  });

  describe('validateMovie', () => {
    const validMovieData = {
      title: 'Test Movie',
      description: 'A great test movie',
      director: 'Test Director',
      rating: 8.5,
      genre: ['Action', 'Sci-Fi']
    };

    it('should pass with valid movie data', async () => {
      req.body = validMovieData;

      for (const middleware of validateMovie) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail when title is missing', async () => {
      req.body = { ...validMovieData, title: '' };

      for (const middleware of validateMovie) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation failed'
        })
      );
    });

    it('should fail when title exceeds max length', async () => {
      req.body = { ...validMovieData, title: 'a'.repeat(201) };

      for (const middleware of validateMovie) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should trim whitespace from title', async () => {
      req.body = { ...validMovieData, title: '  Test Movie  ' };

      for (const middleware of validateMovie) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(req.body.title).toBe('Test Movie');
    });

    it('should fail when description exceeds max length', async () => {
      req.body = { ...validMovieData, description: 'a'.repeat(1001) };

      for (const middleware of validateMovie) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when director is missing', async () => {
      req.body = { ...validMovieData, director: '' };

      for (const middleware of validateMovie) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when rating is below 0', async () => {
      req.body = { ...validMovieData, rating: -1 };

      for (const middleware of validateMovie) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when rating is above 10', async () => {
      req.body = { ...validMovieData, rating: 11 };

      for (const middleware of validateMovie) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should accept rating at boundaries', async () => {
      req.body = { ...validMovieData, rating: 0 };

      for (const middleware of validateMovie) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(next).toHaveBeenCalled();

      // Reset
      next.mockClear();
      req.body = { ...validMovieData, rating: 10 };

      for (const middleware of validateMovie) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(next).toHaveBeenCalled();
    });

    it('should fail when genre is not an array', async () => {
      req.body = { ...validMovieData, genre: 'Action' };

      for (const middleware of validateMovie) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should escape HTML in inputs', async () => {
      req.body = {
        ...validMovieData,
        title: '<script>alert("xss")</script>'
      };

      for (const middleware of validateMovie) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(req.body.title).not.toContain('<script>');
    });
  });

  describe('validateAuth', () => {
    const validAuthData = {
      username: 'testuser',
      password: 'TestPass123'
    };

    it('should pass with valid auth data', async () => {
      req.body = validAuthData;

      for (const middleware of validateAuth) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail when username is too short', async () => {
      req.body = { ...validAuthData, username: 'ab' };

      for (const middleware of validateAuth) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid input'
        })
      );
    });

    it('should fail when username exceeds max length', async () => {
      req.body = { ...validAuthData, username: 'a'.repeat(51) };

      for (const middleware of validateAuth) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when password is too short', async () => {
      req.body = { ...validAuthData, password: 'Test123' };

      for (const middleware of validateAuth) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when password lacks uppercase', async () => {
      req.body = { ...validAuthData, password: 'testpass123' };

      for (const middleware of validateAuth) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when password lacks lowercase', async () => {
      req.body = { ...validAuthData, password: 'TESTPASS123' };

      for (const middleware of validateAuth) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when password lacks number', async () => {
      req.body = { ...validAuthData, password: 'TestPassword' };

      for (const middleware of validateAuth) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should trim and escape username', async () => {
      req.body = {
        ...validAuthData,
        username: '  testuser  '
      };

      for (const middleware of validateAuth) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(req.body.username).toBe('testuser');
    });

    it('should fail with missing fields', async () => {
      req.body = {};

      for (const middleware of validateAuth) {
        await middleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
