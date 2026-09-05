/**
 * Bull when REDIS_URL is set, an in-process queue otherwise.
 *
 * The in-process queue is not a toy: rendering is CPU-bound and a single
 * Railway/Render container can only usefully run one render at a time, so a
 * serial in-memory queue is the right default. Redis buys durability across
 * restarts and lets the worker scale out to its own service.
 */
import Bull from "bull";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

export interface QueuedJob<T> {
  id: string;
  data: T;
}

export interface JobQueue<T> {
  readonly kind: "redis" | "memory";
  add(id: string, data: T): Promise<void>;
  process(handler: (job: QueuedJob<T>) => Promise<void>): void;
  close(): Promise<void>;
}

class MemoryQueue<T> implements JobQueue<T> {
  readonly kind = "memory" as const;
  private readonly pending: QueuedJob<T>[] = [];
  private handler: ((job: QueuedJob<T>) => Promise<void>) | null = null;
  private draining = false;

  async add(id: string, data: T): Promise<void> {
    this.pending.push({ id, data });
    void this.drain();
  }

  process(handler: (job: QueuedJob<T>) => Promise<void>): void {
    this.handler = handler;
    void this.drain();
  }

  async close(): Promise<void> {
    this.pending.length = 0;
  }

  private async drain(): Promise<void> {
    if (this.draining || !this.handler) return;
    this.draining = true;
    try {
      while (this.pending.length > 0) {
        const job = this.pending.shift();
        if (!job) break;
        try {
          await this.handler(job);
        } catch (error) {
          // The handler owns failure reporting; the queue must keep draining.
          logger.error({ error, jobId: job.id }, "queued job threw");
        }
      }
    } finally {
      this.draining = false;
    }
  }
}

class RedisQueue<T> implements JobQueue<T> {
  readonly kind = "redis" as const;
  private readonly queue: Bull.Queue<T>;

  constructor(name: string, redisUrl: string) {
    this.queue = new Bull<T>(name, redisUrl, {
      defaultJobOptions: {
        attempts: 1,
        // A render that has not finished in ten minutes is stuck, not slow:
        // the worst measured job is under three. Without a cap a wedged
        // headless Chrome holds the single-concurrency queue indefinitely.
        timeout: 10 * 60 * 1000,
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    });
    this.queue.on("error", (error) => logger.error({ error }, "bull error"));
  }

  async add(id: string, data: T): Promise<void> {
    await this.queue.add(data, { jobId: id });
  }

  process(handler: (job: QueuedJob<T>) => Promise<void>): void {
    void this.queue.process(1, async (job) => {
      await handler({ id: String(job.id), data: job.data });
    });
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

export function createQueue<T>(name: string): JobQueue<T> {
  if (env.redisUrl) {
    logger.info({ name }, "using redis-backed queue");
    return new RedisQueue<T>(name, env.redisUrl);
  }
  logger.info({ name }, "REDIS_URL unset - using in-process queue");
  return new MemoryQueue<T>();
}
