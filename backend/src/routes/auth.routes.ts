import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { ENV_VARS } from '../config/envVars.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateAuth } from '../middleware/validation.middleware.js';
import logger from '../config/logger.js';
import type { AuthenticatedRequest } from '../types/index.js';

const authRoutes = express.Router();

// Security logging function
const securityLogger = (event: string, details: Record<string, unknown>, req: Request): void => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip: req.ip || req.socket?.remoteAddress,
    userAgent: req.get('User-Agent'),
    ...details
  };
  logger.info(`[SECURITY] ${event}`, logEntry);
};

// Login admin with password hashing and validation
authRoutes.post('/login', validateAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // Log login attempt
    securityLogger('LOGIN_ATTEMPT', { username }, req);

    // Check username
    if (username !== ENV_VARS.ADMIN_USERNAME) {
      securityLogger('LOGIN_FAILED', { username, reason: 'invalid_username' }, req);
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Check password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, ENV_VARS.ADMIN_PASSWORD_HASH);
    
    if (!isPasswordValid) {
      securityLogger('LOGIN_FAILED', { username, reason: 'invalid_password' }, req);
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: 'admin',
        username: ENV_VARS.ADMIN_USERNAME,
        isAdmin: true 
      },
      ENV_VARS.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.cookie('adminToken', token, {
      httpOnly: true,   
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 2 * 60 * 60 * 1000
    });

    securityLogger('LOGIN_SUCCESS', { username }, req);

    res.json({
      user: {
        id: 'admin',
        username: ENV_VARS.ADMIN_USERNAME,
        name: 'Admin',
        isAdmin: true
      }
    });
  } catch (error) {
    const err = error as Error;
    securityLogger('LOGIN_ERROR', { error: err.message }, req);
    logger.error('Login error:', { error: err.message, stack: err.stack });
    res.status(400).json({ message: "Login failed" });
  }
});

// Get current user
authRoutes.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.username === ENV_VARS.ADMIN_USERNAME) {
      res.json({
        id: 'admin',
        username: ENV_VARS.ADMIN_USERNAME,
        name: 'Admin',
        isAdmin: true
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    const err = error as Error;
    logger.error('Get user error:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Failed to get user" });
  }
});

// Logout admin
authRoutes.post('/logout', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    securityLogger('LOGOUT', { username: req.user?.username }, req);
    
    res.clearCookie('adminToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    const err = error as Error;
    logger.error('Logout error:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Logout failed' });
  }
});

export default authRoutes;

