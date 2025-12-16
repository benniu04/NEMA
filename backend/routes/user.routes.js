import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { User } from '../models/user.model.js';
import { Activity } from '../models/activity.model.js';
import { ENV_VARS } from '../config/envVars.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware.js';
import { validateUserRegister, validateUserLogin, validateUserUpdate } from '../middleware/validation.middleware.js';
import { generateCloudfrontSignedUrl } from '../config/s3.js';
import logger from '../config/logger.js';
import { verifyFirebaseToken } from '../config/firebase-admin.js';
import { sendEmail, emailTemplates } from '../config/email.js';

const userRoutes = express.Router();

// Get frontend URL for email links
const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
};

// Rate limiter for username/email enumeration protection
const enumerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit to 20 requests per 15 minutes
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for profile lookups to prevent mass scraping
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit to 50 profile lookups per 15 minutes
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Security logging function
const securityLogger = (event, details, req) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    ...details
  };
  logger.info(`[SECURITY] ${event}`, logEntry);
};

// Generate JWT token for user
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin || false
    },
    ENV_VARS.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ==================== REGISTRATION ====================

// Register new user
userRoutes.post('/register', validateUserRegister, async (req, res) => {
  try {
    const { email, username, password, displayName } = req.body;

    securityLogger('USER_REGISTER_ATTEMPT', { email, username }, req);

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      securityLogger('USER_REGISTER_FAILED', { email, username, reason: `${field}_exists` }, req);
      return res.status(400).json({ 
        message: `A user with this ${field} already exists` 
      });
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      username,
      password,
      displayName: displayName || username
    });

    await user.save();

    // Generate token
    const token = generateToken(user);

    // Set cookie
    res.cookie('userToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    securityLogger('USER_REGISTER_SUCCESS', { email, username, userId: user._id }, req);

    res.status(201).json({
      message: 'Registration successful',
      user: user.toPrivateProfile(),
      token: token // Include token for mobile browsers
    });
  } catch (error) {
    securityLogger('USER_REGISTER_ERROR', { error: error.message }, req);
    logger.error('Registration error:', { error: error.message, stack: error.stack });
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// ==================== LOGIN ====================

// User login
userRoutes.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { login, password } = req.body; // login can be email or username

    securityLogger('USER_LOGIN_ATTEMPT', { login }, req);

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: login.toLowerCase() },
        { username: login }
      ]
    });

    if (!user) {
      securityLogger('USER_LOGIN_FAILED', { login, reason: 'user_not_found' }, req);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      securityLogger('USER_LOGIN_FAILED', { login, reason: 'invalid_password' }, req);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user);

    // Set cookie
    res.cookie('userToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    securityLogger('USER_LOGIN_SUCCESS', { login, userId: user._id }, req);

    res.json({
      message: 'Login successful',
      user: user.toPrivateProfile(),
      token: token // Include token for mobile browsers
    });
  } catch (error) {
    securityLogger('USER_LOGIN_ERROR', { error: error.message }, req);
    logger.error('Login error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// ==================== FIREBASE OAUTH ====================

// Firebase OAuth authentication
userRoutes.post('/firebase-auth', async (req, res) => {
  try {
    const { firebaseToken, email, displayName, photoURL, uid } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({ message: 'Firebase token is required' });
    }

    securityLogger('FIREBASE_AUTH_ATTEMPT', { email, uid }, req);

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(firebaseToken);
    } catch (error) {
      logger.error('Firebase token verification failed:', { error: error.message });
      securityLogger('FIREBASE_AUTH_FAILED', { error: error.message }, req);
      return res.status(401).json({ message: 'Invalid Firebase token' });
    }

    // Check if user exists by Firebase UID or email
    let user = await User.findOne({
      $or: [
        { firebaseUid: decodedToken.uid },
        { email: decodedToken.email.toLowerCase() }
      ]
    });

    if (user) {
      // User exists - update Firebase UID if not set and update last login
      if (!user.firebaseUid) {
        user.firebaseUid = decodedToken.uid;
        user.authProvider = 'google';
      }
      
      // Update display name and avatar if provided from Google
      if (displayName && displayName !== user.displayName) {
        user.displayName = displayName;
      }
      if (photoURL && photoURL !== user.avatar) {
        user.avatar = photoURL;
      }
      
      user.lastLogin = new Date();
      await user.save();
      
      securityLogger('FIREBASE_AUTH_SUCCESS', { userId: user._id, email: user.email }, req);
    } else {
      // Create new user from Firebase OAuth
      // Generate unique username from email
      const baseUsername = decodedToken.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      let username = baseUsername;
      let counter = 1;
      
      // Ensure username is unique
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = new User({
        email: decodedToken.email.toLowerCase(),
        username,
        displayName: displayName || decodedToken.name || username,
        avatar: photoURL || decodedToken.picture,
        firebaseUid: decodedToken.uid,
        authProvider: 'google',
        isVerified: decodedToken.emailVerified,
        lastLogin: new Date(),
        password: undefined // No password for OAuth users
      });

      await user.save();
      
      securityLogger('FIREBASE_AUTH_NEW_USER', { userId: user._id, email: user.email }, req);
    }

    // Generate JWT token
    const token = generateToken(user);

    // Set cookie
    res.cookie('userToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: 'Authentication successful',
      user: user.toPrivateProfile(),
      token: token // Include token in response for mobile compatibility
    });
  } catch (error) {
    securityLogger('FIREBASE_AUTH_ERROR', { error: error.message }, req);
    logger.error('Firebase auth error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Authentication failed. Please try again.' });
  }
});

