'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, UserRole } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

/**
 * Generate a JWT token for a user.
 * Payload contains userId and roles array as required by the spec.
 */
const generateToken = (user, roles) => {
  const payload = {
    userId: user.id,
    roles: roles.map((r) => (typeof r === 'string' ? r : r.name)),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Register a new user with email and password.
 * Assigns the GRANTEE role by default.
 */
const register = async ({ name, email, password }) => {
  // Check if user already exists
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    const error = new Error('A user with this email already exists.');
    error.status = 409;
    throw error;
  }

  const password_hash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password_hash });

  // Assign default GRANTEE role
  const granteeRole = await Role.findOne({ where: { name: 'GRANTEE' } });
  if (granteeRole) {
    await UserRole.create({ user_id: user.id, role_id: granteeRole.id });
  }

  // Return user without password_hash
  const { password_hash: _, ...userObj } = user.toJSON();
  return userObj;
};

/**
 * Login a user with email and password.
 * Returns a JWT on success.
 */
const login = async ({ email, password }) => {
  // Fetch user with password_hash
  const user = await User.scope('withPassword').findOne({ where: { email } });
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  if (!user.password_hash) {
    const error = new Error('This account uses OAuth login. Please sign in with your OAuth provider.');
    error.status = 400;
    throw error;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  // Load roles
  const userWithRoles = await User.findByPk(user.id, {
    include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
  });

  const roles = userWithRoles.roles || [];
  const token = generateToken(user, roles);

  return { accessToken: token };
};

/**
 * Issue a JWT for an OAuth-authenticated user.
 */
const oauthLogin = async (user) => {
  const userWithRoles = await User.findByPk(user.id, {
    include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
  });

  const roles = userWithRoles ? userWithRoles.roles : [];
  const token = generateToken(user, roles);

  return { accessToken: token };
};

module.exports = { register, login, oauthLogin, generateToken };
