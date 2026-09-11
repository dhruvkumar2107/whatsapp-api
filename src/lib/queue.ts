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

// Lazy queue initialization — only creates queues when Redis is available
let _queues: Record<string, Queue> | null = null

function getQueues(): Record<string, Queue> {
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

export async function enqueueJob(
  queueName: QueueName,
  data: QueueJobData,
  options?: { delay?: number; priority?: number }
): Promise<Job<QueueJobData>> {
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
