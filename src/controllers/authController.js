'use strict';

const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const passport = require('../config/passport');

/**
 * POST /api/auth/register
 * Register a new user with email and password.
 */
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation Error', details: errors.array() });
  }

  try {
    const { name, email, password } = req.body;
    const user = await authService.register({ name, email, password });
    return res.status(201).json(user);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.status === 409 ? 'Conflict' : 'Server Error',
      message: err.message,
    });
  }
};

/**
 * POST /api/auth/login
 * Login with email and password, returns JWT.
 */
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation Error', details: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.status === 401 ? 'Unauthorized' : 'Server Error',
      message: err.message,
    });
  }
};

/**
 * GET /api/auth/github
 * Initiate GitHub OAuth 2.0 flow.
 */
const githubAuth = passport.authenticate('github', { scope: ['user:email'], session: false });

/**
 * GET /api/auth/github/callback
 * GitHub OAuth 2.0 callback — exchange code for token, issue JWT.
 */
const githubCallback = async (req, res) => {
  passport.authenticate('github', { session: false }, async (err, user) => {
    if (err || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: err ? err.message : 'OAuth authentication failed.',
      });
    }

    try {
      const result = await authService.oauthLogin(user);
      return res.status(200).json(result);
    } catch (tokenErr) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to generate token after OAuth login.',
      });
    }
  })(req, res);
};

module.exports = { register, login, githubAuth, githubCallback };
