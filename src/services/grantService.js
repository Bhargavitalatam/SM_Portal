'use strict';

const { Grant, User, Role } = require('../models');

/**
 * Create a new grant (GRANTOR only — grantor_id set from authenticated user).
 */
const createGrant = async ({ title, description, amount, grantorId }) => {
  const grant = await Grant.create({
    title,
    description,
    amount,
    grantor_id: grantorId,
  });
  return grant;
};

/**
 * Get all grants (any authenticated user).
 */
const getAllGrants = async () => {
  const grants = await Grant.findAll({
    include: [
      {
        model: User,
        as: 'grantor',
        attributes: ['id', 'name', 'email'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
  return grants;
};

/**
 * Get a single grant by ID.
 */
const getGrantById = async (id) => {
  const grant = await Grant.findByPk(id, {
    include: [
      {
        model: User,
        as: 'grantor',
        attributes: ['id', 'name', 'email'],
      },
    ],
  });

  if (!grant) {
    const error = new Error('Grant not found.');
    error.status = 404;
    throw error;
  }

  return grant;
};

/**
 * Update a grant. Only the owning GRANTOR can update.
 */
const updateGrant = async ({ id, grantorId, updates, userRoles }) => {
  const grant = await Grant.findByPk(id);

  if (!grant) {
    const error = new Error('Grant not found.');
    error.status = 404;
    throw error;
  }

  // Check ownership (ADMIN bypass allowed)
  if (grant.grantor_id !== grantorId && !userRoles.includes('ADMIN')) {
    const error = new Error('Access denied. You can only update your own grants.');
    error.status = 403;
    throw error;
  }

  const { title, description, amount } = updates;
  if (title !== undefined) grant.title = title;
  if (description !== undefined) grant.description = description;
  if (amount !== undefined) grant.amount = amount;

  await grant.save();
  return grant;
};

/**
 * Delete a grant. GRANTOR (owner) or ADMIN can delete.
 */
const deleteGrant = async ({ id, userId, userRoles }) => {
  const grant = await Grant.findByPk(id);

  if (!grant) {
    const error = new Error('Grant not found.');
    error.status = 404;
    throw error;
  }

  // Only the owning GRANTOR or ADMIN can delete
  if (grant.grantor_id !== userId && !userRoles.includes('ADMIN')) {
    const error = new Error('Access denied. You can only delete your own grants.');
    error.status = 403;
    throw error;
  }

  await grant.destroy();
  return { message: 'Grant deleted successfully.' };
};

module.exports = { createGrant, getAllGrants, getGrantById, updateGrant, deleteGrant };
