import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { ENV_VARS } from '../config/envVars.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateAuth } from '../middleware/validation.middleware.js';

const authRoutes = express.Router();

// Security logging function
const securityLogger = (event, details, req) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    ...details
  };
  console.log(`[SECURITY] ${event}:`, JSON.stringify(logEntry));
};

// Login admin with password hashing and validation
authRoutes.post('/login', validateAuth, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Log login attempt
    securityLogger('LOGIN_ATTEMPT', { username }, req);

    // Check username
    if (username !== ENV_VARS.ADMIN_USERNAME) {
      securityLogger('LOGIN_FAILED', { username, reason: 'invalid_username' }, req);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, ENV_VARS.ADMIN_PASSWORD_HASH);
    
    if (!isPasswordValid) {
      securityLogger('LOGIN_FAILED', { username, reason: 'invalid_password' }, req);
      return res.status(401).json({ message: "Invalid credentials" });
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
      secure: true,
      sameSite: 'none',
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
    securityLogger('LOGIN_ERROR', { error: error.message }, req);
    console.error('Login error:', error);
    res.status(400).json({ message: "Login failed" });
  }
});

// Get current user
authRoutes.get('/me', authMiddleware, async (req, res) => {
  try {
    if (req.user.username === ENV_VARS.ADMIN_USERNAME) {
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
    console.error('Get user error:', error);
    res.status(500).json({ message: "Failed to get user" });
  }
});

// Logout admin
authRoutes.post('/logout', async (req, res) => {
  try {
    securityLogger('LOGOUT', { username: req.user?.username }, req);
    
    res.clearCookie('adminToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

export default authRoutes; 