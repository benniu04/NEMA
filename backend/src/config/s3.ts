import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import multer, { FileFilterCallback } from 'multer';
import multerS3 from 'multer-s3';
import { ENV_VARS } from './envVars.js';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSignedUrl as getCloudfrontSignedUrl } from '@aws-sdk/cloudfront-signer';
import logger from './logger.js';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';

const s3Client = new S3Client({
  region: ENV_VARS.AWS_REGION,
  credentials: {
    accessKeyId: ENV_VARS.AWS_ACCESS_KEY_ID,
    secretAccessKey: ENV_VARS.AWS_SECRET_ACCESS_KEY
  }
});

// Disk storage for videos (to allow transcoding)
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'temp-uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `video-${timestamp}${ext}`);
  }
});

export const videoUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 3 * 1024 * 1024 * 1024, // 3GB
    files: 1
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed for this endpoint.'));
    }
  }
});

/**
 * Upload a local file to S3
 */
export const uploadFileToS3 = async (localPath: string, s3Key: string): Promise<string> => {
  try {
    const fileContent = fs.readFileSync(localPath);
    // @ts-ignore - path.extname might return undefined but mime.lookup handles it
    const contentType = (path.extname(localPath) === '.m3u8') ? 'application/x-mpegURL' : 
                        (path.extname(localPath) === '.ts') ? 'video/MP2T' : 
                        'application/octet-stream';

    const command = new PutObjectCommand({
      Bucket: ENV_VARS.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
    });

    await s3Client.send(command);
    return s3Key;
  } catch (error) {
    logger.error('Error uploading file to S3:', { error, localPath, s3Key });
    throw error;
  }
};

/**
 * Upload a folder to S3
 */
export const uploadFolderToS3 = async (localDirPath: string, s3Prefix: string): Promise<string[]> => {
  const files = fs.readdirSync(localDirPath);
  const uploadPromises = files.map(file => {
    const localFilePath = path.join(localDirPath, file);
    const s3Key = `${s3Prefix}/${file}`;
    return uploadFileToS3(localFilePath, s3Key);
  });

  return Promise.all(uploadPromises);
};

/**
 * Recursively upload a directory (including subdirectories) to S3
 */
export const uploadFolderToS3Recursive = async (localDirPath: string, s3Prefix: string): Promise<string[]> => {
  const uploadedKeys: string[] = [];

  const uploadDir = async (dirPath: string, prefix: string): Promise<void> => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const localPath = path.join(dirPath, entry.name);
      const s3Key = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        await uploadDir(localPath, s3Key);
      } else {
        await uploadFileToS3(localPath, s3Key);
        uploadedKeys.push(s3Key);
      }
    }
  };

  await uploadDir(localDirPath, s3Prefix);
  return uploadedKeys;
};

/**
 * Download an S3 object to a local file path (streamed).
 */
export const downloadS3ObjectToFile = async (s3Key: string, localPath: string): Promise<void> => {
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const command = new GetObjectCommand({
    Bucket: ENV_VARS.AWS_BUCKET_NAME,
    Key: s3Key,
  });
  const response = await s3Client.send(command);
  const body = response.Body as NodeJS.ReadableStream | undefined;
  if (!body) {
    throw new Error(`S3 object body missing for key: ${s3Key}`);
  }

  await new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(localPath);
    body.pipe(writeStream);
    writeStream.on('finish', () => resolve());
    writeStream.on('error', reject);
    body.on('error', reject);
  });
};

export const videoOriginalsUpload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: ENV_VARS.AWS_BUCKET_NAME,
    metadata: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, metadata?: Record<string, string>) => void) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, key?: string) => void) => {
      const timestamp = Date.now();
      let ext = '.mp4';
      if (file.mimetype === 'video/quicktime') ext = '.mov';
      else if (file.mimetype === 'video/x-msvideo') ext = '.avi';
      else if (file.mimetype === 'video/webm') ext = '.webm';
      cb(null, `videos/originals/${timestamp}${ext}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE
  }),
  limits: {
    fileSize: 3 * 1024 * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed for this endpoint.'));
    }
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

  // If key is already a full CloudFront URL, extract just the path
  let cleanKey = key;
  if (key.startsWith('https://') || key.startsWith('http://')) {
    try {
      const urlObj = new URL(key);
      cleanKey = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
    } catch {
      // If URL parsing fails, try simple string extraction
      const match = key.match(/cloudfront\.net\/(.+)$/);
      if (match) {
        cleanKey = match[1];
      }
    }
  }

  const url = `https://${cloudFrontDomain}/${cleanKey}`;

  if (ENV_VARS.CLOUDFRONT_KEY_PAIR_ID && ENV_VARS.CLOUDFRONT_PRIVATE_KEY) {
    const privateKey = ENV_VARS.CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, '\n');
    const dateLessThan = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // For HLS content, we need a signed URL with a custom policy that covers
    // all files in the HLS folder (master playlist, variant playlists, and segments).
    //
    // SECURITY: this branch grants 24h wildcard read access to every object
    // under the key's parent directory. We MUST only enter it when the key
    // matches the canonical layout the transcoder writes
    // (`videos/hls/<timestamp>/master.m3u8`, see hls-transcoder.ts and
    // transcode.worker.ts). Without this anchor, an attacker who can write
    // any *Key field on a Movie (e.g., via mass assignment on PUT /movies/:id)
    // can choose an arbitrary S3 prefix and have it wildcard-signed for any
    // public visitor.
    const HLS_CANONICAL_KEY = /^videos\/hls\/\d+\/master\.m3u8$/;
    if (HLS_CANONICAL_KEY.test(key)) {
      // Get the HLS folder path (e.g., videos/hls/1234567890/)
      const hlsFolderPath = key.substring(0, key.lastIndexOf('/') + 1);

      const policy = {
        Statement: [{
          Resource: `https://${cloudFrontDomain}/${hlsFolderPath}*`,
          Condition: {
            DateLessThan: {
              'AWS:EpochTime': Math.floor(dateLessThan.getTime() / 1000)
            }
          }
        }]
      };

      return getCloudfrontSignedUrl({
        url,
        keyPairId: ENV_VARS.CLOUDFRONT_KEY_PAIR_ID,
        privateKey,
        policy: JSON.stringify(policy),
      });
    }
    
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

