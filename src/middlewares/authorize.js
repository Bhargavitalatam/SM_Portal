'use strict';

/**
 * authorize - RBAC middleware factory.
 * Takes an array of allowed roles and returns a middleware that checks
 * whether the authenticated user has at least one of those roles.
 * Returns 403 Forbidden if the user lacks the required role.
 *
 * Usage: router.post('/grants', authenticate, authorize(['GRANTOR']), grantController.create)
 *
 * @param {string[]} allowedRoles - Array of role names that are permitted
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
    }

    const userRoles = req.userRoles || [];
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role(s): ${userRoles.join(', ') || 'none'}.`,
      });
    }

    next();
  };
};

module.exports = authorize;
