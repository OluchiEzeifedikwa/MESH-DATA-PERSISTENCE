import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 1,
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

export const queryCache = {
  async get(key) {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },
  async set(key, value, ttlSeconds = 300) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Non-fatal — a cache write failure just means the next request hits the DB
    }
  },
};