// ==================== LOGOUT ====================

// User logout
userRoutes.post('/logout', async (req, res) => {
  try {
    securityLogger('USER_LOGOUT', { userId: req.user?.id }, req);

    res.clearCookie('userToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Logout failed' });
  }
});

// ==================== PASSWORD RESET ====================

// Rate limiter for password reset to prevent abuse
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit to 5 requests per hour
  message: { message: 'Too many password reset requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Request password reset (forgot password)
userRoutes.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    securityLogger('PASSWORD_RESET_REQUEST', { email }, req);

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      securityLogger('PASSWORD_RESET_USER_NOT_FOUND', { email }, req);
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Check if user is OAuth only (no password)
    if (user.authProvider === 'google' && !user.password) {
      securityLogger('PASSWORD_RESET_OAUTH_USER', { email }, req);
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Build reset URL
    const resetUrl = `${getFrontendUrl()}/reset-password/${resetToken}`;

    // Send email
    const emailContent = emailTemplates.passwordReset(resetUrl, user.displayName || user.username);
    const result = await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html
    });

    if (!result.success) {
      logger.error('Failed to send password reset email:', { email, error: result.error });
      // In development, log the reset URL to console for testing
      if (process.env.NODE_ENV !== 'production') {
        logger.info('📧 [DEV MODE] Password reset link (email not configured):');
        logger.info(`   URL: ${resetUrl}`);
        logger.info(`   User: ${user.email}`);
      }
    }

    securityLogger('PASSWORD_RESET_EMAIL_SENT', { email, userId: user._id }, req);

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    securityLogger('PASSWORD_RESET_ERROR', { error: error.message }, req);
    logger.error('Forgot password error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to process password reset request' });
  }
});

// Reset password with token
userRoutes.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'New password is required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    securityLogger('PASSWORD_RESET_ATTEMPT', { token: token.substring(0, 8) + '...' }, req);

    // Find user by reset token
    const user = await User.findByPasswordResetToken(token);

    if (!user) {
      securityLogger('PASSWORD_RESET_INVALID_TOKEN', { token: token.substring(0, 8) + '...' }, req);
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password and clear reset token
    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    securityLogger('PASSWORD_RESET_SUCCESS', { userId: user._id }, req);

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    securityLogger('PASSWORD_RESET_ERROR', { error: error.message }, req);
    logger.error('Reset password error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Verify reset token is valid (for frontend validation)
userRoutes.get('/reset-password/:token/verify', async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findByPasswordResetToken(token);

    if (!user) {
      return res.status(400).json({ valid: false, message: 'Invalid or expired reset token' });
    }

    res.json({ valid: true });
  } catch (error) {
    logger.error('Verify reset token error:', { error: error.message });
    res.status(500).json({ valid: false, message: 'Failed to verify token' });
  }
});

