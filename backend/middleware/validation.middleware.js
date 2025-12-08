import { body, validationResult } from 'express-validator';

export const validateMovie = [
  body('title').trim().isLength({ min: 1, max: 200 }).escape(),
  body('description').trim().isLength({ max: 1000 }).escape(),
  body('director').trim().isLength({ min: 1, max: 100 }).escape(),
  body('rating').isFloat({ min: 0, max: 10 }),
  body('genre').isArray().custom((genres) => {
    return genres.every(genre => typeof genre === 'string' && genre.length <= 50);
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    next();
  }
];

export const validateAuth = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .escape()
    .withMessage('Username must be 3-50 characters'),
  body('password')
    .isLength({ min: 8, max: 100 })
    .withMessage('Password must be 8-100 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: errors.array()
      });
    }
    next();
  }
];

export const validateComment = [
  body('movieId')
    .trim()
    .isLength({ min: 1, max: 100 })
    .escape()
    .withMessage('Movie ID is required'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be 1-500 characters')
    .escape(),
  body('nickname')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .escape()
    .withMessage('Nickname must be less than 50 characters'),
  // Note: deviceId is NOT accepted from client - always uses server-side IP
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Invalid comment data',
        errors: errors.array()
      });
    }
    next();
  }
];

export const validateCommentDelete = [
  // Note: deviceId is NOT accepted from client - always uses server-side IP
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Invalid delete request',
        errors: errors.array()
      });
    }
    next();
  }
];

export const validateReview = [
  body('movieId')
    .trim()
    .isLength({ min: 1, max: 100 })
    .escape()
    .withMessage('Movie ID is required'),
  body('rating')
    .isInt({ min: 1, max: 10 })
    .withMessage('Rating must be between 1 and 10'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review comment must be less than 1000 characters')
    .escape(),
  body('nickname')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .escape()
    .withMessage('Nickname must be less than 50 characters'),
  // Note: deviceId is NOT accepted from client - always uses server-side IP
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Invalid review data',
        errors: errors.array()
      });
    }
    next();
  }
];

export const validateReviewDelete = [
  // Note: deviceId is NOT accepted from client - always uses server-side IP
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Invalid delete request',
        errors: errors.array()
      });
    }
    next();
  }
];

// ==================== USER VALIDATION ====================

export const validateUserRegister = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    .withMessage('Please enter a valid email address'),
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 100 })
    .withMessage('Password must be 8-100 characters')
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Display name cannot exceed 50 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Invalid registration data',
        errors: errors.array()
      });
    }
    next();
  }
];

export const validateUserLogin = [
  body('login')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Email or username is required'),
  body('password')
    .isLength({ min: 1, max: 100 })
    .withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Invalid login data',
        errors: errors.array()
      });
    }
    next();
  }
];

export const validateUserUpdate = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Display name cannot exceed 50 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('favoriteGenres')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Favorite genres must be an array with max 10 items'),
  body('favoriteGenres.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each genre cannot exceed 50 characters'),
  body('avatar')
    .optional()
    .trim()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Invalid profile data',
        errors: errors.array()
      });
    }
    next();
  }
]; 