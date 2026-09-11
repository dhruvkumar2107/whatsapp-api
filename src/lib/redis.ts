import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis }

function createRedisConnection(): Redis {
  const url = (process.env.REDIS_URL || '').trim()
  if (!url) {
    // Return a mock Redis that silently no-ops when no Redis is configured
    return {
      get: async () => null,
      set: async () => 'OK',
      del: async () => 0,
      keys: async () => [],
      on: () => ({} as Redis),
    } as unknown as Redis
  }
  
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
    retryStrategy(times: number) {
      if (times > 10) return null // Stop retrying
      const delay = Math.min(times * 50, 2000)
      return delay
    },
  })
  
  // Suppress unhandled error events in non-production
  if (process.env.NODE_ENV !== 'production') {
    client.on('error', () => {})
  }
  
  return client
}

export const redis = globalForRedis.redis || createRedisConnection()

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

export default redis

const globalForBullmq = globalThis as unknown as { bullmqConnection: Redis }

function createBullmqConnection(): Redis {
  const url = (process.env.REDIS_URL || '').trim()
  if (!url) {
    return {
      get: async () => null,
      set: async () => 'OK',
      del: async () => 0,
      keys: async () => [],
      on: () => ({} as Redis),
    } as unknown as Redis
  }
  
  const client = new Redis(url, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy(times: number) {
      if (times > 10) return null
      const delay = Math.min(times * 50, 2000)
      return delay
    },
  })
  
  if (process.env.NODE_ENV !== 'production') {
    client.on('error', () => {})
  }
  
  return client
}

export function getRedisConnection(): Redis {
  if (!globalForBullmq.bullmqConnection) {
    globalForBullmq.bullmqConnection = createBullmqConnection()
  }
  return globalForBullmq.bullmqConnection
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key)
    return data ? (JSON.parse(data) as T) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch {
    // Silently fail - cache is optional
  }
}

export async function cacheDel(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch {
    // Silently fail
  }
}
