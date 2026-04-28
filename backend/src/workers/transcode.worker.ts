import { Worker, Job } from 'bullmq';
import fs from 'fs';
import path from 'path';
import { Movie } from '../models/movie.model.js';
import {
  TRANSCODE_QUEUE_NAME,
  TranscodeJobData,
  TranscodeJobResult,
  getRedisConnection,
} from '../config/queue.js';
import { transcodeToHLS } from '../utils/hls-transcoder.js';
import { downloadS3ObjectToFile, uploadFolderToS3Recursive } from '../config/s3.js';
import { getIO } from '../config/socket.js';
import logger from '../config/logger.js';

const emitProgress = (userId: string | undefined, jobId: string, event: string, payload: Record<string, unknown>): void => {
  if (!userId) return;
  try {
    getIO().to(`user:${userId}`).emit('transcode:progress', { jobId, event, ...payload });
  } catch {
    // socket may not be initialized yet in some run modes; ignore
  }
};

const processJob = async (job: Job<TranscodeJobData, TranscodeJobResult>): Promise<TranscodeJobResult> => {
  const { originalKey, movieId, userId } = job.data;
  const jobId = String(job.id);

  logger.info('Transcode job started', { jobId, originalKey, movieId });
  emitProgress(userId, jobId, 'started', { originalKey });

  const timestamp = Date.now();
  const workRoot = path.join(process.cwd(), 'temp-hls', `job-${jobId}-${timestamp}`);
  const inputPath = path.join(workRoot, 'input' + path.extname(originalKey));
  const hlsOutputDir = path.join(workRoot, 'hls');

  try {
    fs.mkdirSync(workRoot, { recursive: true });

    await job.updateProgress(5);
    emitProgress(userId, jobId, 'downloading', {});
    await downloadS3ObjectToFile(originalKey, inputPath);

    await job.updateProgress(15);
    emitProgress(userId, jobId, 'transcoding', {});
    const { outputDir, variants } = await transcodeToHLS(inputPath, hlsOutputDir);

    await job.updateProgress(80);
    emitProgress(userId, jobId, 'uploading', { variants: variants.length });
    const s3Prefix = `videos/hls/${timestamp}`;
    await uploadFolderToS3Recursive(outputDir, s3Prefix);

    const hlsKey = `${s3Prefix}/master.m3u8`;

    if (movieId) {
      await Movie.updateOne({ _id: movieId }, { $set: { 'videoUrls.hls': hlsKey } });
    }

    await job.updateProgress(100);
    emitProgress(userId, jobId, 'completed', { hlsKey });
    logger.info('Transcode job completed', { jobId, hlsKey, variants: variants.length });

    return { hlsKey, variantsCount: variants.length };
  } catch (error) {
    const err = error as Error;
    logger.error('Transcode job failed', { jobId, error: err.message, stack: err.stack });
    emitProgress(userId, jobId, 'failed', { error: err.message });
    throw error;
  } finally {
    if (fs.existsSync(workRoot)) {
      fs.rmSync(workRoot, { recursive: true, force: true });
    }
  }
};

let worker: Worker<TranscodeJobData, TranscodeJobResult> | null = null;

export const startTranscodeWorker = (): Worker<TranscodeJobData, TranscodeJobResult> | null => {
  const connection = getRedisConnection();
  if (!connection) {
    logger.warn('REDIS_URL not set; transcode worker not started. Uploads will return 503.');
    return null;
  }
  if (worker) return worker;

  worker = new Worker<TranscodeJobData, TranscodeJobResult>(
    TRANSCODE_QUEUE_NAME,
    processJob,
    {
      connection,
      concurrency: 1,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error('Transcode worker job failed', { jobId: job?.id, error: err.message });
  });
  worker.on('completed', (job) => {
    logger.info('Transcode worker job completed', { jobId: job.id });
  });

  logger.info('Transcode worker started', { queue: TRANSCODE_QUEUE_NAME });
  return worker;
};
