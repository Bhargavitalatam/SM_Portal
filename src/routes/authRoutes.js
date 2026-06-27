'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');

const router = Router();

/**
 * POST /api/auth/register
 * Register with email/password
 */
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase and a number'),
  ],
  authController.register
);

/**
 * POST /api/auth/login
 * Login with email/password
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login
);

/**
 * GET /api/auth/github
 * Initiate GitHub OAuth flow
 */
router.get('/github', authController.githubAuth);

/**
 * GET /api/auth/github/callback
 * GitHub OAuth callback
 */
router.get('/github/callback', authController.githubCallback);

module.exports = router;
