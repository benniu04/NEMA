import express, { Request, Response } from 'express';
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
import type { AuthenticatedRequest, IUser } from '../types/index.js';

const userRoutes = express.Router();

const getFrontendUrl = (): string => process.env.FRONTEND_URL || 'http://localhost:5173';

const enumerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Too many password reset requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const securityLogger = (event: string, details: Record<string, unknown>, req: Request): void => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip: req.ip || req.socket?.remoteAddress,
    userAgent: req.get('User-Agent'),
    ...details
  };
  logger.info(`[SECURITY] ${event}`, logEntry);
};

const generateToken = (user: IUser): string => {
  return jwt.sign(
    { id: user._id, username: user.username, email: user.email, isAdmin: user.isAdmin || false },
    ENV_VARS.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register
userRoutes.post('/register', validateUserRegister, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password, displayName } = req.body;
    securityLogger('USER_REGISTER_ATTEMPT', { email, username }, req);

    const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      securityLogger('USER_REGISTER_FAILED', { email, username, reason: `${field}_exists` }, req);
      res.status(400).json({ message: `A user with this ${field} already exists` });
      return;
    }

    const user = new User({ email: email.toLowerCase(), username, password, displayName: displayName || username });
    await user.save();
    const token = generateToken(user);

    res.cookie('userToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    securityLogger('USER_REGISTER_SUCCESS', { email, username, userId: user._id }, req);
    res.status(201).json({ message: 'Registration successful', user: user.toPrivateProfile(), token });
  } catch (error) {
    const err = error as Error & { name?: string; errors?: Record<string, { message: string }> };
    securityLogger('USER_REGISTER_ERROR', { error: err.message }, req);
    if (err.name === 'ValidationError' && err.errors) {
      const messages = Object.values(err.errors).map(e => e.message);
      res.status(400).json({ message: messages.join(', ') });
      return;
    }
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// Login
userRoutes.post('/login', validateUserLogin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { login, password } = req.body;
    securityLogger('USER_LOGIN_ATTEMPT', { login }, req);

    const user = await User.findOne({ $or: [{ email: login.toLowerCase() }, { username: login }] });
    if (!user) {
      securityLogger('USER_LOGIN_FAILED', { login, reason: 'user_not_found' }, req);
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      securityLogger('USER_LOGIN_FAILED', { login, reason: 'invalid_password' }, req);
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    res.cookie('userToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    securityLogger('USER_LOGIN_SUCCESS', { login, userId: user._id }, req);
    res.json({ message: 'Login successful', user: user.toPrivateProfile(), token });
  } catch (error) {
    const err = error as Error;
    securityLogger('USER_LOGIN_ERROR', { error: err.message }, req);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// Firebase OAuth
userRoutes.post('/firebase-auth', async (req: Request, res: Response): Promise<void> => {
  try {
    const { firebaseToken, email, displayName, photoURL, uid } = req.body;
    if (!firebaseToken) {
      res.status(400).json({ message: 'Firebase token is required' });
      return;
    }

    securityLogger('FIREBASE_AUTH_ATTEMPT', { email, uid }, req);

    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(firebaseToken);
    } catch (error) {
      res.status(401).json({ message: 'Invalid Firebase token' });
      return;
    }

    let user = await User.findOne({ $or: [{ firebaseUid: decodedToken.uid }, { email: decodedToken.email?.toLowerCase() }] });

    if (user) {
      if (!user.firebaseUid) {
        user.firebaseUid = decodedToken.uid;
        user.authProvider = 'google';
      }
      if (displayName && displayName !== user.displayName) user.displayName = displayName;
      if (photoURL && photoURL !== user.avatar) user.avatar = photoURL;
      user.lastLogin = new Date();
      await user.save();
    } else {
      const baseUsername = decodedToken.email!.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      let username = baseUsername;
      let counter = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = new User({
        email: decodedToken.email!.toLowerCase(),
        username,
        displayName: displayName || decodedToken.name || username,
        avatar: photoURL || decodedToken.picture,
        firebaseUid: decodedToken.uid,
        authProvider: 'google',
        isVerified: decodedToken.emailVerified,
        lastLogin: new Date(),
        password: undefined
      });
      await user.save();
    }

    const token = generateToken(user);
    res.cookie('userToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ message: 'Authentication successful', user: user.toPrivateProfile(), token });
  } catch (error) {
    const err = error as Error;
    securityLogger('FIREBASE_AUTH_ERROR', { error: err.message }, req);
    res.status(500).json({ message: 'Authentication failed. Please try again.' });
  }
});

// Logout
userRoutes.post('/logout', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    securityLogger('USER_LOGOUT', { userId: req.user?.id }, req);
    res.clearCookie('userToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed' });
  }
});

// Forgot password
userRoutes.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ message: 'Email is required' }); return; }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || (user.authProvider === 'google' && !user.password)) {
      res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
      return;
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    const resetUrl = `${getFrontendUrl()}/reset-password/${resetToken}`;
    const emailContent = emailTemplates.passwordReset(resetUrl, user.displayName || user.username);
    await sendEmail({ to: user.email, subject: emailContent.subject, html: emailContent.html });

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to process password reset request' });
  }
});

