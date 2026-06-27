'use strict';

const Redis = require('ioredis');

const {
  // Standard naming (docker-compose / local)
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  // Railway naming (no underscore between REDIS and HOST/PORT/PASSWORD)
  REDISHOST,
  REDISPORT,
  REDISPASSWORD,
  // Full URL format (Railway also injects this)
  REDIS_URL,
  NODE_ENV,
} = process.env;

const host = REDIS_HOST || REDISHOST || 'localhost';
const port = parseInt(REDIS_PORT || REDISPORT || 6379);
const password = REDIS_PASSWORD || REDISPASSWORD || undefined;

let redis;

if (NODE_ENV === 'test') {
  // In test mode, create a mock redis client
  redis = {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 1,
    setex: async () => 'OK',
    ping: async () => 'PONG',
    quit: async () => 'OK',
    status: 'ready',
  };
} else {
  // Support full REDIS_URL (Railway injects this) or individual host/port vars
  redis = REDIS_URL
    ? new Redis(REDIS_URL, {
        retryStrategy: (times) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      })
    : new Redis({
        host,
        port,
        password,
        retryStrategy: (times) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

  redis.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  redis.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });
}

module.exports = redis;
