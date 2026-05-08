import express, { Response } from 'express';
import { upload, videoOriginalsUpload } from '../config/s3.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import logger from '../config/logger.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { getTranscodeQueue } from '../config/queue.js';
import { generateImageVariants } from '../utils/imageVariants.js';

interface MulterRequest extends AuthenticatedRequest {
  file?: Express.Multer.File & { key?: string; location?: string };
}

const uploadRoutes = express.Router();

// Upload a video: stream the original to S3, then enqueue HLS transcoding.
// Returns 202 immediately with a jobId; client polls /video/:jobId for progress.
uploadRoutes.post('/video',
  [authMiddleware, adminMiddleware],
  videoOriginalsUpload.single('video'),
  async (req: MulterRequest, res: Response): Promise<void> => {
    try {
      if (!req.file || !req.file.key) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }

      const queue = getTranscodeQueue();
      if (!queue) {
        res.status(503).json({ message: 'Transcode queue unavailable (REDIS_URL not configured)' });
        return;
      }

      const movieId = (req.body as { movieId?: string }).movieId;
      const userId = req.user?.id;

      const job = await queue.add('hls', {
        originalKey: req.file.key,
        movieId,
        userId,
      });

      logger.info('Transcode job enqueued', {
        jobId: job.id,
        originalKey: req.file.key,
        size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      });

      res.status(202).json({
        message: 'Video uploaded; transcoding in progress',
        jobId: job.id,
        originalKey: req.file.key,
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Error enqueuing transcode job', { error: err.message, stack: err.stack });
      res.status(500).json({ message: 'Error queuing video for processing', error: err.message });
    }
  }
);

// Poll the status of a transcode job.
uploadRoutes.get('/video/:jobId',
  [authMiddleware, adminMiddleware],
  async (req: MulterRequest, res: Response): Promise<void> => {
    try {
      const queue = getTranscodeQueue();
      if (!queue) {
        res.status(503).json({ message: 'Transcode queue unavailable' });
        return;
      }
      const job = await queue.getJob(req.params.jobId);
      if (!job) {
        res.status(404).json({ message: 'Job not found' });
        return;
      }
      const state = await job.getState();
      res.status(200).json({
        jobId: job.id,
        status: state,
        progress: job.progress,
        hlsKey: job.returnvalue?.hlsKey ?? null,
        failedReason: job.failedReason ?? null,
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Error fetching transcode job status', { error: err.message });
      res.status(500).json({ message: 'Error fetching job status' });
    }
  }
);

// Upload image file
uploadRoutes.post('/image',
  [authMiddleware, adminMiddleware],
  upload.single('image'),
  async (req: MulterRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }

      const imageType = (req.body as { type?: string }).type || 'poster';
      const key = req.file.key;
      if (!key) {
        res.status(500).json({ message: 'Upload succeeded but no key returned' });
        return;
      }
      const hasVariants = await generateImageVariants(key);

      logger.info('Image uploaded successfully', { key, type: imageType, hasVariants });
      res.status(200).json({
        message: 'Image uploaded successfully',
        key,
        type: imageType,
        hasVariants
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Error uploading image:', { error: err.message, stack: err.stack });
      res.status(500).json({ message: 'Error uploading image' });
    }
  }
);

// Upload subtitle file (VTT format)
uploadRoutes.post('/subtitle',
  [authMiddleware, adminMiddleware],
  upload.single('subtitle'),
  async (req: MulterRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }

      const language = (req.body as { language?: string }).language || 'en';

      // Validate file extension
      const validExtensions = ['.vtt', '.srt'];
      const fileExtension = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.'));
      if (!validExtensions.includes(fileExtension)) {
        res.status(400).json({ message: 'Invalid subtitle format. Please upload VTT or SRT files.' });
        return;
      }

      logger.info('Subtitle uploaded successfully', {
        key: req.file.key,
        language,
        originalName: req.file.originalname
      });

      res.status(200).json({
        message: 'Subtitle uploaded successfully',
        key: req.file.key,
        language: language
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Error uploading subtitle:', { error: err.message, stack: err.stack });
      res.status(500).json({ message: 'Error uploading subtitle' });
    }
  }
);

// Upload user avatar (any authenticated user)
uploadRoutes.post('/avatar', 
  authMiddleware,
  upload.single('avatar'),
  async (req: MulterRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }
      
      logger.info('Avatar uploaded successfully', { 
        userId: req.user?.id, 
        key: req.file.key 
      });
      
      res.status(200).json({
        message: 'Avatar uploaded successfully',
        key: req.file.key,
        url: req.file.location
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Error uploading avatar:', { 
        error: err.message, 
        stack: err.stack 
      });
      res.status(500).json({ message: 'Error uploading avatar' });
    }
  }
);

// Upload user banner (any authenticated user)
uploadRoutes.post('/banner', 
  authMiddleware,
  upload.single('banner'),
  async (req: MulterRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }
      
      logger.info('Banner uploaded successfully', { 
        userId: req.user?.id, 
        key: req.file.key 
      });
      
      res.status(200).json({
        message: 'Banner uploaded successfully',
        key: req.file.key,
        url: req.file.location
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Error uploading banner:', { 
        error: err.message, 
        stack: err.stack 
      });
      res.status(500).json({ message: 'Error uploading banner' });
    }
  }
);

export default uploadRoutes;

