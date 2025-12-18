export { authMiddleware, optionalAuthMiddleware, adminMiddleware } from './auth.middleware.js';
export {
  validateMovie,
  validateAuth,
  validateComment,
  validateCommentDelete,
  validateReview,
  validateReviewDelete,
  validateUserRegister,
  validateUserLogin,
  validateUserUpdate
} from './validation.middleware.js';
export {
  requestId,
  securityHeaders,
  requestLogger,
  ipBlocklist,
  blockIP,
  unblockIP,
  honeypot,
  suspiciousActivityDetector,
  cspReporter
} from './security.middleware.js';

