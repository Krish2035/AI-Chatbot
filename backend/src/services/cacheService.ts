import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// In-Memory Fallback Cache when Redis is not running
class MemoryCache {
  private store = new Map<string, { value: any; expiresAt?: number }>();

  get<T>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value as T;
  }

  set(key: string, value: any, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  delPattern(pattern: string): void {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}

const memoryFallback = new MemoryCache();
let redisClient: Redis | null = null;
let isRedisOnline = false;

try {
  redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 2500,
    retryStrategy: (times) => {
      if (times > 3) return null; // stop retrying after 3 attempts, stay in memory fallback
      return Math.min(times * 1000, 3000);
    },
  });

  redisClient.on('connect', () => {
    isRedisOnline = true;
    console.log('✅ Redis Cache connected successfully at:', redisUrl);
  });

  redisClient.on('error', (err) => {
    isRedisOnline = false;
    // Silent failover to in-memory cache
  });

  redisClient.connect().catch(() => {
    isRedisOnline = false;
  });
} catch (e) {
  isRedisOnline = false;
}

export const cacheService = {
  isOnline(): boolean {
    return isRedisOnline;
  },

  async get<T = any>(key: string): Promise<T | null> {
    if (isRedisOnline && redisClient) {
      try {
        const data = await redisClient.get(key);
        return data ? (JSON.parse(data) as T) : null;
      } catch (err) {
        // Fallback to memory on read error
        return memoryFallback.get<T>(key);
      }
    }
    return memoryFallback.get<T>(key);
  },

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const serialized = JSON.stringify(value);
    if (isRedisOnline && redisClient) {
      try {
        if (ttlSeconds > 0) {
          await redisClient.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await redisClient.set(key, serialized);
        }
        return;
      } catch (err) {
        // Fallback to memory on write error
      }
    }
    memoryFallback.set(key, value, ttlSeconds);
  },

  async del(key: string): Promise<void> {
    if (isRedisOnline && redisClient) {
      try {
        await redisClient.del(key);
      } catch (err) {}
    }
    memoryFallback.del(key);
  },

  async delPattern(pattern: string): Promise<void> {
    if (isRedisOnline && redisClient) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } catch (err) {}
    }
    memoryFallback.delPattern(pattern);
  },
};
