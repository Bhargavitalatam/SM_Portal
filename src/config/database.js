'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');

const {
  DATABASE_URL,
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  NODE_ENV,
} = process.env;

// Connect to Postgres if DATABASE_URL or custom remote host is provided
const isPostgresAvailable = DATABASE_URL || (DB_HOST && DB_HOST !== 'localhost');

const sequelize = isPostgresAvailable
  ? new Sequelize(DATABASE_URL || `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`, {
      dialect: 'postgres',
      logging: NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions:
        process.env.DB_SSL === 'true'
          ? { ssl: { require: true, rejectUnauthorized: false } }
          : {},
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: './database.sqlite',
      logging: NODE_ENV === 'development' ? console.log : false,
    });

module.exports = sequelize;
