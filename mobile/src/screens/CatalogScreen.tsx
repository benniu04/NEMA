import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { moviesService } from '../services/movies';
import type { Movie } from '../types';
import type { RootStackScreenProps } from '../navigation/types';

type NavigationProp = RootStackScreenProps<'Main'>['navigation'];
const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const CARD_GAP = 10;
const PADDING = 16;
const CARD_WIDTH = (width - PADDING * 2 - CARD_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

const GENRES = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'Action', label: 'Action', icon: 'flash' },
  { id: 'Comedy', label: 'Comedy', icon: 'happy' },
  { id: 'Drama', label: 'Drama', icon: 'heart' },
  { id: 'Horror', label: 'Horror', icon: 'skull' },
  { id: 'Sci-Fi', label: 'Sci-Fi', icon: 'planet' },
  { id: 'Romance', label: 'Romance', icon: 'heart-circle' },
  { id: 'Thriller', label: 'Thriller', icon: 'eye' },
];

const CatalogScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadMovies = useCallback(async () => {
    try {
      const result = await moviesService.getMovies(1, 50);
      setMovies(result.movies);
      setFilteredMovies(result.movies);
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  useEffect(() => {
    if (selectedGenre === 'all') {
      setFilteredMovies(movies);
    } else {
      setFilteredMovies(movies.filter(m => m.genre.includes(selectedGenre)));
    }
  }, [selectedGenre, movies]);

  const renderGenreChip = (genre: typeof GENRES[0]) => (
    <TouchableOpacity
      key={genre.id}
      style={[
        styles.genreChip,
        selectedGenre === genre.id && styles.genreChipActive,
      ]}
      onPress={() => setSelectedGenre(genre.id)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={genre.icon as any}
        size={16}
        color={selectedGenre === genre.id ? '#000' : '#9CA3AF'}
      />
      <Text
        style={[
          styles.genreLabel,
          selectedGenre === genre.id && styles.genreLabelActive,
        ]}
      >
        {genre.label}
      </Text>
    </TouchableOpacity>
  );

  const renderMovieCard = ({ item }: { item: Movie }) => (
    <TouchableOpacity
      style={styles.movieCard}
      onPress={() => navigation.navigate('MovieDetail', { movieId: item._id })}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.posterUrl || item.thumbnailUrl }}
        style={styles.moviePoster}
        contentFit="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.95)']}
        style={styles.cardGradient}
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.cardMeta}>
          <Ionicons name="star" size={10} color="#F59E0B" />
          <Text style={styles.cardRating}>{(item.rating ?? 0).toFixed(1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Browse</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Genre Filter */}
      <View style={styles.genreContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreList}
        >
          {GENRES.map(renderGenreChip)}
        </ScrollView>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredMovies.length} {filteredMovies.length === 1 ? 'movie' : 'movies'}
        </Text>
      </View>

      {/* Movies Grid */}
      <FlatList
        data={filteredMovies}
        keyExtractor={(item) => item._id}
        numColumns={COLUMN_COUNT}
        renderItem={renderMovieCard}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="film-outline" size={48} color="#374151" />
            <Text style={styles.emptyText}>No movies found</Text>
            <Text style={styles.emptySubtext}>Try a different genre</Text>
          </View>
        }
      />
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreContainer: {
    marginBottom: 16,
  },
  genreList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1F1F1F',
    marginRight: 8,
    gap: 6,
  },
  genreChipActive: {
    backgroundColor: '#F59E0B',
  },
  genreLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  genreLabelActive: {
    color: '#000',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  gridContainer: {
    paddingHorizontal: PADDING,
    paddingBottom: 20,
  },
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  movieCard: {
    width: CARD_WIDTH,
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  moviePoster: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 14,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardRating: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
});

export default CatalogScreen;
