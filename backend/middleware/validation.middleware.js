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