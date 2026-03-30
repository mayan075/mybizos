import { config } from '../config.js';
import { logger } from '../middleware/logger.js';

// ── In-memory fallback ────────────────────────────────────────────────────

interface MemEntry {
  value: string;
  expiresAt: number | null; // null = no expiry
}

const memStore = new Map<string, MemEntry>();

function memGet(key: string): string | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    memStore.delete(key);
    return null;
  }
  return entry.value;
}

function memSet(key: string, value: string, ttlSeconds: number): void {
  memStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

function memDel(key: string): void {
  memStore.delete(key);
}

function memDelPattern(pattern: string): void {
  // Convert Redis glob pattern to a RegExp
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex meta-chars except * and ?
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexStr}$`);
  for (const key of memStore.keys()) {
    if (regex.test(key)) {
      memStore.delete(key);
    }
  }
}

// ── Redis client (lazy-loaded) ────────────────────────────────────────────

type RedisClient = import('ioredis').Redis;

let redisClient: RedisClient | null = null;
let useMemFallback = false;
let initAttempted = false;

async function getClient(): Promise<RedisClient | null> {
  if (initAttempted) return redisClient;
  initAttempted = true;

  if (!config.REDIS_URL || config.REDIS_URL === 'placeholder' || !config.REDIS_URL.startsWith('redis')) {
    logger.info('Redis not configured — using in-memory cache');
    useMemFallback = true;
    return null;
  }

  try {
    const { default: Redis } = await import('ioredis');
    const client = new Redis(config.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
    });

    await client.connect();
    await client.ping();

    client.on('error', (err: Error) => {
      logger.error('Redis connection error', { error: err.message });
    });

    redisClient = client;
    logger.info('Redis connected successfully');
    return redisClient;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Redis unavailable — using in-memory cache fallback', { error: message });
    useMemFallback = true;
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────

export async function cacheGet(key: string): Promise<string | null> {
  const client = await getClient();
  if (useMemFallback || !client) {
    return memGet(key);
  }
  try {
    return await client.get(key);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Redis GET failed, falling back to memory', { key, error: message });
    return memGet(key);
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const client = await getClient();
  if (useMemFallback || !client) {
    memSet(key, value, ttlSeconds);
    return;
  }
  try {
    await client.set(key, value, 'EX', ttlSeconds);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Redis SET failed, falling back to memory', { key, error: message });
    memSet(key, value, ttlSeconds);
  }
}

export async function cacheDel(key: string): Promise<void> {
  const client = await getClient();
  if (useMemFallback || !client) {
    memDel(key);
    return;
  }
  try {
    await client.del(key);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Redis DEL failed, falling back to memory', { key, error: message });
    memDel(key);
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const client = await getClient();
  if (useMemFallback || !client) {
    memDelPattern(pattern);
    return;
  }
  try {
    // Use SCAN to avoid blocking with KEYS in production
    const stream = client.scanStream({ match: pattern, count: 100 });
    const pipeline = client.pipeline();
    let pipelineHasCommands = false;

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (keys: string[]) => {
        for (const key of keys) {
          pipeline.del(key);
          pipelineHasCommands = true;
        }
      });
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });

    if (pipelineHasCommands) {
      await pipeline.exec();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Redis DEL pattern failed, falling back to memory', { pattern, error: message });
    memDelPattern(pattern);
  }
}

export async function cacheClose(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('Redis close error', { error: message });
    }
  }
}
