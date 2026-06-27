'use strict';

const sequelize = require('../config/database');
const User = require('./User');
const Role = require('./Role');
const UserRole = require('./UserRole');
const Grant = require('./Grant');
const Application = require('./Application');

// ─── Associations ──────────────────────────────────────────────────────────────

// User <-> Role (many-to-many through UserRole)
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'user_id',
  otherKey: 'role_id',
  as: 'roles',
});

Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'role_id',
  otherKey: 'user_id',
  as: 'users',
});

// UserRole belongs to User and Role
UserRole.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserRole.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// Grant belongs to User (grantor)
Grant.belongsTo(User, { foreignKey: 'grantor_id', as: 'grantor' });
User.hasMany(Grant, { foreignKey: 'grantor_id', as: 'grants' });

// Application belongs to Grant and User (grantee)
Application.belongsTo(Grant, { foreignKey: 'grant_id', as: 'grant' });
Application.belongsTo(User, { foreignKey: 'grantee_id', as: 'grantee' });
Grant.hasMany(Application, { foreignKey: 'grant_id', as: 'applications' });
User.hasMany(Application, { foreignKey: 'grantee_id', as: 'applications' });

module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  Grant,
  Application,
};
