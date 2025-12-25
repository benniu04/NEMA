import mongoose, { Schema, Model, CallbackError } from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { IUser, IUserModel, PublicProfile, PrivateProfile } from '../types/index.js';

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  password: {
    type: String,
    required: function(this: IUser) {
      // Password is required only if no Firebase UID (regular login)
      return !this.firebaseUid;
    },
    minlength: [8, 'Password must be at least 8 characters']
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: [50, 'Display name cannot exceed 50 characters'],
    default: function(this: IUser) {
      return this.username;
    }
  },
  avatar: {
    type: String,
    default: null
  },
  banner: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  favoriteGenres: [{
    type: String,
    trim: true
  }],
  favoriteFilms: [{
    type: Schema.Types.ObjectId,
    ref: 'Movie'
  }],
  watchlist: [{
    type: Schema.Types.ObjectId,
    ref: 'Movie'
  }],
  watchedFilms: [{
    movieId: {
      type: Schema.Types.ObjectId,
      ref: 'Movie'
    },
    watchedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Social - Following/Followers
  following: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  blockedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  stats: {
    filmsWatched: {
      type: Number,
      default: 0
    },
    reviewsWritten: {
      type: Number,
      default: 0
    },
    commentsWritten: {
      type: Number,
      default: 0
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Email verification
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  // Password reset
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });
// Index for user search
userSchema.index({ username: 'text', displayName: 'text' });
// Index for followers/following/blocked
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });
userSchema.index({ blockedUsers: 1 });

// Hash password before saving (only for local auth users)
userSchema.pre('save', async function(next) {
  // Skip password hashing if using OAuth or password hasn't been modified
  if (!this.password || !this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

// Update the updatedAt timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function(): string {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return resetToken;
};

// Method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function(): string {
  const verifyToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return verifyToken;
};

// Static method to find user by reset token
userSchema.statics.findByPasswordResetToken = async function(token: string): Promise<IUser | null> {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return this.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
};

// Static method to find user by verification token
userSchema.statics.findByEmailVerificationToken = async function(token: string): Promise<IUser | null> {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return this.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });
};

// Method to get public profile (excludes sensitive data)
userSchema.methods.toPublicProfile = function(): PublicProfile {
  return {
    id: this._id,
    username: this.username,
    displayName: this.displayName,
    avatar: this.avatar,
    bio: this.bio,
    favoriteGenres: this.favoriteGenres,
    stats: {
      ...this.stats,
      followersCount: this.followers?.length || 0,
      followingCount: this.following?.length || 0
    },
    createdAt: this.createdAt
  };
};

// Method to get private profile (for the user themselves)
userSchema.methods.toPrivateProfile = function(): PrivateProfile {
  return {
    id: this._id,
    email: this.email,
    username: this.username,
    displayName: this.displayName,
    avatar: this.avatar,
    banner: this.banner,
    bio: this.bio,
    favoriteGenres: this.favoriteGenres,
    favoriteFilms: this.favoriteFilms,
    watchlist: this.watchlist,
    watchedFilms: this.watchedFilms,
    following: this.following,
    followers: this.followers,
    blockedUsers: this.blockedUsers,
    stats: {
      ...this.stats,
      followersCount: this.followers?.length || 0,
      followingCount: this.following?.length || 0
    },
    isVerified: this.isVerified,
    isAdmin: this.isAdmin,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const User = mongoose.model<IUser, Model<IUser> & IUserModel>('User', userSchema);

