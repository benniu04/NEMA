import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import moviesRoutes from './routes/movies.routes.js';
import authRoutes from './routes/auth.routes.js';
import cors from 'cors';
import uploadRoutes from './routes/upload.routes.js';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import commentsRouter from './routes/comments.routes.js';
import reviewsRouter from './routes/reviews.routes.js';

import {connectDB} from './config/db.js';
import {ENV_VARS} from './config/envVars.js';

const app = express();
const PORT = ENV_VARS.PORT;

app.set('trust proxy', 1);

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:", "https://*.amazonaws.com"],
      mediaSrc: ["'self'", "https:", "blob:", "https://*.amazonaws.com"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: [
    'https://nemaa.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000'  
  ],
  credentials: true
}));

// Body parsing and cookie parsing
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

const customSanitize = (req, res, next) => {
  const sanitizeObject = (obj, parentKey = '') => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const fullPath = parentKey ? `${parentKey}.${key}` : key;
        
        if (key.includes('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key], fullPath);
        } else if (typeof obj[key] === 'string') {
          // Don't sanitize S3 keys, URLs, or file-related fields
          const isFileOrUrl = 
            key.includes('Url') ||           // posterUrl, thumbnailUrl, etc.
            key.includes('Key') ||           // posterKey, thumbnailKey, etc.  
            key === 'key' ||                 // S3 key field
            fullPath.includes('videoUrls') || // video URLs object
            obj[key].startsWith('http') ||   // Any HTTP URLs
            obj[key].startsWith('image/') || // S3 image keys
            obj[key].startsWith('video/');   // S3 video keys
          
          if (isFileOrUrl) {
            // Skip sanitization for file/URL fields
            return;
          }
          
          // Apply sanitization to other string fields
          obj[key] = obj[key].replace(/[\$\.]/g, '');
        }
      });
    }
  };

  // Sanitize request body
  if (req.body) {
    sanitizeObject(req.body);
  }

  // Sanitize request params
  if (req.params) {
    sanitizeObject(req.params);
  }

  next();
};

app.use(customSanitize);

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login attempts per IP per 15 minutes
  message: { message: 'Too many login attempts, please try again later.' },
  skipSuccessfulRequests: true
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // Allow 2 requests per 15 minutes at full speed
  delayMs: () => 500, 
  validate: { delayMs: false } // Disable the warning
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/auth/', speedLimiter);

// Routes
app.use('/api/movies', moviesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/comments', commentsRouter);
app.use('/api/reviews', reviewsRouter);

app.use((req, res, next) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ 
      message: 'Something went wrong!',
      error: 'Internal server error'
    });
  }
  
  res.status(err.status || 500).json({
    message: err.message,
    error: err.stack
  });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    connectDB();
});
