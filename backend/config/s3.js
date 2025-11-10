import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { ENV_VARS } from './envVars.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSignedUrl as getCloudfrontSignedUrl } from '@aws-sdk/cloudfront-signer';
import logger from './logger.js';

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
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
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
  fileFilter: (req, file, cb) => {
    logger.debug('File filter check', { mimetype: file.mimetype, size: file.size, filename: file.originalname });
    cb(null, true);
  }
});

export const generateCloudfrontSignedUrl = async (key) => {
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


export const generatePresignedUrl = async (key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: ENV_VARS.AWS_BUCKET_NAME,
      Key: key
    });
    
    return await getS3SignedUrl(s3Client, command, { expiresIn: 86400 });
  } catch (error) {
    logger.error('Error generating presigned URL', { error: error.message, key, stack: error.stack });
    throw error;
  }
};