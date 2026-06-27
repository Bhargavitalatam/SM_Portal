'use strict';

const { Application, Grant, User } = require('../models');

/**
 * Submit a new application for a grant (GRANTEE only).
 */
const createApplication = async ({ grantId, granteeId, proposal }) => {
  // Verify the grant exists
  const grant = await Grant.findByPk(grantId);
  if (!grant) {
    const error = new Error('Grant not found.');
    error.status = 404;
    throw error;
  }

  // Check for duplicate application
  const existing = await Application.findOne({
    where: { grant_id: grantId, grantee_id: granteeId },
  });
  if (existing) {
    const error = new Error('You have already applied for this grant.');
    error.status = 409;
    throw error;
  }

  const application = await Application.create({
    grant_id: grantId,
    grantee_id: granteeId,
    proposal,
    status: 'submitted',
  });

  return application;
};

/**
 * Get all applications for a specific grant.
 * Only the owning GRANTOR or ADMIN can list applications.
 */
const getApplicationsForGrant = async ({ grantId, userId, userRoles }) => {
  const grant = await Grant.findByPk(grantId);
  if (!grant) {
    const error = new Error('Grant not found.');
    error.status = 404;
    throw error;
  }

  // Only the grant owner or ADMIN can see applications
  if (grant.grantor_id !== userId && !userRoles.includes('ADMIN')) {
    const error = new Error('Access denied. Only the grant owner can view applications.');
    error.status = 403;
    throw error;
  }

  const applications = await Application.findAll({
    where: { grant_id: grantId },
    include: [
      { model: User, as: 'grantee', attributes: ['id', 'name', 'email'] },
      { model: Grant, as: 'grant', attributes: ['id', 'title', 'amount'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  return applications;
};

/**
 * Get a specific application by ID.
 * GRANTEE who submitted it or the GRANTOR of the parent grant can view.
 */
const getApplicationById = async ({ appId, userId, userRoles }) => {
  const application = await Application.findByPk(appId, {
    include: [
      { model: User, as: 'grantee', attributes: ['id', 'name', 'email'] },
      {
        model: Grant,
        as: 'grant',
        attributes: ['id', 'title', 'amount', 'grantor_id'],
        include: [{ model: User, as: 'grantor', attributes: ['id', 'name', 'email'] }],
      },
    ],
  });

  if (!application) {
    const error = new Error('Application not found.');
    error.status = 404;
    throw error;
  }

  const isGrantee = application.grantee_id === userId;
  const isGrantor = application.grant && application.grant.grantor_id === userId;
  const isAdmin = userRoles.includes('ADMIN');

  if (!isGrantee && !isGrantor && !isAdmin) {
    const error = new Error('Access denied. You do not have permission to view this application.');
    error.status = 403;
    throw error;
  }

  return application;
};

/**
 * Update application status (GRANTOR of the parent grant only).
 */
const updateApplicationStatus = async ({ appId, status, userId, userRoles }) => {
  const application = await Application.findByPk(appId, {
    include: [{ model: Grant, as: 'grant', attributes: ['id', 'grantor_id'] }],
  });

  if (!application) {
    const error = new Error('Application not found.');
    error.status = 404;
    throw error;
  }

  const isGrantor = application.grant && application.grant.grantor_id === userId;
  const isAdmin = userRoles.includes('ADMIN');

  if (!isGrantor && !isAdmin) {
    const error = new Error('Access denied. Only the grant owner can update application status.');
    error.status = 403;
    throw error;
  }

  application.status = status;
  await application.save();
  return application;
};

module.exports = {
  createApplication,
  getApplicationsForGrant,
  getApplicationById,
  updateApplicationStatus,
};
