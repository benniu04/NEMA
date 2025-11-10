import jwt from 'jsonwebtoken';
import { ENV_VARS } from '../config/envVars.js';
import logger from '../config/logger.js';

export const authMiddleware = async (req, res, next) => {
  try {
    // Get token from cookies instead of Authorization header
    const token = req.cookies.adminToken;
    
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, ENV_VARS.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Auth middleware error', { error: error.message, path: req.path });
    res.status(401).json({ message: "Invalid token" });
  }
};

export const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      logger.warn('Unauthorized admin access attempt', { user: req.user?.username, path: req.path });
      return res.status(403).json({ message: "Unauthorized: Admin access required" });
    }
    next();
  } catch (error) {
    logger.error('Admin middleware error', { error: error.message, path: req.path });
    res.status(403).json({ message: "Admin access required" });
  }
}; 