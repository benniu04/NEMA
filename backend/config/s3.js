import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { ENV_VARS } from './envVars.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${file.fieldname}/${uniqueSuffix}-${file.originalname}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    cacheControl: 'max-age=31536000'
  }),
  limits: {
    fileSize: 1024 * 1024 * 500, // 500MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (allowedVideoTypes.includes(file.mimetype) || allowedImageTypes.includes(file.mimetype)) {
      if (!/^[a-zA-Z0-9._-]+$/.test(file.originalname)) {
        return cb(new Error('Invalid filename. Only alphanumeric characters, dots, hyphens, and underscores allowed.'));
      }
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, AVI videos and JPEG, PNG, WebP images allowed.'));
    }
  }
});

export const generatePresignedUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: ENV_VARS.AWS_BUCKET_NAME,
    Key: key
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
};
