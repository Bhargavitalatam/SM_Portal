'use strict';

require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const redis = require('./config/redis');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database
    console.log('[Server] Connecting to database...');
    await sequelize.authenticate();
    console.log('[Server] Database connection established.');

    // Sync models — creates tables if missing, never drops existing data
    await sequelize.sync({ force: false, alter: true });
    console.log('[Server] Database synchronized.');

    // Run seeder if SEED_ON_START is set
    if (process.env.SEED_ON_START === 'true') {
      const { seed } = require('../seeders/seed');
      await seed();
    }

    // Connect to Redis (non-blocking for production resilience)
    if (redis.connect) {
      try {
        await redis.connect();
      } catch (redisErr) {
        console.warn('[Server] Redis connection warning:', redisErr.message);
      }
    }

    // Start HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Grant Management Portal running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/health`);
    });

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
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

startServer();
