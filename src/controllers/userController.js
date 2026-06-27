'use strict';

const { validationResult } = require('express-validator');
const userService = require('../services/userService');

/**
 * GET /api/users
 * Get all users. Requires ADMIN role.
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    return res.status(200).json(users);
  } catch (err) {
    return res.status(err.status || 500).json({ error: 'Server Error', message: err.message });
  }
};

/**
 * GET /api/users/:userId
 * Get a user by ID. Requires ADMIN role.
 */
const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.userId);
    return res.status(200).json(user);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.status === 404 ? 'Not Found' : 'Server Error',
      message: err.message,
    });
  }
};

/**
 * POST /api/users/:userId/roles
 * Assign a role to a user. Requires ADMIN role.
 * Body: { "roleName": "GRANTOR" }
 */
const assignRole = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation Error', details: errors.array() });
  }

  try {
    const user = await userService.assignRole({
      userId: req.params.userId,
      roleName: req.body.roleName,
    });
    return res.status(200).json({
      message: `Role "${req.body.roleName}" assigned successfully.`,
      user,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.status === 400 ? 'Bad Request' : err.status === 404 ? 'Not Found' : err.status === 409 ? 'Conflict' : 'Server Error',
      message: err.message,
    });
  }
};

/**
 * DELETE /api/users/:userId/roles/:roleName
 * Remove a role from a user. Requires ADMIN role.
 */
const removeRole = async (req, res) => {
  try {
    const result = await userService.removeRole({
      userId: req.params.userId,
      roleName: req.params.roleName,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.status === 404 ? 'Not Found' : 'Server Error',
      message: err.message,
    });
  }
};

module.exports = { getAllUsers, getUserById, assignRole, removeRole };
