// Simple in-process job queue for background jobs.
// In production, replace with BullMQ + Redis. A mock BullMQ-like interface
// (InMemoryQueue) is included so the migration path stays familiar.

type JobHandler = (data: unknown) => Promise<void>

interface QueuedJob {
  id: string
  queueName: string
  data: unknown
  attempts: number
  maxAttempts: number
  addedAt: number
}

const queues: Map<string, JobHandler> = new Map()
const pendingJobs: QueuedJob[] = []
const processing: Set<string> = new Set()
let ticker: ReturnType<typeof setInterval> | null = null
let jobSequence = 0

const DEFAULT_CONCURRENCY = 4
const DEFAULT_MAX_ATTEMPTS = 3
const TICK_INTERVAL_MS = 50
const RETRY_BASE_MS = 1000

function getConcurrency(queueName: string): number {
  const configured = Number(process.env[`QUEUE_${queueName.toUpperCase()}_CONCURRENCY`])
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_CONCURRENCY
}

function startTicker(): void {
  if (ticker) return
  ticker = setInterval(() => {
    void drain()
  }, TICK_INTERVAL_MS)
  if (ticker.unref) ticker.unref()
}

function jobId(): string {
  jobSequence += 1
  return `job_${Date.now().toString(36)}_${jobSequence}`
}

export function createQueue<T>(name: string, handler: (data: T) => Promise<void>): void {
  queues.set(name, handler as JobHandler)
  startTicker()
}

export async function enqueue<T>(queueName: string, data: T): Promise<string> {
  if (!queues.has(queueName)) {
    throw new Error(`No worker registered for queue "${queueName}"`)
  }

  const job: QueuedJob = {
    id: jobId(),
    queueName,
    data,
    attempts: 0,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    addedAt: Date.now(),
  }

  pendingJobs.push(job)
  void drain()
  return job.id
}

export function getQueueSize(queueName?: string): number {
  if (!queueName) return pendingJobs.length
  return pendingJobs.filter((j) => j.queueName === queueName).length
}

async function drain(): Promise<void> {
  const jobs = pendingJobs.splice(0, pendingJobs.length)

  for (const job of jobs) {
    if (processing.size >= getConcurrency(job.queueName)) {
      pendingJobs.push(job)
      continue
    }

    const handler = queues.get(job.queueName)
    if (!handler) {
      pendingJobs.push(job)
      continue
    }

    processing.add(job.id)
    void runJob(job, handler).finally(() => {
      processing.delete(job.id)
      void drain()
    })
  }
}

async function runJob(job: QueuedJob, handler: JobHandler): Promise<void> {
  job.attempts += 1
  try {
    await handler(job.data)
  } catch (error) {
    console.error(`[Queue:${job.queueName}] Job ${job.id} failed:`, error)

    if (job.attempts < job.maxAttempts) {
      const delay = RETRY_BASE_MS * 2 ** (job.attempts - 1)
      scheduleRetry(job, delay)
      return
    }

    console.error(
      `[Queue:${job.queueName}] Job ${job.id} exhausted ${job.maxAttempts} attempts and was dropped`
    )
  }
}

function scheduleRetry(job: QueuedJob, delayMs: number): void {
  const timer = setTimeout(() => {
    pendingJobs.push(job)
    void drain()
  }, delayMs)
  if (timer.unref) timer.unref()
}

// Mock BullMQ-like interface for future migration -----------------------------

interface QueueOptions {
  defaultJobOptions?: {
    attempts?: number
    removeOnComplete?: boolean
    removeOnFail?: boolean
  }
}

interface BulkJobOptions {
  attempts?: number
  delay?: number
  removeOnComplete?: boolean
  removeOnFail?: boolean
}

interface JobToken<T = unknown> {
  id: string
  name: string
  data: T
}

export class InMemoryQueue<T = unknown> {
  readonly name: string
  private readonly handler: JobHandler | null
  private readonly options: QueueOptions
  private readonly jobs: Map<string, JobToken<T>>

  constructor(name: string, options: QueueOptions = {}) {
    this.name = name
    this.handler = null
    this.options = options
    this.jobs = new Map()
  }

  async add(name: string, data: T, _options?: BulkJobOptions): Promise<JobToken<T>> {
    if (!queues.has(this.name)) {
      throw new Error(`No worker registered for queue "${this.name}"`)
    }

    const token: JobToken<T> = { id: jobId(), name, data }
    this.jobs.set(token.id, token)

    await enqueue(this.name, data)
    return token
  }

  async addBulk(
    items: Array<{ name: string; data: T; opts?: BulkJobOptions }>
  ): Promise<JobToken<T>[]> {
    const tokens: JobToken<T>[] = []
    for (const item of items) {
      tokens.push(await this.add(item.name, item.data, item.opts))
    }
    return tokens
  }

  async getJob(id: string): Promise<JobToken<T> | undefined> {
    return this.jobs.get(id)
  }

  async getJobCounts(): Promise<{ waiting: number; active: number; completed: number; failed: number }> {
    return {
      waiting: getQueueSize(this.name),
      active: processing.size,
      completed: 0,
      failed: 0,
    }
  }

  async close(): Promise<void> {
    queues.delete(this.name)
  }
}

export { DEFAULT_CONCURRENCY, DEFAULT_MAX_ATTEMPTS }