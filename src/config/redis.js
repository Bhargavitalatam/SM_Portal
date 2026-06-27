'use strict';

const Redis = require('ioredis');

const {
  REDIS_HOST = 'localhost',
  REDIS_PORT = 6379,
  REDIS_PASSWORD,
  NODE_ENV,
} = process.env;

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
  redis = new Redis({
    host: REDIS_HOST,
    port: parseInt(REDIS_PORT),
    password: REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
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
