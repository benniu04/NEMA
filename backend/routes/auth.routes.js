import express from 'express';
import jwt from 'jsonwebtoken';
import { ENV_VARS } from '../config/envVars.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const authRoutes = express.Router();

// Login admin
authRoutes.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check against hardcoded admin credentials
    if (username !== ENV_VARS.ADMIN_USERNAME || password !== ENV_VARS.ADMIN_PASSWORD) {
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

    res.json({
      user: {
        id: 'admin',
        username: ENV_VARS.ADMIN_USERNAME,
        name: 'Admin',
        isAdmin: true
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ message: "Login failed", error: error.message });
  }
});

// Get current user
authRoutes.get('/me', authMiddleware, async (req, res) => {
  try {
    // Since we only have one admin user, we can return a static response
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
    res.status(500).json({ message: "Failed to get user", error: error.message });
  }
});

// Logout admin
authRoutes.post('/logout', async (req, res) => {
  try {
    // Clear the httpOnly cookie
    res.clearCookie('adminToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed', error: error.message });
  }
});

export default authRoutes; 