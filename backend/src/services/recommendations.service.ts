import mongoose from 'mongoose';
import { WatchTime } from '../models/watchTime.model.js';
import { Movie } from '../models/movie.model.js';
import type { IMovie } from '../types/index.js';

export interface TasteProfile {
  topGenres: string[];
  topDirectors: string[];
  watchedMovieIds: mongoose.Types.ObjectId[];
}

export interface RecommendationIdentity {
  userId?: string;
  deviceId?: string;
}

interface FacetGenreBucket { _id: string; weight: number }
interface FacetDirectorBucket { _id: string; weight: number }
interface FacetResult {
  genres: FacetGenreBucket[];
  directors: FacetDirectorBucket[];
  watched: Array<{ _id: mongoose.Types.ObjectId }>;
}

const buildIdentityMatch = (identity: RecommendationIdentity): Record<string, unknown> | null => {
  if (identity.userId) {
    return { userId: new mongoose.Types.ObjectId(identity.userId) };
  }
  if (identity.deviceId) {
    return { deviceId: identity.deviceId };
  }
  return null;
};

export const getUserTasteProfile = async (identity: RecommendationIdentity): Promise<TasteProfile> => {
  const match = buildIdentityMatch(identity);
  if (!match) {
    return { topGenres: [], topDirectors: [], watchedMovieIds: [] };
  }

  const [result] = await WatchTime.aggregate<FacetResult>([
    { $match: match },
    {
      $lookup: {
        from: 'movies',
        localField: 'movieId',
        foreignField: '_id',
        as: 'movie'
      }
    },
    { $unwind: '$movie' },
    {
      $project: {
        movieId: 1,
        genres: '$movie.genre',
        director: '$movie.director',
        weight: { $divide: [{ $ifNull: ['$completionPercentage', 0] }, 100] }
      }
    },
    {
      $facet: {
        genres: [
          { $unwind: '$genres' },
          { $group: { _id: '$genres', weight: { $sum: '$weight' } } },
          { $match: { _id: { $ne: null } } },
          { $sort: { weight: -1 } },
          { $limit: 5 }
        ],
        directors: [
          { $match: { director: { $ne: null } } },
          { $group: { _id: '$director', weight: { $sum: '$weight' } } },
          { $sort: { weight: -1 } },
          { $limit: 3 }
        ],
        watched: [
          { $group: { _id: '$movieId' } }
        ]
      }
    }
  ]);

  if (!result) {
    return { topGenres: [], topDirectors: [], watchedMovieIds: [] };
  }

  return {
    topGenres: result.genres.filter(g => g.weight > 0).map(g => g._id),
    topDirectors: result.directors.filter(d => d.weight > 0).map(d => d._id),
    watchedMovieIds: result.watched.map(w => w._id)
  };
};

export interface ScoreMoviesOptions {
  topGenres: string[];
  topDirectors: string[];
  excludeMovieIds: mongoose.Types.ObjectId[];
  limit: number;
}

export const scoreMoviesByTaste = async (opts: ScoreMoviesOptions): Promise<IMovie[]> => {
  const { topGenres, topDirectors, excludeMovieIds, limit } = opts;

  if (topGenres.length === 0 && topDirectors.length === 0) {
    return [];
  }

  return Movie.aggregate<IMovie>([
    { $match: { _id: { $nin: excludeMovieIds } } },
    {
      $addFields: {
        genreScore: {
          $size: {
            $ifNull: [{ $setIntersection: [{ $ifNull: ['$genre', []] }, topGenres] }, []]
          }
        },
        directorScore: {
          $cond: [{ $in: [{ $ifNull: ['$director', null] }, topDirectors] }, 2, 0]
        }
      }
    },
    { $addFields: { totalScore: { $add: ['$genreScore', '$directorScore'] } } },
    { $match: { totalScore: { $gt: 0 } } },
    { $sort: { totalScore: -1, rating: -1, views: -1 } },
    { $limit: limit }
  ]);
};

export const getBehaviorRecommendations = async (
  identity: RecommendationIdentity,
  limit: number
): Promise<{ movies: IMovie[]; profile: TasteProfile }> => {
  const profile = await getUserTasteProfile(identity);
  const movies = await scoreMoviesByTaste({
    topGenres: profile.topGenres,
    topDirectors: profile.topDirectors,
    excludeMovieIds: profile.watchedMovieIds,
    limit
  });
  return { movies, profile };
};