// ==================== EMAIL VERIFICATION ====================

// Verify email with token
userRoutes.post('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    securityLogger('EMAIL_VERIFY_ATTEMPT', { token: token.substring(0, 8) + '...' }, req);

    const user = await User.findByEmailVerificationToken(token);

    if (!user) {
      securityLogger('EMAIL_VERIFY_INVALID_TOKEN', { token: token.substring(0, 8) + '...' }, req);
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    // Mark user as verified
    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    // Send welcome email
    const welcomeContent = emailTemplates.welcomeEmail(user.displayName || user.username);
    await sendEmail({
      to: user.email,
      subject: welcomeContent.subject,
      html: welcomeContent.html
    });

    securityLogger('EMAIL_VERIFY_SUCCESS', { userId: user._id }, req);

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    securityLogger('EMAIL_VERIFY_ERROR', { error: error.message }, req);
    logger.error('Verify email error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to verify email' });
  }
});

// Resend verification email
userRoutes.post('/resend-verification', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    securityLogger('RESEND_VERIFICATION_REQUEST', { userId: user._id }, req);

    // Generate new verification token
    const verifyToken = user.generateEmailVerificationToken();
    await user.save();

    // Build verification URL
    const verifyUrl = `${getFrontendUrl()}/verify-email/${verifyToken}`;

    // Send email
    const emailContent = emailTemplates.emailVerification(verifyUrl, user.displayName || user.username);
    const result = await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html
    });

    if (!result.success) {
      logger.error('Failed to send verification email:', { userId: user._id, error: result.error });
      // In development, log the verification URL to console for testing
      if (process.env.NODE_ENV !== 'production') {
        logger.info('📧 [DEV MODE] Email verification link (email not configured):');
        logger.info(`   URL: ${verifyUrl}`);
        logger.info(`   User: ${user.email}`);
      } else {
        return res.status(500).json({ message: 'Failed to send verification email' });
      }
    }

    securityLogger('RESEND_VERIFICATION_SUCCESS', { userId: user._id }, req);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    securityLogger('RESEND_VERIFICATION_ERROR', { error: error.message }, req);
    logger.error('Resend verification error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to resend verification email' });
  }
});

// ==================== PROFILE ====================

