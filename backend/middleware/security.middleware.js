/**
 * Additional Security Middleware
 * Provides extra layers of protection for production
 */

import logger from '../config/logger.js';
import crypto from 'crypto';

/**
 * Request ID Middleware
 * Adds unique ID to each request for tracking and debugging
 */
export const requestId = (req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Security Headers Middleware
 * Additional security headers beyond Helmet
 */
export const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection (legacy but still useful)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy (don't leak URLs)
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (disable unnecessary features)
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS (force HTTPS for 1 year) - only in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
};

/**
 * Request Logger Middleware
 * Logs all incoming requests with security context
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer')
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });
  
  next();
};

/**
 * IP Blocklist Middleware
 * Blocks known malicious IPs
 * 
 * Usage: Add IPs to blocklist in environment or database
 */
const blockedIPs = new Set([
  // Add malicious IPs here
  // Example: '192.168.1.100'
]);

export const ipBlocklist = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (blockedIPs.has(clientIP)) {
    logger.warn('Blocked IP attempt', {
      ip: clientIP,
      url: req.originalUrl,
      userAgent: req.get('User-Agent')
    });
    return res.status(403).json({ message: 'Access denied' });
  }
  
  next();
};

/**
 * Add IP to blocklist
 * @param {string} ip - IP address to block
 */
export const blockIP = (ip) => {
  blockedIPs.add(ip);
  logger.warn('IP added to blocklist', { ip });
};

/**
 * Remove IP from blocklist
 * @param {string} ip - IP address to unblock
 */
export const unblockIP = (ip) => {
  blockedIPs.delete(ip);
  logger.info('IP removed from blocklist', { ip });
};

/**
 * Honeypot Middleware (Anti-Spam)
 * Detects bots by checking for hidden form field
 * 
 * Usage: Add hidden field "website" to forms
 * Real users won't fill it, bots will
 */
export const honeypot = (req, res, next) => {
  // Check if honeypot field is filled (bot behavior)
  if (req.body && req.body.website) {
    logger.warn('Honeypot triggered', {
      ip: req.ip || req.connection.remoteAddress,
      url: req.originalUrl,
      honeypotValue: req.body.website
    });
    
    // Silently reject (don't tell bot it was caught)
    return res.status(200).json({ message: 'Success' });
  }
  
  next();
};

/**
 * Suspicious Activity Detector
 * Monitors for suspicious patterns
 */
export const suspiciousActivityDetector = (req, res, next) => {
  const suspiciousPatterns = [
    // SQL injection attempts
    /(\bselect\b|\bunion\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b)/i,
    // XSS attempts
    /<script|javascript:|onerror=|onload=/i,
    // Path traversal
    /\.\.[\/\\]/,
    // Command injection
    /[;&|`$()]/
  ];
  
  const checkString = `${req.originalUrl} ${JSON.stringify(req.body)} ${JSON.stringify(req.query)}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      logger.warn('Suspicious activity detected', {
        requestId: req.id,
        ip: req.ip || req.connection.remoteAddress,
        url: req.originalUrl,
        pattern: pattern.toString(),
        userAgent: req.get('User-Agent')
      });
      
      // Don't block, just log (to avoid false positives)
      // You can enable blocking by uncommenting:
      // return res.status(400).json({ message: 'Invalid request' });
      break;
    }
  }
  
  next();
};

/**
 * Content Security Policy Reporter
 * Endpoint for browsers to report CSP violations
 */
export const cspReporter = (req, res) => {
  if (req.body && req.body['csp-report']) {
    logger.warn('CSP violation reported', {
      report: req.body['csp-report'],
      userAgent: req.get('User-Agent')
    });
  }
  res.status(204).end();
};

