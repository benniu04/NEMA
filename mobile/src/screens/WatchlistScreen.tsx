import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import type { Movie } from '../types';
import type { RootStackScreenProps } from '../navigation/types';

type NavigationProp = RootStackScreenProps<'Main'>['navigation'];
const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const CARD_GAP = 12;
const PADDING = 20;
const CARD_WIDTH = (width - PADDING * 2 - CARD_GAP) / COLUMN_COUNT;

const WatchlistScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const watchlistMovies = (user?.watchlist || []).filter(
    (item): item is Movie => typeof item !== 'string'
  );

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  };

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
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.cardGradient}
      />
      <View style={styles.cardInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.movieMeta}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={styles.movieRating}>{(item.rating ?? 0).toFixed(1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Watchlist</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="lock-closed-outline" size={48} color="#4B5563" />
          </View>
          <Text style={styles.emptyTitle}>Sign in to view your watchlist</Text>
          <Text style={styles.emptySubtitle}>
            Keep track of movies you want to watch
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Ionicons name="log-in-outline" size={20} color="#000" />
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Watchlist</Text>
        {watchlistMovies.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{watchlistMovies.length}</Text>
          </View>
        )}
      </View>

      {watchlistMovies.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="bookmark-outline" size={48} color="#4B5563" />
          </View>
          <Text style={styles.emptyTitle}>Your watchlist is empty</Text>
          <Text style={styles.emptySubtitle}>
            Start adding movies you want to watch later
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Main', { screen: 'Catalog' } as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="grid-outline" size={20} color="#000" />
            <Text style={styles.primaryButtonText}>Browse Movies</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={watchlistMovies}
          keyExtractor={(item) => item._id}
          numColumns={COLUMN_COUNT}
          renderItem={renderMovieCard}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F59E0B"
            />
          }
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  countText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  listContent: {
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
    borderRadius: 12,
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
    padding: 12,
  },
  movieTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 18,
  },
  movieMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  movieRating: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
});

export default WatchlistScreen;
