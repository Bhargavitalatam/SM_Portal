'use strict';

const { validationResult } = require('express-validator');
const grantService = require('../services/grantService');

/**
 * POST /api/grants
 * Create a new grant. Requires GRANTOR role.
 */
const createGrant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation Error', details: errors.array() });
  }

  try {
    const { title, description, amount } = req.body;
    const grant = await grantService.createGrant({
      title,
      description,
      amount,
      grantorId: req.user.id,
    });
    return res.status(201).json(grant);
  } catch (err) {
    return res.status(err.status || 500).json({ error: 'Server Error', message: err.message });
  }
};

/**
 * GET /api/grants
 * Get all grants. Requires authentication.
 */
const getAllGrants = async (req, res) => {
  try {
    const grants = await grantService.getAllGrants();
    return res.status(200).json(grants);
  } catch (err) {
    return res.status(err.status || 500).json({ error: 'Server Error', message: err.message });
  }
};

/**
 * GET /api/grants/:id
 * Get a specific grant by ID. Requires authentication.
 */
const getGrantById = async (req, res) => {
  try {
    const grant = await grantService.getGrantById(req.params.id);
    return res.status(200).json(grant);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.status === 404 ? 'Not Found' : 'Server Error', message: err.message });
  }
};

/**
 * PUT /api/grants/:id
 * Update a grant. Requires GRANTOR role and ownership.
 */
const updateGrant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation Error', details: errors.array() });
  }

  try {
    const grant = await grantService.updateGrant({
      id: req.params.id,
      grantorId: req.user.id,
      updates: req.body,
      userRoles: req.userRoles,
    });
    return res.status(200).json(grant);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.status === 403 ? 'Forbidden' : err.status === 404 ? 'Not Found' : 'Server Error',
      message: err.message,
    });
  }
};

/**
 * DELETE /api/grants/:id
 * Delete a grant. Requires GRANTOR (owner) or ADMIN.
 */
const deleteGrant = async (req, res) => {
  try {
    const result = await grantService.deleteGrant({
      id: req.params.id,
      userId: req.user.id,
      userRoles: req.userRoles,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.status === 403 ? 'Forbidden' : err.status === 404 ? 'Not Found' : 'Server Error',
      message: err.message,
    });
  }
};

module.exports = { createGrant, getAllGrants, getGrantById, updateGrant, deleteGrant };
