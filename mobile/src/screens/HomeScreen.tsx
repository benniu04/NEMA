import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
const CARD_WIDTH = width * 0.38;
const FEATURED_HEIGHT = 420;

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [featured, recommended, allMovies] = await Promise.all([
        moviesService.getFeaturedMovies(),
        moviesService.getRecommendations(10),
        moviesService.getMovies(1, 20),
      ]);
      setFeaturedMovies(featured);
      setRecommendations(recommended);
      setMovies(allMovies.movies);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Hero featured movie
  const heroMovie = featuredMovies[0] || movies[0];

  const renderMovieCard = (item: Movie, large = false) => (
    <TouchableOpacity
      key={item._id}
      style={[styles.movieCard, large && styles.movieCardLarge]}
      onPress={() => navigation.navigate('MovieDetail', { movieId: item._id })}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.posterUrl || item.thumbnailUrl }}
        style={[styles.moviePoster, large && styles.moviePosterLarge]}
        contentFit="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.cardGradient}
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.cardMeta}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={styles.cardRating}>{(item.rating ?? 0).toFixed(1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSection = (title: string, data: Movie[], showAll?: () => void) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {showAll && (
          <TouchableOpacity onPress={showAll}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {data.map((item) => renderMovieCard(item))}
      </ScrollView>
    </View>
  );

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
        {/* Hero Section */}
        {heroMovie && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('MovieDetail', { movieId: heroMovie._id })}
          >
            <View style={styles.heroContainer}>
              <Image
                source={{ uri: heroMovie.posterUrl || heroMovie.thumbnailUrl }}
                style={styles.heroPoster}
                contentFit="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(15,15,15,0.8)', '#0F0F0F']}
                style={styles.heroGradient}
              />
              <SafeAreaView style={styles.header} edges={['top']}>
                <Text style={styles.logo}>NEMA</Text>
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={() => navigation.navigate('Search')}
                >
                  <Ionicons name="search" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </SafeAreaView>
              <View style={styles.heroContent}>
                <View style={styles.heroGenres}>
                  {heroMovie.genre?.slice(0, 3).map((g, i) => (
                    <Text key={g} style={styles.heroGenre}>
                      {g}{i < Math.min(heroMovie.genre.length, 3) - 1 ? ' • ' : ''}
                    </Text>
                  ))}
                </View>
                <Text style={styles.heroTitle}>{heroMovie.title}</Text>
                <View style={styles.heroMeta}>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={14} color="#000" />
                    <Text style={styles.ratingText}>{(heroMovie.rating ?? 0).toFixed(1)}</Text>
                  </View>
                  <Text style={styles.heroYear}>
                    {new Date(heroMovie.releaseDate).getFullYear()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => navigation.navigate('MovieDetail', { movieId: heroMovie._id })}
                >
                  <Ionicons name="play" size={20} color="#000" />
                  <Text style={styles.playButtonText}>Watch Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && renderSection('Recommended For You', recommendations)}

        {/* All Movies */}
        {movies.length > 0 && renderSection(
          'Popular Movies',
          movies,
          () => navigation.navigate('Main', { screen: 'Catalog' } as any)
        )}

        {/* More Featured */}
        {featuredMovies.length > 1 && renderSection('Featured', featuredMovies.slice(1))}

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
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    zIndex: 10,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F59E0B',
    letterSpacing: 2,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContainer: {
    height: FEATURED_HEIGHT,
    position: 'relative',
  },
  heroPoster: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  heroContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  heroGenres: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  heroGenre: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 12,
  },
  ratingText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
  },
  heroYear: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignSelf: 'flex-start',
  },
  playButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  seeAll: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  horizontalList: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  movieCard: {
    width: CARD_WIDTH,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  movieCardLarge: {
    width: CARD_WIDTH * 1.3,
  },
  moviePoster: {
    width: '100%',
    height: CARD_WIDTH * 1.5,
    borderRadius: 12,
  },
  moviePosterLarge: {
    height: CARD_WIDTH * 1.8,
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRating: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    marginLeft: 4,
  },
  bottomPadding: {
    height: 20,
  },
});

export default HomeScreen;
