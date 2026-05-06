/**
 * Seed a load-test MongoDB cluster with movies + users.
 *
 * Usage:
 *   LOADTEST_MONGO_URL='mongodb+srv://...' tsx src/scripts/seed-loadtest.ts
 *
 * Writes fixtures (movie ids + user credentials) to ../../loadtest/fixtures.json
 * for k6 scenarios to consume. Idempotent: clears any prior loadtest data first.
 */
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { Movie } from '../models/movie.model.js';
import { User } from '../models/user.model.js';

const NUM_MOVIES = 50;
const NUM_USERS = 100;
const PASSWORD = 'LoadTest123!';

const GENRES = ['Drama', 'Thriller', 'Sci-Fi', 'Romance', 'Comedy', 'Horror', 'Documentary', 'Action'];
const DIRECTORS = ['Wong Kar-wai', 'Agnès Varda', 'Andrei Tarkovsky', 'Chantal Akerman', 'Hayao Miyazaki', 'Kelly Reichardt'];

const pickN = <T,>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};

const uri = process.env.LOADTEST_MONGO_URL;
if (!uri) {
  console.error('LOADTEST_MONGO_URL is required. Refusing to seed without an explicit staging URI.');
  process.exit(1);
}
if (uri.includes('prod') || uri.includes('production')) {
  console.error('LOADTEST_MONGO_URL looks like production. Aborting.');
  process.exit(1);
}

const main = async (): Promise<void> => {
  console.log('Connecting to staging cluster...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  console.log('Clearing existing loadtest data...');
  await Movie.deleteMany({ tags: 'loadtest' });
  await User.deleteMany({ email: /^loadtest\d+@example\.com$/ });

  console.log(`Inserting ${NUM_MOVIES} movies...`);
  const movieDocs = Array.from({ length: NUM_MOVIES }, (_, i) => ({
    title: `Loadtest Film ${i + 1}`,
    description: `A synthetic film for capacity testing. Index ${i}.`,
    rating: 5 + (i % 5),
    releaseDate: new Date(2000 + (i % 25), i % 12, 1),
    genre: pickN(GENRES, 1 + (i % 3)),
    director: DIRECTORS[i % DIRECTORS.length],
    cast: [`Actor ${i}A`, `Actor ${i}B`, `Actor ${i}C`],
    language: 'English',
    isFeatured: i % 5 === 0,
    isHero: i === 0,
    tags: ['loadtest'],
  }));
  const movies = await Movie.insertMany(movieDocs);
  const movieIds = movies.map(m => m._id.toString());
  console.log(`  inserted ${movies.length} movies`);

  console.log(`Inserting ${NUM_USERS} users (bcrypt is slow — ~30s expected)...`);
  const users: { email: string; username: string; password: string }[] = [];
  for (let i = 1; i <= NUM_USERS; i++) {
    const email = `loadtest${i}@example.com`;
    const username = `loadtester${i}`;
    await User.create({ email, username, password: PASSWORD, displayName: username });
    users.push({ email, username, password: PASSWORD });
    if (i % 20 === 0) console.log(`  ${i}/${NUM_USERS}`);
  }

  const fixturesPath = path.resolve(process.cwd(), '..', 'loadtest', 'fixtures.json');
  fs.mkdirSync(path.dirname(fixturesPath), { recursive: true });
  fs.writeFileSync(fixturesPath, JSON.stringify({ movieIds, users }, null, 2));
  console.log(`Wrote fixtures to ${fixturesPath}`);

  await mongoose.disconnect();
  console.log('Done.');
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
