'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const grantController = require('../controllers/grantController');
const applicationController = require('../controllers/applicationController');

const router = Router();

// All grant routes require authentication
router.use(authenticate);

/**
 * POST /api/grants
 * Create a new grant. GRANTOR only.
 */
router.post(
  '/',
  authorize(['GRANTOR']),
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ min: 3, max: 255 }),
    body('amount')
      .isFloat({ min: 0 })
      .withMessage('Amount must be a non-negative number'),
    body('description').optional().isString(),
  ],
  grantController.createGrant
);

/**
 * GET /api/grants
 * List all grants. Any authenticated user.
 */
router.get('/', grantController.getAllGrants);

/**
 * GET /api/grants/:id
 * Get a single grant. Any authenticated user.
 */
router.get('/:id', grantController.getGrantById);

/**
 * PUT /api/grants/:id
 * Update a grant. GRANTOR (owner) only.
 */
router.put(
  '/:id',
  authorize(['GRANTOR', 'ADMIN']),
  [
    body('title').optional().trim().notEmpty().isLength({ min: 3, max: 255 }),
    body('amount').optional().isFloat({ min: 0 }),
    body('description').optional().isString(),
  ],
  grantController.updateGrant
);

/**
 * DELETE /api/grants/:id
 * Delete a grant. GRANTOR (owner) or ADMIN.
 */
router.delete('/:id', authorize(['GRANTOR', 'ADMIN']), grantController.deleteGrant);

/**
 * POST /api/grants/:id/apply
 * Submit an application for a grant. GRANTEE only.
 */
router.post(
  '/:id/apply',
  authorize(['GRANTEE']),
  [body('proposal').trim().notEmpty().withMessage('Proposal is required')],
  applicationController.applyForGrant
);

/**
 * GET /api/grants/:id/applications
 * Get all applications for a grant. GRANTOR (owner) or ADMIN.
 */
router.get(
  '/:id/applications',
  authorize(['GRANTOR', 'ADMIN']),
  applicationController.getApplicationsForGrant
);

module.exports = router;
