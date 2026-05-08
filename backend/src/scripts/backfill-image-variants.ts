/**
 * Backfill image variants (_thumb, _medium) for existing movie posters.
 *
 * Usage:
 *   npx tsx src/scripts/backfill-image-variants.ts --dry-run
 *   npx tsx src/scripts/backfill-image-variants.ts --limit 50
 *   npx tsx src/scripts/backfill-image-variants.ts --id 65abc...
 *   npx tsx src/scripts/backfill-image-variants.ts --concurrency 4
 *
 * For every Movie with a posterKey but no `hasImageVariants` flag,
 * downloads the original from S3, generates 200w + 400w JPEG variants
 * via Sharp, uploads them alongside the original, and flips the flag.
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Movie } from '../models/movie.model.js';
import { generateImageVariants } from '../utils/imageVariants.js';
import logger from '../config/logger.js';

interface Args {
  dryRun: boolean;
  limit: number | null;
  movieId: string | null;
  concurrency: number;
}

const parseArgs = (): Args => {
  const argv = process.argv.slice(2);
  const out: Args = { dryRun: false, limit: null, movieId: null, concurrency: 2 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--limit') out.limit = parseInt(argv[++i], 10);
    else if (a === '--id') out.movieId = argv[++i];
    else if (a === '--concurrency') out.concurrency = Math.max(1, parseInt(argv[++i], 10) || 1);
  }
  return out;
};

const processOne = async (movieId: string, posterKey: string, dryRun: boolean): Promise<boolean> => {
  if (dryRun) {
    logger.info('[dry-run] would generate variants', { movieId, posterKey });
    return true;
  }
  const ok = await generateImageVariants(posterKey);
  if (!ok) {
    logger.warn('Variant generation failed; leaving flag unset', { movieId, posterKey });
    return false;
  }
  await Movie.updateOne({ _id: movieId }, { $set: { hasImageVariants: true } });
  logger.info('Variants generated and flag set', { movieId, posterKey });
  return true;
};

const runPool = async <T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> => {
  let cursor = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
};

const main = async (): Promise<void> => {
  const args = parseArgs();
  await connectDB();

  const filter: Record<string, unknown> = {
    posterKey: { $nin: [null, ''] },
    hasImageVariants: { $ne: true },
  };
  if (args.movieId) filter._id = new mongoose.Types.ObjectId(args.movieId);

  let query = Movie.find(filter).select('_id posterKey').lean();
  if (args.limit) query = query.limit(args.limit);
  const candidates = await query;

  logger.info('Backfill candidates', { count: candidates.length, dryRun: args.dryRun, concurrency: args.concurrency });

  let succeeded = 0;
  let failed = 0;
  await runPool(candidates, args.concurrency, async (movie) => {
    const posterKey = (movie as { posterKey?: string }).posterKey;
    if (!posterKey) return;
    const ok = await processOne(String(movie._id), posterKey, args.dryRun);
    if (ok) succeeded++;
    else failed++;
  });

  logger.info('Backfill complete', { succeeded, failed, total: candidates.length });
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch((err) => {
  logger.error('Backfill crashed', { error: (err as Error).message, stack: (err as Error).stack });
  process.exit(1);
});
