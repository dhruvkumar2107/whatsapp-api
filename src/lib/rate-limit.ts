import { redis } from './redis'

// In-memory fallback for environments without Redis (single instance only)
const memoryStore = new Map<string, { count: number; resetAt: number }>()
const CLEANUP_INTERVAL_MS = 60_000
let lastCleanup = Date.now()

function cleanupMemory() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, entry] of memoryStore) {
    if (entry.resetAt <= now) memoryStore.delete(key)
  }
}

// Detect if Redis is actually connected (not a mock)
function isRedisAvailable(): boolean {
  try {
    return typeof redis.get === 'function' && !!(redis as unknown as { status?: string }).status
  } catch {
    return false
  }
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now()

  if (isRedisAvailable()) {
    try {
      const redisKey = `ratelimit:${key}`
      const pipeline = redis.pipeline()
      pipeline.incr(redisKey)
      pipeline.pexpire(redisKey, windowMs)
      pipeline.pttl(redisKey)
      const results = await pipeline.exec()

      const count = Number(results?.[0]?.[1] ?? 1)
      const ttl = Number(results?.[2]?.[1] ?? windowMs)
      const resetAt = now + (ttl > 0 ? ttl : windowMs)

      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt,
      }
    } catch {
      // Fall through to in-memory if Redis fails
    }
  }

  // In-memory fallback (single instance only)
  cleanupMemory()
  const entry = memoryStore.get(key)

  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  entry.count += 1
  const remaining = Math.max(0, limit - entry.count)

  return {
    allowed: entry.count <= limit,
    remaining,
    resetAt: entry.resetAt,
  }
}
