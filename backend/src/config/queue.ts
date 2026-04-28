import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { ENV_VARS } from './envVars.js';
import logger from './logger.js';

export const TRANSCODE_QUEUE_NAME = 'video-transcode';

export interface TranscodeJobData {
  originalKey: string;
  movieId?: string;
  userId?: string;
}

export interface TranscodeJobResult {
  hlsKey: string;
  variantsCount: number;
}

let redisConnection: Redis | null = null;
let transcodeQueue: Queue<TranscodeJobData, TranscodeJobResult> | null = null;

export const getRedisConnection = (): Redis | null => {
  if (!ENV_VARS.REDIS_URL) return null;
  if (!redisConnection) {
    redisConnection = new Redis(ENV_VARS.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    redisConnection.on('error', (err: Error) => {
      logger.error('Redis connection error', { error: err.message });
    });
  }
  return redisConnection;
};

export const getTranscodeQueue = (): Queue<TranscodeJobData, TranscodeJobResult> | null => {
  const conn = getRedisConnection();
  if (!conn) return null;
  if (!transcodeQueue) {
    transcodeQueue = new Queue<TranscodeJobData, TranscodeJobResult>(TRANSCODE_QUEUE_NAME, {
      connection: conn,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return transcodeQueue;
};
