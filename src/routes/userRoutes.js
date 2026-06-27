'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const userController = require('../controllers/userController');

const router = Router();

// All user management routes require authentication + ADMIN role
router.use(authenticate, authorize(['ADMIN']));

/**
 * GET /api/users
 * Get all users. ADMIN only.
 */
router.get('/', userController.getAllUsers);

/**
 * GET /api/users/:userId
 * Get user by ID. ADMIN only.
 */
router.get('/:userId', userController.getUserById);

/**
 * POST /api/users/:userId/roles
 * Assign a role to a user. ADMIN only.
 * Body: { "roleName": "GRANTOR" }
 */
router.post(
  '/:userId/roles',
  [
    body('roleName')
      .notEmpty()
      .withMessage('roleName is required')
      .isIn(['ADMIN', 'GRANTOR', 'GRANTEE'])
      .withMessage('roleName must be one of: ADMIN, GRANTOR, GRANTEE'),
  ],
  userController.assignRole
);

/**
 * DELETE /api/users/:userId/roles/:roleName
 * Remove a role from a user. ADMIN only.
 */
router.delete('/:userId/roles/:roleName', userController.removeRole);

module.exports = router;
