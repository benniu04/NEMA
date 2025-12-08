import express from 'express';
import { upload } from '../config/s3.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import logger from '../config/logger.js';

const uploadRoutes = express.Router();

// Upload video file
uploadRoutes.post('/video', 
  [authMiddleware, adminMiddleware],
  upload.single('video'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const quality = req.body.quality || '720p';
      
      logger.info('Video uploaded successfully', { key: req.file.key, quality });
      res.status(200).json({
        message: 'File uploaded successfully',
        key: req.file.key,
        quality: quality
      });
    } catch (error) {
      logger.error('Error uploading video:', { error: error.message, stack: error.stack });
      res.status(500).json({ message: 'Error uploading file' });
    }
  }
);

// Upload image file
uploadRoutes.post('/image', 
  [authMiddleware, adminMiddleware],
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const imageType = req.body.type || 'poster';
      
      logger.info('Image uploaded successfully', { key: req.file.key, type: imageType });
      res.status(200).json({
        message: 'Image uploaded successfully',
        key: req.file.key,
        type: imageType
      });
    } catch (error) {
      logger.error('Error uploading image:', { error: error.message, stack: error.stack });
      res.status(500).json({ message: 'Error uploading image' });
    }
  }
);

// Upload user avatar (any authenticated user)
uploadRoutes.post('/avatar', 
  authMiddleware,
  upload.single('avatar'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      logger.info('Avatar uploaded successfully', { 
        userId: req.user.id, 
        key: req.file.key 
      });
      
      res.status(200).json({
        message: 'Avatar uploaded successfully',
        key: req.file.key,
        url: req.file.location
      });
    } catch (error) {
      logger.error('Error uploading avatar:', { 
        error: error.message, 
        stack: error.stack 
      });
      res.status(500).json({ message: 'Error uploading avatar' });
    }
  }
);

// Upload user banner (any authenticated user)
uploadRoutes.post('/banner', 
  authMiddleware,
  upload.single('banner'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      logger.info('Banner uploaded successfully', { 
        userId: req.user.id, 
        key: req.file.key 
      });
      
      res.status(200).json({
        message: 'Banner uploaded successfully',
        key: req.file.key,
        url: req.file.location
      });
    } catch (error) {
      logger.error('Error uploading banner:', { 
        error: error.message, 
        stack: error.stack 
      });
      res.status(500).json({ message: 'Error uploading banner' });
    }
  }
);

export default uploadRoutes;
