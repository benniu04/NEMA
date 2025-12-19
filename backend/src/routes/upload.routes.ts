import express, { Response } from 'express';
import { upload, videoUpload, uploadFolderToS3, uploadFileToS3 } from '../config/s3.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import logger from '../config/logger.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { transcodeToHLS } from '../utils/hls-transcoder.js';
import path from 'path';
import fs from 'fs';

/**
 * Recursively upload a directory and all its subdirectories to S3
 */
const uploadFolderToS3Recursive = async (localDirPath: string, s3Prefix: string): Promise<string[]> => {
  const uploadedKeys: string[] = [];
  
  const uploadDir = async (dirPath: string, prefix: string) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const localPath = path.join(dirPath, entry.name);
      const s3Key = `${prefix}/${entry.name}`;
      
      if (entry.isDirectory()) {
        // Recursively upload subdirectory
        await uploadDir(localPath, s3Key.replace(`/${entry.name}`, `/${entry.name}`));
      } else {
        // Upload file
        await uploadFileToS3(localPath, s3Key);
        uploadedKeys.push(s3Key);
      }
    }
  };
  
  await uploadDir(localDirPath, s3Prefix);
  return uploadedKeys;
};

interface MulterRequest extends AuthenticatedRequest {
  file?: Express.Multer.File & { key?: string; location?: string };
}

const uploadRoutes = express.Router();

// Upload video file with adaptive bitrate HLS transcoding
uploadRoutes.post('/video', 
  [authMiddleware, adminMiddleware],
  videoUpload.single('video'),
  async (req: MulterRequest, res: Response): Promise<void> => {
    let tempHlsDir: string | null = null;
    try {
      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }
      
      const inputPath = req.file.path;
      const timestamp = Date.now();
      tempHlsDir = path.join(process.cwd(), 'temp-hls', `${timestamp}`);
      
      logger.info('Starting adaptive bitrate HLS transcoding', { 
        filename: req.file.filename,
        size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`
      });
      
      // 1. Transcode to HLS with adaptive bitrate (multiple quality variants)
      const { outputDir, variants } = await transcodeToHLS(inputPath, tempHlsDir);
      
      logger.info('Transcoding completed, uploading to S3', { 
        variants: variants.map(v => v.resolution) 
      });
      
      // 2. Upload HLS folder (including all variants) to S3
      const s3Prefix = `videos/hls/${timestamp}`;
      
      // Upload the entire directory structure (master playlist + all variant folders)
      const uploadedKeys = await uploadFolderToS3Recursive(outputDir, s3Prefix);
      
      const hlsMasterKey = `${s3Prefix}/master.m3u8`;
      
      logger.info('Video transcoded and uploaded successfully', { 
        hlsMasterKey,
        variants: variants.length,
        filesUploaded: uploadedKeys.length
      });
      
      // Cleanup local files
      fs.unlinkSync(inputPath);
      fs.rmSync(tempHlsDir, { recursive: true, force: true });
      
      res.status(200).json({
        message: 'Video transcoded with adaptive bitrate and uploaded successfully',
        hlsKey: hlsMasterKey,
        variants: variants.map(v => ({
          resolution: v.resolution,
          bandwidth: v.bandwidth
        })),
        filesUploaded: uploadedKeys.length
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Error in video upload/transcode process:', { error: err.message, stack: err.stack });
      
      // Cleanup on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      if (tempHlsDir && fs.existsSync(tempHlsDir)) {
        fs.rmSync(tempHlsDir, { recursive: true, force: true });
      }
      
      res.status(500).json({ 
        message: 'Error processing video file',
        error: err.message 
      });
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

      logger.info('Image uploaded successfully', { key: req.file.key, type: imageType });
      res.status(200).json({
        message: 'Image uploaded successfully',
        key: req.file.key,
        type: imageType
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

