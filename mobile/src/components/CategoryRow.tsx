import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MovieCard, { CardSize } from './MovieCard';
import type { Movie, WatchProgressItem } from '../types';

interface CategoryRowProps {
  title: string;
  movies: Movie[];
  onMoviePress: (movie: Movie) => void;
  onSeeAll?: () => void;
  cardSize?: CardSize;
  showProgress?: boolean;
  progressData?: Record<string, number>; // movieId -> percentage
  emptyMessage?: string;
}

const CategoryRow: React.FC<CategoryRowProps> = ({
  title,
  movies,
  onMoviePress,
  onSeeAll,
  cardSize = 'medium',
  showProgress = false,
  progressData = {},
  emptyMessage = 'No movies available',
}) => {
  if (movies.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {movies.map((movie) => (
          <MovieCard
            key={movie._id}
            movie={movie}
            onPress={() => onMoviePress(movie)}
            size={cardSize}
            showProgress={showProgress}
            progressPercentage={progressData[movie._id] || 0}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
});

export default CategoryRow;
