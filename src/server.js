'use strict';

require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const redis = require('./config/redis');

const PORT = process.env.PORT || 3000;

async function initDatabase() {
  try {
    console.log('[Server] Connecting to database...');
    await sequelize.authenticate();
    console.log('[Server] Database connection established.');

    // Ensure uuid-ossp extension exists (required on cloud-managed Postgres)
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Sync models — creates tables if missing, never drops data
    await sequelize.sync({ force: false, alter: false });
    console.log('[Server] Database synchronized.');

    // Always seed in production (idempotent — uses findOrCreate)
    // Also seeds when SEED_ON_START=true in development
    if (process.env.NODE_ENV === 'production' || process.env.SEED_ON_START === 'true') {
      const { seed } = require('../seeders/seed');
      await seed();
      console.log('[Server] Seeding complete.');
    }
  } catch (err) {
    global.dbError = err;
    console.error('[Server] Database initialization error:', err);
    // Do not crash — keep server running so healthcheck passes
  }
}

async function initRedis() {
  if (redis.connect) {
    try {
      await redis.connect();
      console.log('[Server] Redis connected.');
    } catch (redisErr) {
      console.warn('[Server] Redis connection warning:', redisErr.message);
    }
  }
}

async function startServer() {
  // Start HTTP server FIRST so Render healthcheck immediately passes
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Grant Management Portal running on port ${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  });

  // Initialize DB and Redis in the background (non-blocking)
  await initDatabase();
  await initRedis();

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      try {
        await sequelize.close();
        console.log('[Server] Database connection closed.');
        if (redis.quit) await redis.quit();
        console.log('[Server] Redis connection closed.');
      } catch (err) {
        console.error('[Server] Error during shutdown:', err.message);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return server;
}

startServer();
