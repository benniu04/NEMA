/**
 * Backfill HLS for movies that only have legacy direct-MP4 URLs.
 *
 * Usage:
 *   npx tsx src/scripts/backfill-hls.ts --dry-run
 *   npx tsx src/scripts/backfill-hls.ts --limit 5
 *   npx tsx src/scripts/backfill-hls.ts --id 65abc...
 *
 * Processes movies one at a time (ffmpeg pins a CPU core). Downloads the
 * source MP4 from S3, transcodes to HLS, uploads variants, and updates
 * Movie.videoUrls.hls. Leaves the legacy direct-MP4 fields intact.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Movie } from '../models/movie.model.js';
import { transcodeToHLS } from '../utils/hls-transcoder.js';
import { downloadS3ObjectToFile, uploadFolderToS3Recursive } from '../config/s3.js';
import logger from '../config/logger.js';

interface Args {
  dryRun: boolean;
  limit: number | null;
  movieId: string | null;
}

const parseArgs = (): Args => {
  const argv = process.argv.slice(2);
  const out: Args = { dryRun: false, limit: null, movieId: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--limit') out.limit = parseInt(argv[++i], 10);
    else if (a === '--id') out.movieId = argv[++i];
  }
  return out;
};

const normalizeS3Key = (raw: string): string => {
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) return raw;
  try {
    const u = new URL(raw);
    return u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
  } catch {
    const match = raw.match(/cloudfront\.net\/(.+)$/);
    return match ? match[1] : raw;
  }
};

const pickSourceKey = (videoUrls: Record<string, string | undefined> | undefined): string | null => {
  if (!videoUrls) return null;
  const raw = videoUrls['1080p'] || videoUrls['720p'];
  return raw ? normalizeS3Key(raw) : null;
};

const processMovie = async (
  movie: { _id: mongoose.Types.ObjectId; title?: string; videoUrls?: Record<string, string | undefined> },
  dryRun: boolean
): Promise<void> => {
  const sourceKey = pickSourceKey(movie.videoUrls);
  if (!sourceKey) {
    logger.warn('Skipping movie: no source MP4 key', { movieId: String(movie._id), title: movie.title });
    return;
  }

  logger.info('Backfill: processing movie', {
    movieId: String(movie._id),
    title: movie.title,
    sourceKey,
    dryRun,
  });

  if (dryRun) return;

  const timestamp = Date.now();
  const workRoot = path.join(process.cwd(), 'temp-hls', `backfill-${movie._id}-${timestamp}`);
  const inputPath = path.join(workRoot, 'input' + (path.extname(sourceKey) || '.mp4'));
  const hlsOutputDir = path.join(workRoot, 'hls');

  try {
    fs.mkdirSync(workRoot, { recursive: true });

    logger.info('Backfill: downloading source', { movieId: String(movie._id), sourceKey });
    await downloadS3ObjectToFile(sourceKey, inputPath);

    logger.info('Backfill: transcoding to HLS', { movieId: String(movie._id) });
    const { outputDir, variants } = await transcodeToHLS(inputPath, hlsOutputDir);

    const s3Prefix = `videos/hls/${timestamp}`;
    logger.info('Backfill: uploading HLS to S3', { movieId: String(movie._id), s3Prefix, variants: variants.length });
    await uploadFolderToS3Recursive(outputDir, s3Prefix);

    const hlsKey = `${s3Prefix}/master.m3u8`;
    await Movie.updateOne({ _id: movie._id }, { $set: { 'videoUrls.hls': hlsKey } });

    logger.info('Backfill: done', { movieId: String(movie._id), hlsKey, variants: variants.length });
  } finally {
    if (fs.existsSync(workRoot)) {
      fs.rmSync(workRoot, { recursive: true, force: true });
    }
  }
};

const main = async (): Promise<void> => {
  const args = parseArgs();
  await connectDB();

  const baseQuery = args.movieId
    ? { _id: new mongoose.Types.ObjectId(args.movieId) }
    : {
        $and: [
          { $or: [{ 'videoUrls.hls': { $exists: false } }, { 'videoUrls.hls': '' }, { 'videoUrls.hls': null }] },
          { $or: [{ 'videoUrls.1080p': { $exists: true, $nin: ['', null] } }, { 'videoUrls.720p': { $exists: true, $nin: ['', null] } }] },
        ],
      };

  const cursor = Movie.find(baseQuery).sort({ createdAt: 1 });
  if (args.limit) cursor.limit(args.limit);

  const movies = await cursor.lean<Array<{ _id: mongoose.Types.ObjectId; title?: string; videoUrls?: Record<string, string | undefined> }>>();
  logger.info('Backfill: found movies to process', { count: movies.length, dryRun: args.dryRun });

  let ok = 0;
  let fail = 0;
  for (const m of movies) {
    try {
      await processMovie(m, args.dryRun);
      ok++;
    } catch (err) {
      fail++;
      logger.error('Backfill: movie failed', {
        movieId: String(m._id),
        error: (err as Error).message,
      });
    }
  }

  logger.info('Backfill: run complete', { total: movies.length, ok, fail, dryRun: args.dryRun });
  await mongoose.disconnect();
};

main().catch(async (err) => {
  logger.error('Backfill: fatal error', { error: (err as Error).message, stack: (err as Error).stack });
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
