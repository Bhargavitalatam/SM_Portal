'use strict';

const { User, Role, UserRole } = require('../models');

/**
 * Get all users (ADMIN only).
 */
const getAllUsers = async () => {
  const users = await User.findAll({
    include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
    order: [['createdAt', 'DESC']],
  });
  return users;
};

/**
 * Get a user by ID.
 */
const getUserById = async (id) => {
  const user = await User.findByPk(id, {
    include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
  });

  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  return user;
};

/**
 * Assign a role to a user (ADMIN only).
 */
const assignRole = async ({ userId, roleName }) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) {
    const error = new Error(`Role "${roleName}" does not exist. Valid roles: ADMIN, GRANTOR, GRANTEE`);
    error.status = 400;
    throw error;
  }

  // Check if already assigned
  const existing = await UserRole.findOne({
    where: { user_id: userId, role_id: role.id },
  });

  if (existing) {
    const error = new Error(`User already has the role "${roleName}".`);
    error.status = 409;
    throw error;
  }

  await UserRole.create({ user_id: userId, role_id: role.id });

  // Return updated user with roles
  const updatedUser = await User.findByPk(userId, {
    include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
  });

  return updatedUser;
};

/**
 * Remove a role from a user (ADMIN only).
 */
const removeRole = async ({ userId, roleName }) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) {
    const error = new Error(`Role "${roleName}" does not exist.`);
    error.status = 400;
    throw error;
  }

  const deleted = await UserRole.destroy({
    where: { user_id: userId, role_id: role.id },
  });

  if (!deleted) {
    const error = new Error(`User does not have the role "${roleName}".`);
    error.status = 404;
    throw error;
  }

  return { message: `Role "${roleName}" removed from user.` };
};

module.exports = { getAllUsers, getUserById, assignRole, removeRole };
