import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { Activity } from '../models/activity.model.js';
import { ENV_VARS } from '../config/envVars.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware.js';
import { validateUserRegister, validateUserLogin, validateUserUpdate } from '../middleware/validation.middleware.js';
import { generateCloudfrontSignedUrl } from '../config/s3.js';
import logger from '../config/logger.js';

const userRoutes = express.Router();

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
userRoutes.post('/register', (req, res, next) => {
  // Debug: Log incoming request body
  console.log('Registration request body:', JSON.stringify(req.body, null, 2));
  next();
}, validateUserRegister, async (req, res) => {
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
      user: user.toPrivateProfile()
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
      user: user.toPrivateProfile()
    });
  } catch (error) {
    securityLogger('USER_LOGIN_ERROR', { error: error.message }, req);
    logger.error('Login error:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Login failed. Please try again.' });
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
userRoutes.get('/profile/:username', async (req, res) => {
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

// Check if username is available
userRoutes.get('/check-username/:username', async (req, res) => {
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
userRoutes.get('/check-email/:email', async (req, res) => {
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

    // Limit to 4 favorite films (like Letterboxd)
    if (user.favoriteFilms.length >= 4) {
      return res.status(400).json({ message: 'Maximum 4 favorite films allowed' });
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

export default userRoutes;