// Reset password
userRoutes.post('/reset-password/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password || password.length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters' });
      return;
    }

    const user = await User.findByPasswordResetToken(token);
    if (!user) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Get current user profile
userRoutes.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id)
      .populate('watchlist', 'title posterKey posterUrl director rating releaseDate')
      .populate('favoriteFilms', 'title posterKey posterUrl director rating releaseDate');
    
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    const [reviewCount, commentCount, watchedCount] = await Promise.all([
      Activity.countDocuments({ userId: req.user!.id, type: 'review' }),
      Activity.countDocuments({ userId: req.user!.id, type: 'comment' }),
      Activity.countDocuments({ userId: req.user!.id, type: 'watched' })
    ]);

    user.stats = { filmsWatched: watchedCount, reviewsWritten: reviewCount, commentsWritten: commentCount };

    const [watchlistWithUrls, favoritesWithUrls] = await Promise.all([
      Promise.all(user.watchlist.map(async (movie: any) => {
        const movieObj = movie.toObject();
        if (movieObj.posterKey) {
          try { movieObj.posterUrl = await generateCloudfrontSignedUrl(movieObj.posterKey); } catch {}
        }
        return movieObj;
      })),
      Promise.all(user.favoriteFilms.map(async (movie: any) => {
        const movieObj = movie.toObject();
        if (movieObj.posterKey) {
          try { movieObj.posterUrl = await generateCloudfrontSignedUrl(movieObj.posterKey); } catch {}
        }
        return movieObj;
      }))
    ]);

    const userProfile = user.toPrivateProfile() as any;
    userProfile.watchlist = watchlistWithUrls;
    userProfile.favoriteFilms = favoritesWithUrls;

    res.json(userProfile);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

// Update profile
userRoutes.put('/me', authMiddleware, validateUserUpdate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { displayName, bio, favoriteGenres, avatar, banner } = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (favoriteGenres !== undefined) user.favoriteGenres = favoriteGenres;
    if (avatar !== undefined) user.avatar = avatar;
    if (banner !== undefined) user.banner = banner;

    await user.save();
    res.json({ message: 'Profile updated successfully', user: user.toPrivateProfile() });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Change password
userRoutes.put('/me/password', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      res.status(400).json({ message: 'Current and new password are required (8+ chars)' });
      return;
    }

    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Current password is incorrect' });
      return;
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// Watchlist endpoints
userRoutes.post('/watchlist/:movieId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    if (user.watchlist.includes(req.params.movieId as any)) {
      res.status(400).json({ message: 'Movie already in watchlist' });
      return;
    }
    user.watchlist.push(req.params.movieId as any);
    await user.save();
    await Activity.create({ userId: req.user!.id, type: 'watchlist_add', movieId: req.params.movieId });
    res.json({ message: 'Added to watchlist', watchlist: user.watchlist });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add to watchlist' });
  }
});

userRoutes.delete('/watchlist/:movieId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    user.watchlist = user.watchlist.filter(id => id.toString() !== req.params.movieId);
    await user.save();
    res.json({ message: 'Removed from watchlist', watchlist: user.watchlist });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove from watchlist' });
  }
});

// Favorites endpoints
userRoutes.post('/favorites/:movieId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    if (user.favoriteFilms.includes(req.params.movieId as any)) {
      res.status(400).json({ message: 'Movie already in favorites' });
      return;
    }
    if (user.favoriteFilms.length >= 5) {
      res.status(400).json({ message: 'You can only add 5 films to your favorites' });
      return;
    }
    user.favoriteFilms.push(req.params.movieId as any);
    await user.save();
    await Activity.create({ userId: req.user!.id, type: 'favorite_add', movieId: req.params.movieId });
    res.json({ message: 'Added to favorites', favorites: user.favoriteFilms });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add to favorites' });
  }
});

userRoutes.delete('/favorites/:movieId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    user.favoriteFilms = user.favoriteFilms.filter(id => id.toString() !== req.params.movieId);
    await user.save();
    res.json({ message: 'Removed from favorites', favorites: user.favoriteFilms });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove from favorites' });
  }
});

// Search users
userRoutes.get('/search', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    logger.info('User search request', { query, userId: req.user?.id });
    
    if (!query) {
      res.json([]);
      return;
    }

    // Escape regex special characters to prevent injection
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Search by username or displayName using regex for partial match
    // We use a case-insensitive regex
    const searchQuery = {
      $and: [
        { _id: { $ne: req.user!.id } }, // Exclude current user
        {
          $or: [
            { username: { $regex: escapedQuery, $options: 'i' } },
            { displayName: { $regex: escapedQuery, $options: 'i' } }
          ]
        }
      ]
    };
    
    logger.info('User search query', { escapedQuery, searchQuery: JSON.stringify(searchQuery) });
    
    const users = await User.find(searchQuery)
      .limit(20)
      .select('username displayName avatar bio stats followers following');

    logger.info('User search results', { count: users.length, usernames: users.map(u => u.username) });

    const currentUser = await User.findById(req.user!.id);
    
    const results = users.map(u => {
      const userObj = u.toObject();
      return {
        id: userObj._id.toString(),
        username: userObj.username,
        displayName: userObj.displayName,
        avatar: userObj.avatar,
        bio: userObj.bio,
        isFollowing: currentUser?.following.some(id => id.toString() === userObj._id.toString()),
        stats: {
          followersCount: userObj.followers?.length || 0,
          filmsWatched: userObj.stats?.filmsWatched || 0
        }
      };
    });

    res.json(results);
  } catch (error) {
    logger.error('Error searching users:', error);
    res.status(500).json({ message: 'Failed to search users' });
  }
});

