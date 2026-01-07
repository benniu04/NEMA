import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { moviesService } from '../services/movies';
import { watchProgressService, WatchProgressItem } from '../services/watchProgress';
import { useAuth } from '../context/AuthContext';
import HeroSection from '../components/HeroSection';
import CategoryRow from '../components/CategoryRow';
import type { Movie } from '../types';
import type { RootStackScreenProps } from '../navigation/types';

type NavigationProp = RootStackScreenProps<'Main'>['navigation'];

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  const { user } = useAuth();

  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [newReleases, setNewReleases] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [genreMovies, setGenreMovies] = useState<Record<string, Movie[]>>({});
  const [continueWatching, setContinueWatching] = useState<WatchProgressItem[]>([]);
  const [continueWatchingMovies, setContinueWatchingMovies] = useState<Movie[]>([]);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [lastWatchedTitle, setLastWatchedTitle] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load continue watching data
  const loadContinueWatching = useCallback(async () => {
    const progress = await watchProgressService.getContinueWatching();
    setContinueWatching(progress);

    // Fetch full movie data for continue watching items
    if (progress.length > 0) {
      const moviePromises = progress.map(p => moviesService.getMovieById(p.movieId));
      const movies = await Promise.all(moviePromises);
      const validMovies = movies.filter((m): m is Movie => m !== null);
      setContinueWatchingMovies(validMovies);

      // Get similar movies based on most recently watched
      const lastWatched = validMovies[0];
      if (lastWatched) {
        setLastWatchedTitle(lastWatched.title);
        const similar = await moviesService.getSimilarMovies(lastWatched, 10);
        setSimilarMovies(similar);
      }
    } else {
      setContinueWatchingMovies([]);
      setSimilarMovies([]);
      setLastWatchedTitle('');
    }
  }, []);

  // Load all data
  const loadData = async () => {
    try {
      // Load main data in parallel
      const [featured, recommended, trendingData, newReleasesData, topRatedData] = await Promise.all([
        moviesService.getFeaturedMovies(),
        moviesService.getRecommendations(10),
        moviesService.getTrending(10),
        moviesService.getNewReleases(10),
        moviesService.getTopRated(10),
      ]);

      setFeaturedMovies(featured);
      setRecommendations(recommended);
      setTrending(trendingData);
      setNewReleases(newReleasesData);
      setTopRated(topRatedData);

      // Load genre-based rows for user's favorite genres
      if (user?.favoriteGenres && user.favoriteGenres.length > 0) {
        const genrePromises = user.favoriteGenres.slice(0, 3).map(async (genre) => {
          const movies = await moviesService.getMoviesByGenre(genre, 10);
          return { genre, movies };
        });
        const genreResults = await Promise.all(genrePromises);
        const genreMap: Record<string, Movie[]> = {};
        genreResults.forEach(({ genre, movies }) => {
          if (movies.length > 0) {
            genreMap[genre] = movies;
          }
        });
        setGenreMovies(genreMap);
      }

      // Load continue watching
      await loadContinueWatching();
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Refresh continue watching when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      loadContinueWatching();
    }
  }, [isFocused, loadContinueWatching]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleMoviePress = (movie: Movie) => {
    navigation.navigate('MovieDetail', { movieId: movie._id });
  };

  const handlePlayPress = (movie: Movie) => {
    navigation.navigate('VideoPlayer', { movieId: movie._id });
  };

  const handleSearchPress = () => {
    navigation.navigate('Search');
  };

  // Hero featured movie
  const heroMovie = featuredMovies[0];

  // Create progress data map for continue watching
  const progressData: Record<string, number> = {};
  continueWatching.forEach(item => {
    progressData[item.movieId] = item.percentage;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F59E0B"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Auto-Play */}
        {heroMovie && (
          <HeroSection
            movie={heroMovie}
            onPress={() => handleMoviePress(heroMovie)}
            onPlayPress={() => handlePlayPress(heroMovie)}
            onSearchPress={handleSearchPress}
            autoPlayEnabled={true}
            isFocused={isFocused}
          />
        )}

        {/* Continue Watching - First priority */}
        {continueWatchingMovies.length > 0 && (
          <View style={styles.sectionSpacing}>
            <CategoryRow
              title="Continue Watching"
              movies={continueWatchingMovies}
              onMoviePress={handleMoviePress}
              showProgress={true}
              progressData={progressData}
            />
          </View>
        )}

        {/* Trending Now */}
        {trending.length > 0 && (
          <CategoryRow
            title="Trending Now"
            movies={trending}
            onMoviePress={handleMoviePress}
          />
        )}

        {/* New Releases */}
        {newReleases.length > 0 && (
          <CategoryRow
            title="New Releases"
            movies={newReleases}
            onMoviePress={handleMoviePress}
          />
        )}

        {/* Because You Watched [Title] */}
        {similarMovies.length > 0 && lastWatchedTitle && (
          <CategoryRow
            title={`Because You Watched ${lastWatchedTitle}`}
            movies={similarMovies}
            onMoviePress={handleMoviePress}
          />
        )}

        {/* User's Favorite Genres */}
        {Object.entries(genreMovies).map(([genre, movies]) => (
          <CategoryRow
            key={genre}
            title={`${genre} Movies`}
            movies={movies}
            onMoviePress={handleMoviePress}
            onSeeAll={() => navigation.navigate('Main', { screen: 'Catalog' } as any)}
          />
        ))}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <CategoryRow
            title="Recommended For You"
            movies={recommendations}
            onMoviePress={handleMoviePress}
          />
        )}

        {/* Top Rated */}
        {topRated.length > 0 && (
          <CategoryRow
            title="Top Rated"
            movies={topRated}
            onMoviePress={handleMoviePress}
          />
        )}

        {/* More Featured */}
        {featuredMovies.length > 1 && (
          <CategoryRow
            title="Featured"
            movies={featuredMovies.slice(1)}
            onMoviePress={handleMoviePress}
          />
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
  },
  sectionSpacing: {
    marginTop: 24,
  },
  bottomPadding: {
    height: 20,
  },
});

export default HomeScreen;
