'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Application = sequelize.define(
  'Application',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    grant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'grants',
        key: 'id',
      },
    },
    grantee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    proposal: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'submitted',
      validate: {
        isIn: [['submitted', 'under_review', 'approved', 'rejected']],
      },
    },
  },
  {
    tableName: 'applications',
    timestamps: true,
  }
);

module.exports = Application;