// Get current user profile
userRoutes.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('watchlist', 'title posterKey posterUrl director rating releaseDate')
      .populate('favoriteFilms', 'title posterKey posterUrl director rating releaseDate');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate stats dynamically from Activity collection
    const [reviewCount, commentCount, watchedCount] = await Promise.all([
      Activity.countDocuments({ userId: req.user.id, type: 'review' }),
      Activity.countDocuments({ userId: req.user.id, type: 'comment' }),
      Activity.countDocuments({ userId: req.user.id, type: 'watched' })
    ]);

    // Update user stats
    user.stats = {
      filmsWatched: watchedCount,
      reviewsWritten: reviewCount,
      commentsWritten: commentCount
    };

    // Generate fresh signed URLs for watchlist and favorite films
    const [watchlistWithUrls, favoritesWithUrls] = await Promise.all([
      Promise.all(user.watchlist.map(async (movie) => {
        const movieObj = movie.toObject();
        if (movieObj.posterKey) {
          try {
            movieObj.posterUrl = await generateCloudfrontSignedUrl(movieObj.posterKey);
          } catch (error) {
            logger.error('Error generating poster URL for watchlist:', { error: error.message });
          }
        }
        return movieObj;
      })),
      Promise.all(user.favoriteFilms.map(async (movie) => {
        const movieObj = movie.toObject();
        if (movieObj.posterKey) {
          try {
            movieObj.posterUrl = await generateCloudfrontSignedUrl(movieObj.posterKey);
          } catch (error) {
            logger.error('Error generating poster URL for favorites:', { error: error.message });
          }
        }
        return movieObj;
      }))
    ]);

    const userProfile = user.toPrivateProfile();
    userProfile.watchlist = watchlistWithUrls;
    userProfile.favoriteFilms = favoritesWithUrls;

    res.json(userProfile);
  } catch (error) {
    logger.error('Get profile error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

// Update user profile
userRoutes.put('/me', authMiddleware, validateUserUpdate, async (req, res) => {
  try {
    const { displayName, bio, favoriteGenres, avatar, banner } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update only provided fields
    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (favoriteGenres !== undefined) user.favoriteGenres = favoriteGenres;
    if (avatar !== undefined) user.avatar = avatar;
    if (banner !== undefined) user.banner = banner;

    await user.save();

    securityLogger('USER_PROFILE_UPDATE', { userId: user._id }, req);

    res.json({
      message: 'Profile updated successfully',
      user: user.toPrivateProfile()
    });
  } catch (error) {
    logger.error('Update profile error:', { error: error.message, stack: error.stack });
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Change password
userRoutes.put('/me/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isPasswordValid) {
      securityLogger('USER_PASSWORD_CHANGE_FAILED', { userId: user._id, reason: 'invalid_current_password' }, req);
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    securityLogger('USER_PASSWORD_CHANGE_SUCCESS', { userId: user._id }, req);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// ==================== WATCHLIST ====================

// Add movie to watchlist
userRoutes.post('/watchlist/:movieId', authMiddleware, async (req, res) => {
  try {
    const { movieId } = req.params;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already in watchlist
    if (user.watchlist.includes(movieId)) {
      return res.status(400).json({ message: 'Movie already in watchlist' });
    }

    user.watchlist.push(movieId);
    await user.save();

    // Log activity
    await Activity.create({
      userId: req.user.id,
      type: 'watchlist_add',
      movieId
    });

    res.json({ 
      message: 'Added to watchlist',
      watchlist: user.watchlist 
    });
  } catch (error) {
    logger.error('Add to watchlist error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to add to watchlist' });
  }
});

// Remove movie from watchlist
userRoutes.delete('/watchlist/:movieId', authMiddleware, async (req, res) => {
  try {
    const { movieId } = req.params;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.watchlist = user.watchlist.filter(id => id.toString() !== movieId);
    await user.save();

    res.json({ 
      message: 'Removed from watchlist',
      watchlist: user.watchlist 
    });
  } catch (error) {
    logger.error('Remove from watchlist error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to remove from watchlist' });
  }
});

// Get watchlist
userRoutes.get('/watchlist', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('watchlist', 'title posterKey posterUrl director rating genre releaseDate');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate fresh signed URLs for posters
    const watchlistWithUrls = await Promise.all(
      user.watchlist.map(async (movie) => {
        const movieObj = movie.toObject();
        if (movieObj.posterKey) {
          try {
            movieObj.posterUrl = await generateCloudfrontSignedUrl(movieObj.posterKey);
          } catch (error) {
            logger.error('Error generating poster URL:', { error: error.message, movieId: movie._id });
          }
        }
        return movieObj;
      })
    );

    res.json({ watchlist: watchlistWithUrls });
  } catch (error) {
    logger.error('Get watchlist error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to get watchlist' });
  }
});

// ==================== PUBLIC PROFILES ====================

// Get public user profile by username
userRoutes.get('/profile/:username', profileLimiter, async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.toPublicProfile());
  } catch (error) {
    logger.error('Get public profile error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

// Get user's public favorites by user ID
userRoutes.get('/:userId/favorites', profileLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .populate('favoriteFilms', 'title posterKey posterUrl director rating releaseDate');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate fresh signed URLs for favorite films
    const favoritesWithUrls = await Promise.all(
      (user.favoriteFilms || []).map(async (movie) => {
        const movieObj = movie.toObject();
        if (movieObj.posterKey) {
          try {
            movieObj.posterUrl = await generateCloudfrontSignedUrl(movieObj.posterKey);
          } catch (error) {
            logger.error('Error generating poster URL for favorites:', { error: error.message });
          }
        }
        return movieObj;
      })
    );

    res.json({ favorites: favoritesWithUrls });
  } catch (error) {
    logger.error('Get user favorites error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to get favorites' });
  }
});

