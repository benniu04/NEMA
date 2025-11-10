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