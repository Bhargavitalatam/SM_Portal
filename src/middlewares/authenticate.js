'use strict';

const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

/**
 * authenticate - JWT verification middleware.
 * Extracts JWT from Authorization: Bearer <token> header,
 * verifies it, loads the user with roles, and attaches to req.user.
 * Returns 401 if token is missing or invalid.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided. Include Authorization: Bearer <token>',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Malformed authorization header.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    } catch (jwtError) {
      const message =
        jwtError.name === 'TokenExpiredError'
          ? 'Token has expired. Please log in again.'
          : 'Invalid token. Please log in again.';
      return res.status(401).json({ error: 'Unauthorized', message });
    }

    // Load the user with their roles from DB
    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
    });

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User associated with this token no longer exists.',
      });
    }

    // Attach user and their role names to request
    req.user = user;
    req.userRoles = user.roles ? user.roles.map((r) => r.name) : [];

    next();
  } catch (err) {
    console.error('[Auth Middleware] Error:', err.message);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Authentication failed.' });
  }
};

module.exports = authenticate;
