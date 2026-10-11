import { Queue, Worker, Job } from 'bullmq';
import { cacheService } from './cacheService';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Parse Redis connection options for BullMQ
function getRedisOptions() {
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname || '127.0.0.1',
      port: Number(url.port) || 6379,
      password: url.password || undefined,
      maxRetriesPerRequest: null,
      connectTimeout: 2000,
    };
  } catch {
    return {
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}

type JobHandler = (data: any) => Promise<any>;

class ResilientQueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private localHandlers: Map<string, JobHandler> = new Map();

  registerJobType(queueName: string, handler: JobHandler) {
    this.localHandlers.set(queueName, handler);

    // Only instantiate BullMQ if Redis is active
    if (cacheService.isOnline()) {
      try {
        const connection = getRedisOptions();
        const queue = new Queue(queueName, { connection });
        const worker = new Worker(queueName, async (job: Job) => {
          return handler(job.data);
        }, { connection });

        worker.on('failed', (job, err) => {
          console.warn(`⚠️ BullMQ Job ${job?.id} in queue [${queueName}] failed:`, err.message);
        });

        this.queues.set(queueName, queue);
        this.workers.set(queueName, worker);
        console.log(`⚡ BullMQ Queue [${queueName}] initialized.`);
      } catch (err: any) {
        console.warn(`ℹ️ BullMQ fallback to local worker for [${queueName}]:`, err.message);
      }
    }
  }

  async addJob(queueName: string, data: any): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue && cacheService.isOnline()) {
      try {
        await queue.add(`${queueName}-task`, data, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: 100,
        });
        return;
      } catch (err: any) {
        // Fall back to immediate async in-process execution
      }
    }

    // Direct asynchronous execution fallback
    const handler = this.localHandlers.get(queueName);
    if (handler) {
      setImmediate(async () => {
        try {
          await handler(data);
        } catch (execErr: any) {
          console.warn(`⚠️ In-process fallback task [${queueName}] error:`, execErr.message);
        }
      });
    }
  }
}

export const queueManager = new ResilientQueueManager();
