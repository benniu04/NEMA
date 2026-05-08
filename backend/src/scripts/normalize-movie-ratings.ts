/**
 * Normalize legacy movie ratings from a 0-10 scale to a 0-5 scale.
 *
 * Background: the Movie schema historically allowed `max: 10` while reviews
 * were always 1-5. Movies that had been rated by reviews got recomputed to
 * the 0-5 scale via `recomputeAvg` in reviews.routes.ts; movies that were
 * seeded with a hardcoded 0-10 rating (or never reviewed) were left on the
 * old scale, producing the visible mismatch where some films display "8.5"
 * and others "4.2".
 *
 * This script finds every movie whose `rating > 5` and divides by 2,
 * rounded to one decimal place. Idempotent: running it twice on a
 * normalized DB is a no-op (no rows match the filter the second time).
 *
 * Usage:
 *   npx tsx src/scripts/normalize-movie-ratings.ts --dry-run
 *   npx tsx src/scripts/normalize-movie-ratings.ts
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Movie } from '../models/movie.model.js';
import logger from '../config/logger.js';

interface Args {
  dryRun: boolean;
}

const parseArgs = (): Args => {
  const argv = process.argv.slice(2);
  return { dryRun: argv.includes('--dry-run') };
};

const main = async (): Promise<void> => {
  const { dryRun } = parseArgs();
  await connectDB();

  const candidates = await Movie.find({ rating: { $gt: 5 } })
    .select('_id title rating')
    .lean();

  logger.info('Rating normalization candidates', { count: candidates.length, dryRun });

  if (candidates.length === 0) {
    logger.info('Nothing to normalize — all movies already on the 0-5 scale.');
    await mongoose.disconnect();
    return;
  }

  for (const movie of candidates) {
    const oldRating = (movie as { rating: number }).rating;
    const newRating = Math.round((oldRating / 2) * 10) / 10;
    const title = (movie as { title?: string }).title ?? '<no title>';

    if (dryRun) {
      logger.info('[dry-run] would normalize', { id: String(movie._id), title, oldRating, newRating });
      continue;
    }

    // Bypass validation: we already constrain the new value to <= 5 by
    // construction, and we want this to keep working even after the schema
    // tightens to max: 5 (which it has).
    await Movie.updateOne({ _id: movie._id }, { $set: { rating: newRating } });
    logger.info('Normalized', { id: String(movie._id), title, oldRating, newRating });
  }

  logger.info('Normalization complete', { processed: candidates.length, dryRun });
  await mongoose.disconnect();
};

main().catch((err) => {
  logger.error('Normalization crashed', { error: (err as Error).message, stack: (err as Error).stack });
  process.exit(1);
});
