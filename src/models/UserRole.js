'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * UserRole - many-to-many join table between User and Role
 */
const UserRole = sequelize.define(
  'UserRole',
  {
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },
    },
  },
  {
    tableName: 'user_roles',
    timestamps: true,
  }
);

module.exports = UserRole;
