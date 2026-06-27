'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const authenticate = require('../middlewares/authenticate');
const applicationController = require('../controllers/applicationController');

const router = Router();

// All application routes require authentication
router.use(authenticate);

/**
 * GET /api/applications/:appId
 * Get a specific application.
 * Accessible by the GRANTEE who submitted it or the GRANTOR of the parent grant.
 */
router.get('/:appId', applicationController.getApplicationById);

/**
 * PATCH /api/applications/:appId/status
 * Update application status (submitted → under_review → approved/rejected).
 * GRANTOR (of the parent grant) or ADMIN only.
 */
router.patch(
  '/:appId/status',
  [
    body('status')
      .isIn(['submitted', 'under_review', 'approved', 'rejected'])
      .withMessage('Status must be one of: submitted, under_review, approved, rejected'),
  ],
  applicationController.updateApplicationStatus
);

module.exports = router;