// Suggested users
userRoutes.get('/suggested', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUser = await User.findById(req.user!.id);
    if (!currentUser) { res.status(404).json({ message: 'User not found' }); return; }

    // Suggest users that are NOT currently followed and NOT the current user
    const suggested = await User.find({
      $and: [
        { _id: { $ne: req.user!.id } },
        { _id: { $nin: currentUser.following } }
      ]
    })
    .limit(5)
    .select('username displayName avatar bio stats followers following');

    const results = suggested.map(u => {
      const userObj = u.toObject();
      return {
        id: userObj._id.toString(),
        username: userObj.username,
        displayName: userObj.displayName,
        avatar: userObj.avatar,
        bio: userObj.bio,
        isFollowing: false,
        stats: {
          followersCount: userObj.followers?.length || 0,
          filmsWatched: userObj.stats?.filmsWatched || 0
        }
      };
    });

    res.json(results);
  } catch (error) {
    logger.error('Error getting suggested users:', error);
    res.status(500).json({ message: 'Failed to get suggested users' });
  }
});

// Activity Feed
userRoutes.get('/feed', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const currentUser = await User.findById(req.user!.id);
    if (!currentUser) { res.status(404).json({ message: 'User not found' }); return; }

    // Get activities from followed users
    const activities = await Activity.find({
      userId: { $in: currentUser.following }
    })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit + 1)
    .populate('userId', 'username displayName avatar')
    .populate('movieId', 'title posterUrl posterKey');

    const hasMore = activities.length > limit;
    const finalActivities = activities.slice(0, limit);

    // Generate signed URLs for posters in parallel
    const activitiesWithUrls = await Promise.all(finalActivities.map(async (activity) => {
      const activityObj = activity.toObject() as any;
      if (activityObj.movieId && activityObj.movieId.posterKey) {
        try {
          activityObj.movieId.posterUrl = await generateCloudfrontSignedUrl(activityObj.movieId.posterKey);
        } catch (error) {
          logger.warn('Failed to generate signed URL for feed poster', { posterKey: activityObj.movieId.posterKey });
        }
      }
      return activityObj;
    }));

    res.json({
      activities: activitiesWithUrls,
      hasMore
    });
  } catch (error) {
    logger.error('Error getting activity feed:', error);
    res.status(500).json({ message: 'Failed to get activity feed' });
  }
});

// Public profile
userRoutes.get('/profile/:username', profileLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json(user.toPublicProfile());
  } catch (error) {
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

// Check username/email availability
userRoutes.get('/check-username/:username', enumerationLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const existingUser = await User.findOne({ username: req.params.username });
    res.json({ available: !existingUser });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check username' });
  }
});

userRoutes.get('/check-email/:email', enumerationLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const existingUser = await User.findOne({ email: req.params.email.toLowerCase() });
    res.json({ available: !existingUser });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check email' });
  }
});

// Follow/Unfollow
userRoutes.post('/follow/:userId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (userId === req.user!.id) { res.status(400).json({ message: 'You cannot follow yourself' }); return; }

    const [currentUser, targetUser] = await Promise.all([User.findById(req.user!.id), User.findById(userId)]);
    if (!targetUser) { res.status(404).json({ message: 'User not found' }); return; }
    if (currentUser!.following.includes(userId as any)) {
      res.status(400).json({ message: 'Already following this user' });
      return;
    }

    currentUser!.following.push(userId as any);
    targetUser.followers.push(req.user!.id as any);
    await Promise.all([currentUser!.save(), targetUser.save()]);

    res.json({ message: 'Successfully followed user', following: currentUser!.following, followingCount: currentUser!.following.length });
  } catch (error) {
    res.status(500).json({ message: 'Failed to follow user' });
  }
});

userRoutes.delete('/follow/:userId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const [currentUser, targetUser] = await Promise.all([User.findById(req.user!.id), User.findById(userId)]);
    if (!targetUser) { res.status(404).json({ message: 'User not found' }); return; }

    currentUser!.following = currentUser!.following.filter(id => id.toString() !== userId);
    targetUser.followers = targetUser.followers.filter(id => id.toString() !== req.user!.id);
    await Promise.all([currentUser!.save(), targetUser.save()]);

    res.json({ message: 'Successfully unfollowed user', following: currentUser!.following, followingCount: currentUser!.following.length });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unfollow user' });
  }
});

export default userRoutes;

