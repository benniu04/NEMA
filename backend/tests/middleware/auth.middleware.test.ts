import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware, adminMiddleware } from '../../src/middleware/auth.middleware';
import { ENV_VARS } from '../../src/config/envVars';
import { generateAdminToken } from '../helpers';

interface MockUser {
  id: string;
  username: string;
  isAdmin?: boolean;
}

interface MockRequest {
  cookies: Record<string, string>;
  user: MockUser | null;
}

interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}

describe('Auth Middleware', () => {
  let req: MockRequest;
  let res: MockResponse;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      cookies: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis() as jest.Mock,
      json: jest.fn().mockReturnThis() as jest.Mock
    };
    next = jest.fn() as jest.Mock;
  });

  describe('authMiddleware', () => {
    it('should pass with valid token', async () => {
      const token = generateAdminToken();
      req.cookies.adminToken = token;

      await authMiddleware(req as unknown as Request, res as unknown as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user?.username).toBe(ENV_VARS.ADMIN_USERNAME);
      expect(req.user?.isAdmin).toBe(true);
    });

    it('should fail when no token provided', async () => {
      await authMiddleware(req as unknown as Request, res as unknown as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "No token provided" });
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail with invalid token', async () => {
      req.cookies.adminToken = 'invalid-token';

      await authMiddleware(req as unknown as Request, res as unknown as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail with expired token', async () => {
      const expiredToken = jwt.sign(
        {
          id: 'admin',
          username: ENV_VARS.ADMIN_USERNAME,
          isAdmin: true
        },
        ENV_VARS.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );
      req.cookies.adminToken = expiredToken;

      await authMiddleware(req as unknown as Request, res as unknown as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail with token signed with wrong secret', async () => {
      const wrongToken = jwt.sign(
        {
          id: 'admin',
          username: ENV_VARS.ADMIN_USERNAME,
          isAdmin: true
        },
        'wrong-secret',
        { expiresIn: '2h' }
      );
      req.cookies.adminToken = wrongToken;

      await authMiddleware(req as unknown as Request, res as unknown as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
      expect(next).not.toHaveBeenCalled();
    });

    it('should decode token payload correctly', async () => {
      const token = generateAdminToken();
      req.cookies.adminToken = token;

      await authMiddleware(req as unknown as Request, res as unknown as Response, next as NextFunction);

      expect(req.user?.id).toBe('admin');
      expect(req.user?.username).toBe(ENV_VARS.ADMIN_USERNAME);
      expect(req.user?.isAdmin).toBe(true);
    });
  });

  describe('adminMiddleware', () => {
    it('should pass when user is admin', async () => {
      req.user = {
        id: 'admin',
        username: ENV_VARS.ADMIN_USERNAME,
        isAdmin: true
      };

      await adminMiddleware(req as unknown as Request, res as unknown as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail when user is not defined', async () => {
      await adminMiddleware(req as unknown as Request, res as unknown as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Unauthorized: Admin access required"
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail when user is not admin', async () => {
      req.user = {
        id: 'user',
        username: 'regular-user',
        isAdmin: false
      };

      await adminMiddleware(req as unknown as Request, res as unknown as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Unauthorized: Admin access required"
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail when user has no isAdmin property', async () => {
      req.user = {
        id: 'user',
        username: 'regular-user'
      };

      await adminMiddleware(req as unknown as Request, res as unknown as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Combined auth and admin middleware', () => {
    it('should pass both middlewares with valid admin token', async () => {
      const token = generateAdminToken();
      req.cookies.adminToken = token;

      // First auth middleware
      await authMiddleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      expect(next).toHaveBeenCalledTimes(1);

      // Then admin middleware
      await adminMiddleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should fail at auth middleware without token', async () => {
      await authMiddleware(req as unknown as Request, res as unknown as Response, next as NextFunction);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
