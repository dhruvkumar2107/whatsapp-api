import { Queue, Worker, Job } from 'bullmq'
import { getRedisConnection } from './redis'

export const QUEUE_NAMES = {
  MESSAGES: 'messages',
  CAMPAIGNS: 'campaigns',
  WEBHOOKS: 'webhooks',
  AUTOMATIONS: 'automations',
} as const

export interface QueueJobData {
  id: string
  type: string
  workspaceId?: string
  payload: Record<string, unknown>
  attempts?: number
}

const isRedisAvailable = (): boolean => {
  const url = (process.env.REDIS_URL || '').trim()
  return url.length > 0
}

// Lazy queue initialization — only creates queues when Redis is available
let _queues: Record<string, Queue> | null = null

function getQueues(): Record<string, Queue> {
  if (!isRedisAvailable()) return {}
  if (!_queues) {
    const connection = getRedisConnection()
    _queues = {
      messages: new Queue(QUEUE_NAMES.MESSAGES, { connection }),
      campaigns: new Queue(QUEUE_NAMES.CAMPAIGNS, { connection }),
      webhooks: new Queue(QUEUE_NAMES.WEBHOOKS, { connection }),
      automations: new Queue(QUEUE_NAMES.AUTOMATIONS, { connection }),
      'dead-letter': new Queue('dead-letter', { connection }),
    }
  }
  return _queues
}

export const queues = new Proxy({} as Record<string, Queue>, {
  get(_, prop: string) {
    return getQueues()[prop]
  },
})

export const deadLetterQueue = new Proxy({} as Queue, {
  get(_, prop: string) {
    return (getQueues()['dead-letter'] as unknown as Record<string, unknown>)[prop]
  },
}) as unknown as Queue

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: { age: 86400 },
  removeOnFail: { age: 604800 },
}

export type QueueName = 'messages' | 'campaigns' | 'webhooks' | 'automations' | 'dead-letter'

const QUEUE_MAP: Record<QueueName, string> = {
  messages: QUEUE_NAMES.MESSAGES,
  campaigns: QUEUE_NAMES.CAMPAIGNS,
  webhooks: QUEUE_NAMES.WEBHOOKS,
  automations: QUEUE_NAMES.AUTOMATIONS,
  'dead-letter': 'dead-letter',
}

// Inline processors — used when Redis is unavailable
const inlineProcessors: Record<string, (data: QueueJobData) => Promise<void>> = {}

export function registerInlineProcessor(
  queueName: string,
  processor: (data: QueueJobData) => Promise<void>
): void {
  inlineProcessors[queueName] = processor
}

export async function enqueueJob(
  queueName: QueueName,
  data: QueueJobData,
  options?: { delay?: number; priority?: number }
): Promise<Job<QueueJobData>> {
  // When Redis is unavailable, execute inline (no-op queue, direct processing)
  if (!isRedisAvailable()) {
    const processor = inlineProcessors[queueName] || inlineProcessors[data.type]
    if (processor) {
      // Fire and forget — don't block the caller
      Promise.resolve()
        .then(() => processor(data))
        .catch((err) => {
          console.error(`[Queue:Inline] Job ${data.type} (${data.id}) failed:`, err)
        })
    }
    // Return a mock Job object
    return {
      id: `inline-${data.id}`,
      data,
      name: data.type,
    } as Job<QueueJobData>
  }

  const allQueues = getQueues()
  const queueKey = QUEUE_MAP[queueName]
  const queue = allQueues[queueKey]
  if (!queue) throw new Error(`Queue ${queueName} not found`)
  return queue.add(data.type, data, {
    ...defaultJobOptions,
    ...options,
    jobId: `${data.type}-${data.id}`,
  })
}

export function createWorker(
  queueName: QueueName,
  processor: (job: Job<QueueJobData>) => Promise<void>
): Worker<QueueJobData> {
  // When Redis is unavailable, register as inline processor and return a mock worker
  if (!isRedisAvailable()) {
    console.log(`[Queue] Redis unavailable — registering inline processor for "${queueName}"`)
    // Map queue name to relevant job types
    const typeMap: Record<string, string> = {
      messages: 'process-outgoing',
      campaigns: 'process-campaign',
      webhooks: 'dispatch-webhook',
      automations: 'run-automation',
    }
    const jobType = typeMap[queueName] || queueName
    registerInlineProcessor(jobType, async (data) => {
      const mockJob = { data, id: data.id, name: data.type, attemptsMade: 0, opts: { attempts: 3 } } as Job<QueueJobData>
      await processor(mockJob)
    })
    return { close: async () => {} } as unknown as Worker<QueueJobData>
  }

  const connection = getRedisConnection()
  return new Worker<QueueJobData>(
    queueName,
    async (job) => {
      try {
        await processor(job)
      } catch (error) {
        const allQueues = getQueues()
        if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
          const dlq = allQueues['dead-letter']
          if (dlq) {
            await dlq.add('failed-job', {
              id: job.id?.toString() || 'unknown',
              type: job.name,
              payload: { ...job.data, error: String(error), failedAt: new Date().toISOString() },
            })
          }
        }
        throw error
      }
    },
    {
      connection,
      concurrency: parseInt(process.env[`QUEUE_${queueName.toUpperCase()}_CONCURRENCY`] || '5'),
    }
  )
}

export async function closeAllQueues(): Promise<void> {
  if (!_queues) return
  await Promise.all(
    Object.values(_queues).map((q) => q.close())
  )
  _queues = null
}
