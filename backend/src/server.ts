import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

import moviesRoutes from './routes/movies.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import commentsRouter from './routes/comments.routes.js';
import reviewsRouter from './routes/reviews.routes.js';
import watchTimeRouter from './routes/watchTime.routes.js';

import { connectDB } from './config/db.js';
import { ENV_VARS } from './config/envVars.js';
import logger from './config/logger.js';
import { setupGracefulShutdown } from './utils/gracefulShutdown.js';
import { 
  requestId, 
  securityHeaders, 
  requestLogger, 
  ipBlocklist,
  suspiciousActivityDetector,
  cspReporter
} from './middleware/security.middleware.js';

const app = express();
const PORT = ENV_VARS.PORT;

app.set('trust proxy', 1);

// Request ID and security headers (must be first)
app.use(requestId);
app.use(securityHeaders);

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:", "https://*.amazonaws.com", "https://*.cloudfront.net"],
      mediaSrc: ["'self'", "https:", "blob:", "https://*.amazonaws.com", "https://*.cloudfront.net"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://nemaa.netlify.app',
      'https://nema-nc78.onrender.com',
      'http://localhost:5173',  // Vite default
      'http://localhost:3000',  // React default
      'http://localhost:5174',  // Alternative Vite port
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000'
    ];
    
    // In development, allow any localhost origin
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing and cookie parsing
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

interface SanitizableObject {
  [key: string]: unknown;
}

const customSanitize = (req: Request, res: Response, next: NextFunction): void => {
  const sanitizeObject = (obj: SanitizableObject, parentKey = ''): void => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const fullPath = parentKey ? `${parentKey}.${key}` : key;
        
        if (key.includes('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key] as SanitizableObject, fullPath);
        } else if (typeof obj[key] === 'string') {
          const value = obj[key] as string;
          // Don't sanitize S3 keys, URLs, email addresses, tokens, or file-related fields
          const isFileOrUrl = 
            key === 'email' ||               // Email addresses need dots
            key === 'firebaseToken' ||       // Firebase JWT tokens need dots
            key.includes('Url') ||           // posterUrl, thumbnailUrl, etc.
            key.includes('Key') ||           // posterKey, thumbnailKey, etc.  
            key === 'key' ||                 // S3 key field
            fullPath.includes('videoUrls') || // video URLs object
            value.startsWith('http') ||   // Any HTTP URLs
            value.startsWith('image/') || // S3 image keys
            value.startsWith('video/');   // S3 video keys
          
          if (isFileOrUrl) {
            // Skip sanitization for file/URL fields
            return;
          }
          
          // Apply sanitization to other string fields (remove $ and .)
          obj[key] = value.replace(/[\$\.]/g, '');
        }
      });
    }
  };

  // Sanitize request body
  if (req.body) {
    sanitizeObject(req.body as SanitizableObject);
  }

  // Sanitize request params
  if (req.params) {
    sanitizeObject(req.params as SanitizableObject);
  }

  next();
};

app.use(customSanitize);

// Additional security layers
app.use(ipBlocklist);
app.use(suspiciousActivityDetector);

// Request logging (after body parsing)
if (process.env.NODE_ENV === 'production') {
  app.use(requestLogger);
}

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 100 requests per windowMs
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

// Root route (health check)
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'NEMA API Server',
    status: 'running',
    version: '1.0.0',
    pm2: 'cluster mode with 8 instances',
    endpoints: {
      movies: '/api/movies',
      auth: '/api/auth',
      users: '/api/users',
      upload: '/api/upload',
      comments: '/api/comments',
      reviews: '/api/reviews',
      watchTime: '/api/watch-time'
    }
  });
});

// Routes
app.use('/api/movies', moviesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/comments', commentsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/watch-time', watchTimeRouter);

// CSP violation reporting endpoint
app.post('/api/csp-report', cspReporter);

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

interface ErrorWithStatus extends Error {
  status?: number;
}

app.use((err: ErrorWithStatus, req: Request, res: Response, next: NextFunction) => {
  logger.error('Express error handler:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });
  
  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ 
      message: 'Something went wrong!',
      error: 'Internal server error'
    });
    return;
  }
  
  res.status(err.status || 500).json({
    message: err.message,
    error: err.stack
  });
});

const server = app.listen(PORT, () => {
  logger.info(`Server starting on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  connectDB();
});

// Setup graceful shutdown handlers
setupGracefulShutdown(server);

