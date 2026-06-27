'use strict';

const { validationResult } = require('express-validator');
const applicationService = require('../services/applicationService');

/**
 * POST /api/grants/:id/apply
 * Submit a new application for a grant. Requires GRANTEE role.
 */
const applyForGrant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation Error', details: errors.array() });
  }

  try {
    const application = await applicationService.createApplication({
      grantId: req.params.id,
      granteeId: req.user.id,
      proposal: req.body.proposal,
    });
    return res.status(201).json(application);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.status === 404 ? 'Not Found' : err.status === 409 ? 'Conflict' : 'Server Error',
      message: err.message,
    });
  }
};

/**
 * GET /api/grants/:id/applications
 * Get all applications for a grant. Requires GRANTOR (owner) role.
 */
const getApplicationsForGrant = async (req, res) => {
  try {
    const applications = await applicationService.getApplicationsForGrant({
      grantId: req.params.id,
      userId: req.user.id,
      userRoles: req.userRoles,
    });
    return res.status(200).json(applications);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.status === 403 ? 'Forbidden' : err.status === 404 ? 'Not Found' : 'Server Error',
      message: err.message,
    });
  }
};

/**
 * GET /api/applications/:appId
 * Get a specific application. Accessible by the grantee or the grant's grantor.
 */
const getApplicationById = async (req, res) => {
  try {
    const application = await applicationService.getApplicationById({
      appId: req.params.appId,
      userId: req.user.id,
      userRoles: req.userRoles,
    });
    return res.status(200).json(application);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.status === 403 ? 'Forbidden' : err.status === 404 ? 'Not Found' : 'Server Error',
      message: err.message,
    });
  }
};

/**
 * PATCH /api/applications/:appId/status
 * Update application status. Requires GRANTOR (grant owner) role.
 */
const updateApplicationStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation Error', details: errors.array() });
  }

  try {
    const application = await applicationService.updateApplicationStatus({
      appId: req.params.appId,
      status: req.body.status,
      userId: req.user.id,
      userRoles: req.userRoles,
    });
    return res.status(200).json(application);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.status === 403 ? 'Forbidden' : err.status === 404 ? 'Not Found' : 'Server Error',
      message: err.message,
    });
  }
};

module.exports = { applyForGrant, getApplicationsForGrant, getApplicationById, updateApplicationStatus };