// Check if username is available
userRoutes.get('/check-username/:username', enumerationLimiter, async (req, res) => {
  try {
    const { username } = req.params;
    
    const existingUser = await User.findOne({ username });
    
    res.json({ available: !existingUser });
  } catch (error) {
    logger.error('Check username error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to check username' });
  }
});

// Check if email is available
userRoutes.get('/check-email/:email', enumerationLimiter, async (req, res) => {
  try {
    const { email } = req.params;
    
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    res.json({ available: !existingUser });
  } catch (error) {
    logger.error('Check email error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to check email' });
  }
});

// ==================== FAVORITE FILMS ====================

// Get favorite films
userRoutes.get('/favorites', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('favoriteFilms', 'title posterKey posterUrl director rating genre releaseDate');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate fresh signed URLs for posters
    const favoritesWithUrls = await Promise.all(
      user.favoriteFilms.map(async (movie) => {
        const movieObj = movie.toObject();
        if (movieObj.posterKey) {
          try {
            movieObj.posterUrl = await generateCloudfrontSignedUrl(movieObj.posterKey);
          } catch (error) {
            logger.error('Error generating poster URL:', { error: error.message, movieId: movie._id });
          }
        }
        return movieObj;
      })
    );

    res.json({ favorites: favoritesWithUrls });
  } catch (error) {
    logger.error('Get favorites error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to get favorites' });
  }
});

// Add movie to favorites
userRoutes.post('/favorites/:movieId', authMiddleware, async (req, res) => {
  try {
    const { movieId } = req.params;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already in favorites
    if (user.favoriteFilms.includes(movieId)) {
      return res.status(400).json({ message: 'Movie already in favorites' });
    }

    // Limit to 5 favorite films
    if (user.favoriteFilms.length >= 5) {
      return res.status(400).json({ message: 'You can only add 5 films to your favorites' });
    }

    user.favoriteFilms.push(movieId);
    await user.save();

    // Log activity
    await Activity.create({
      userId: req.user.id,
      type: 'favorite_add',
      movieId
    });

    res.json({ 
      message: 'Added to favorites',
      favorites: user.favoriteFilms 
    });
  } catch (error) {
    logger.error('Add to favorites error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to add to favorites' });
  }
});

// Remove movie from favorites
userRoutes.delete('/favorites/:movieId', authMiddleware, async (req, res) => {
  try {
    const { movieId } = req.params;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.favoriteFilms = user.favoriteFilms.filter(id => id.toString() !== movieId);
    await user.save();

    res.json({ 
      message: 'Removed from favorites',
      favorites: user.favoriteFilms 
    });
  } catch (error) {
    logger.error('Remove from favorites error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to remove from favorites' });
  }
});

// ==================== ACTIVITY ====================

// Get user activity
userRoutes.get('/activity', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const activities = await Activity.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('movieId', 'title posterUrl director')
      .lean();

    res.json({ activities });
  } catch (error) {
    logger.error('Get activity error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to get activity' });
  }
});

// Get public user activity
userRoutes.get('/activity/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const activities = await Activity.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('movieId', 'title posterUrl director')
      .lean();

    res.json({ activities });
  } catch (error) {
    logger.error('Get public activity error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to get activity' });
  }
});

// Get activity feed from users you follow
userRoutes.get('/feed', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const offset = parseInt(req.query.offset) || 0;

    // Get the current user's following list
    const currentUser = await User.findById(req.user.id).select('following');

    if (!currentUser || currentUser.following.length === 0) {
      return res.json({ activities: [], hasMore: false });
    }

    // Get activities from users the current user follows
    const activities = await Activity.find({ userId: { $in: currentUser.following } })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit + 1)
      .populate('userId', 'username displayName avatar')
      .populate('movieId', 'title posterUrl posterKey director releaseDate')
      .lean();

    // Check if there are more activities
    const hasMore = activities.length > limit;
    const result = hasMore ? activities.slice(0, limit) : activities;

    // Generate signed URLs for movie posters
    const activitiesWithUrls = await Promise.all(
      result.map(async (activity) => {
        if (activity.movieId && activity.movieId.posterKey) {
          try {
            activity.movieId.posterUrl = await generateCloudfrontSignedUrl(activity.movieId.posterKey);
          } catch (error) {
            logger.error('Error generating poster URL for feed:', { error: error.message });
          }
        }
        return activity;
      })
    );

    res.json({ activities: activitiesWithUrls, hasMore });
  } catch (error) {
    logger.error('Get feed error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to get feed' });
  }
});

