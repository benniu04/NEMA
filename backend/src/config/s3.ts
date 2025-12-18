import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import multer, { FileFilterCallback } from 'multer';
import multerS3 from 'multer-s3';
import { ENV_VARS } from './envVars.js';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSignedUrl as getCloudfrontSignedUrl } from '@aws-sdk/cloudfront-signer';
import logger from './logger.js';
import { Request } from 'express';

const s3Client = new S3Client({
  region: ENV_VARS.AWS_REGION,
  credentials: {
    accessKeyId: ENV_VARS.AWS_ACCESS_KEY_ID,
    secretAccessKey: ENV_VARS.AWS_SECRET_ACCESS_KEY
  }
});

export const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: ENV_VARS.AWS_BUCKET_NAME,
    metadata: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, metadata?: Record<string, string>) => void) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, key?: string) => void) => {
      const timestamp = Date.now();
      
      let ext = '.bin';
      if (file.mimetype === 'video/mp4') ext = '.mp4';
      else if (file.mimetype === 'video/quicktime') ext = '.mov';
      else if (file.mimetype === 'video/x-msvideo') ext = '.avi';
      else if (file.mimetype === 'image/jpeg') ext = '.jpg';
      else if (file.mimetype === 'image/png') ext = '.png';
      else if (file.mimetype === 'image/webp') ext = '.webp';
      
      const key = `${file.fieldname}/${timestamp}${ext}`;
      
      cb(null, key);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE
  }),
  limits: {
    fileSize: 3 * 1024 * 1024 * 1024, 
    files: 1
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Allowed MIME types for security
    const allowedMimeTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    // Allowed extensions
    const allowedExtensions = ['.mp4', '.mov', '.avi', '.webm', '.jpg', '.jpeg', '.png', '.webp', '.gif'];

    // Get file extension
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();

    // Validate MIME type and extension
    if (!allowedMimeTypes.includes(file.mimetype)) {
      logger.warn('File upload rejected: invalid MIME type', {
        mimetype: file.mimetype,
        filename: file.originalname
      });
      return cb(new Error('Invalid file type. Only video and image files are allowed.'));
    }

    if (!allowedExtensions.includes(ext)) {
      logger.warn('File upload rejected: invalid extension', {
        extension: ext,
        filename: file.originalname
      });
      return cb(new Error('Invalid file extension.'));
    }

    logger.debug('File filter check passed', { mimetype: file.mimetype, filename: file.originalname });
    cb(null, true);
  }
});

export const generateCloudfrontSignedUrl = async (key: string): Promise<string> => {
  const cloudFrontDomain = ENV_VARS.CLOUDFRONT_DOMAIN;

  if (!cloudFrontDomain) {
    logger.warn('CLOUDFRONT_DOMAIN is not set, using S3 signed URL instead', { key });
    return generatePresignedUrl(key);
  }

  const url = `https://${cloudFrontDomain}/${key}`;

  if (ENV_VARS.CLOUDFRONT_KEY_PAIR_ID && ENV_VARS.CLOUDFRONT_PRIVATE_KEY) {
    const privateKey = ENV_VARS.CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, '\n');
    const dateLessThan = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    return getCloudfrontSignedUrl({
      url,
      keyPairId: ENV_VARS.CLOUDFRONT_KEY_PAIR_ID,
      privateKey,
      dateLessThan: dateLessThan.toISOString(),
    });
  }
  
  return url;
};

export const generatePresignedUrl = async (key: string): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: ENV_VARS.AWS_BUCKET_NAME,
      Key: key
    });
    
    return await getS3SignedUrl(s3Client, command, { expiresIn: 86400 });
  } catch (error) {
    const err = error as Error;
    logger.error('Error generating presigned URL', { error: err.message, key, stack: err.stack });
    throw error;
  }
};

/**
 * Delete an object from S3 bucket
 * @param key - The S3 object key to delete
 */
export const deleteS3Object = async (key: string): Promise<void> => {
  if (!key || key.trim() === '') {
    logger.debug('Skipping S3 deletion for empty key');
    return;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: ENV_VARS.AWS_BUCKET_NAME,
      Key: key
    });
    
    await s3Client.send(command);
    logger.info('Successfully deleted S3 object', { key });
  } catch (error) {
    const err = error as Error;
    logger.error('Error deleting S3 object', { error: err.message, key, stack: err.stack });
    throw error;
  }
};

