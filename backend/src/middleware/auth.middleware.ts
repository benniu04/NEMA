import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV_VARS } from '../config/envVars.js';
import logger from '../config/logger.js';
import type { AuthenticatedRequest, JWTPayload } from '../types/index.js';

/**
 * Auth middleware that checks for user token (userToken) or admin token (adminToken)
 * Supports both cookies and Authorization header (for mobile browsers)
 * Requires authentication - returns 401 if no valid token
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for token in cookies first, then Authorization header, then admin cookie
    let token = req.cookies?.userToken || req.cookies?.adminToken;
    
    // If no cookie, check Authorization header (for mobile browsers)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      res.status(401).json({ message: "No token provided" });
      return;
    }

    const decoded = jwt.verify(token, ENV_VARS.JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    const err = error as Error;
    logger.warn('Auth middleware error', { error: err.message, path: req.path });
    res.status(401).json({ message: "Invalid token" });
  }
};

/**
 * Optional auth middleware - attaches user to request if token exists
 * Supports both cookies and Authorization header (for mobile browsers)
 * Does not require authentication - continues even without token
 */
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for token in cookies first, then Authorization header
    let token = req.cookies?.userToken || req.cookies?.adminToken;
    
    // If no cookie, check Authorization header (for mobile browsers)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (token) {
      const decoded = jwt.verify(token, ENV_VARS.JWT_SECRET) as JWTPayload;
      req.user = decoded;
    }
    next();
  } catch (error) {
    const err = error as Error;
    // Token invalid but that's okay for optional auth
    logger.debug('Optional auth - invalid token', { error: err.message, path: req.path });
    next();
  }
};

/**
 * Admin middleware - requires admin privileges
 * Must be used after authMiddleware
 */
export const adminMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.isAdmin) {
      logger.warn('Unauthorized admin access attempt', { user: req.user?.username, path: req.path });
      res.status(403).json({ message: "Unauthorized: Admin access required" });
      return;
    }
    next();
  } catch (error) {
    const err = error as Error;
    logger.error('Admin middleware error', { error: err.message, path: req.path });
    res.status(403).json({ message: "Admin access required" });
  }
};