// ==================== SOCIAL - FOLLOW/UNFOLLOW ====================

// Search users by username or displayName
userRoutes.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    // Escape special regex characters to prevent ReDoS and injection attacks
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sanitizedQuery = escapeRegex(q.trim());

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.id } }, // Exclude current user
        {
          $or: [
            { username: { $regex: sanitizedQuery, $options: 'i' } },
            { displayName: { $regex: sanitizedQuery, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username displayName avatar bio stats followers following')
    .limit(20);

    const usersWithStats = users.map(user => ({
      ...user.toPublicProfile(),
      isFollowing: user.followers.includes(req.user.id)
    }));

    res.json(usersWithStats);
  } catch (error) {
    logger.error('Search users error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to search users' });
  }
});

// Get suggested users (users with similar taste)
userRoutes.get('/suggested', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find users with similar favorite films or genres
    const suggested = await User.find({
      $and: [
        { _id: { $ne: req.user.id } }, // Exclude current user
        { _id: { $nin: currentUser.following } }, // Exclude already following
        {
          $or: [
            { favoriteFilms: { $in: currentUser.favoriteFilms } },
            { favoriteGenres: { $in: currentUser.favoriteGenres } }
          ]
        }
      ]
    })
    .select('username displayName avatar bio stats followers following favoriteFilms')
    .limit(10);

    const suggestedWithStats = suggested.map(user => user.toPublicProfile());

    res.json(suggestedWithStats);
  } catch (error) {
    logger.error('Get suggested users error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to get suggested users' });
  }
});

// Follow a user
userRoutes.post('/follow/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findById(req.user.id),
      User.findById(userId)
    ]);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already following
    if (currentUser.following.includes(userId)) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    // Add to following/followers
    currentUser.following.push(userId);
    targetUser.followers.push(req.user.id);

    await Promise.all([
      currentUser.save(),
      targetUser.save()
    ]);

    res.json({ 
      message: 'Successfully followed user',
      following: currentUser.following,
      followingCount: currentUser.following.length
    });
  } catch (error) {
    logger.error('Follow user error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to follow user' });
  }
});

// Unfollow a user
userRoutes.delete('/follow/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const [currentUser, targetUser] = await Promise.all([
      User.findById(req.user.id),
      User.findById(userId)
    ]);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from following/followers
    currentUser.following = currentUser.following.filter(id => id.toString() !== userId);
    targetUser.followers = targetUser.followers.filter(id => id.toString() !== req.user.id);

    await Promise.all([
      currentUser.save(),
      targetUser.save()
    ]);

    res.json({ 
      message: 'Successfully unfollowed user',
      following: currentUser.following,
      followingCount: currentUser.following.length
    });
  } catch (error) {
    logger.error('Unfollow user error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to unfollow user' });
  }
});

// Get user's followers
userRoutes.get('/:userId/followers', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate({
        path: 'followers',
        select: 'username displayName avatar bio stats followers following'
      });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const followersWithStats = user.followers.map(follower => ({
      ...follower.toPublicProfile(),
      isFollowing: follower.followers.some(id => id.toString() === req.user.id)
    }));

    res.json(followersWithStats);
  } catch (error) {
    logger.error('Get followers error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to get followers' });
  }
});

// Get user's following
userRoutes.get('/:userId/following', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate({
        path: 'following',
        select: 'username displayName avatar bio stats followers following'
      });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const followingWithStats = user.following.map(followedUser => ({
      ...followedUser.toPublicProfile(),
      isFollowing: followedUser.followers.some(id => id.toString() === req.user.id)
    }));

    res.json(followingWithStats);
  } catch (error) {
    logger.error('Get following error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to get following' });
  }
});

export default userRoutes;

