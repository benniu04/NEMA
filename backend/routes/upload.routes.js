import express from 'express';
import { upload } from '../config/s3.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';

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
      
      const quality = req.body.quality || '720p'; // Default to 720p if not specified
      
      res.status(200).json({
        message: 'File uploaded successfully',
        fileUrl: req.file.location,
        key: req.file.key,
        quality: quality
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Error uploading file', error: error.message });
    }
  }
);

// Upload thumbnail/poster
uploadRoutes.post('/image',
  [authMiddleware, adminMiddleware],
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      res.status(200).json({
        message: 'Image uploaded successfully',
        fileUrl: req.file.location,
        key: req.file.key
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ message: 'Error uploading image', error: error.message });
    }
  }
);

export default uploadRoutes;
