import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { moviesService } from '../services/movies';
import { useAuth } from '../context/AuthContext';
import { useDownloads } from '../context/DownloadsContext';
import type { Movie, Review } from '../types';
import type { RootStackScreenProps } from '../navigation/types';

type Props = RootStackScreenProps<'MovieDetail'>;
const { width, height } = Dimensions.get('window');
const POSTER_HEIGHT = height * 0.55;

const MovieDetailScreen = ({ route, navigation }: Props) => {
  const { movieId } = route.params;
  const { user, refreshUser, isAuthenticated } = useAuth();
  const downloadsCtx = useDownloads();
  const downloadEntry = downloadsCtx.getDownload(movieId);
  const activeDownload = downloadsCtx.getActiveDownload(movieId);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isInFavorites, setIsInFavorites] = useState(false);

  useEffect(() => {
    loadMovie();
  }, [movieId]);

  useEffect(() => {
    if (user && movie) {
      const watchlistIds = (user.watchlist || []).map((m) =>
        typeof m === 'string' ? m : m._id
      );
      const favoriteIds = (user.favoriteFilms || []).map((m) =>
        typeof m === 'string' ? m : m._id
      );
      setIsInWatchlist(watchlistIds.includes(movie._id));
      setIsInFavorites(favoriteIds.includes(movie._id));
    }
  }, [user, movie]);

  const loadMovie = async () => {
    try {
      const [movieData, reviewsData] = await Promise.all([
        moviesService.getMovieById(movieId),
        moviesService.getMovieReviews(movieId),
      ]);
      setMovie(movieData);
      setReviews(reviewsData.reviews || []);
    } catch (error) {
      console.error('Error loading movie:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWatchlistToggle = async () => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    if (!movie) return;
    try {
      if (isInWatchlist) {
        await moviesService.removeFromWatchlist(movie._id);
        setIsInWatchlist(false);
      } else {
        await moviesService.addToWatchlist(movie._id);
        setIsInWatchlist(true);
      }
      refreshUser();
    } catch (error) {
      Alert.alert('Error', 'Failed to update watchlist');
    }
  };

  const handleFavoriteToggle = async () => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    if (!movie) return;
    try {
      if (isInFavorites) {
        await moviesService.removeFromFavorites(movie._id);
        setIsInFavorites(false);
      } else {
        await moviesService.addToFavorites(movie._id);
        setIsInFavorites(true);
      }
      refreshUser();
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  const handleDownloadPress = () => {
    if (!movie) return;

    if (!isAuthenticated) {
      Alert.alert(
        'Sign in required',
        'You need an account to download movies for offline viewing.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign in', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    if (downloadEntry) {
      Alert.alert(
        'Delete download?',
        `Remove "${movie.title}" from your downloads. You can re-download it later.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => downloadsCtx.deleteDownload(movie._id),
          },
        ]
      );
      return;
    }

    if (activeDownload) {
      Alert.alert(
        'Cancel download?',
        `Stop downloading "${movie.title}"?`,
        [
          { text: 'Keep downloading', style: 'cancel' },
          {
            text: 'Cancel download',
            style: 'destructive',
            onPress: () => downloadsCtx.cancelDownload(movie._id),
          },
        ]
      );
      return;
    }

    // Check if movie has a downloadable source.
    const hasDownloadableSource = !!(
      movie.videoUrls?.['1080p']?.trim() || movie.videoUrls?.['720p']?.trim()
    );
    if (!hasDownloadableSource) {
      Alert.alert(
        'Not available for download',
        'This movie is not available for offline viewing.'
      );
      return;
    }

    downloadsCtx.startDownload(movie).catch((error) => {
      const message =
        error?.response?.status === 429
          ? 'You\'ve hit the download limit. Try again later.'
          : 'Could not start the download. Please try again.';
      Alert.alert('Download failed', message);
    });
  };

  const handleWatchNow = () => {
    if (!movie) return;

    // Check if video is available
    const hasVideo = movie.videoUrls && Object.values(movie.videoUrls).some(url => url);
    if (!hasVideo) {
      Alert.alert(
        'Video Unavailable',
        'This movie is not available for streaming yet.',
        [{ text: 'OK' }]
      );
      return;
    }

    navigation.navigate('VideoPlayer', { movieId: movie._id });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Movie not found</Text>
      </View>
    );
  }

  const releaseYear = new Date(movie.releaseDate).getFullYear();
  const duration = movie.duration ? `${Math.floor(movie.duration / 60)}h ${movie.duration % 60}m` : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Hero Poster Section */}
        <View style={styles.posterContainer}>
          <Image
            source={{ uri: movie.posterUrl || movie.thumbnailUrl }}
            style={styles.poster}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(15,15,15,0.6)', '#0F0F0F']}
            style={styles.posterGradient}
          />

          {/* Play Button Overlay */}
          <TouchableOpacity style={styles.playButton} activeOpacity={0.9} onPress={handleWatchNow}>
            <View style={styles.playButtonInner}>
              <Ionicons name="play" size={32} color="#000" style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title & Rating Row */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{movie.title}</Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#000" />
              <Text style={styles.ratingText}>{(movie.rating ?? 0).toFixed(1)}</Text>
            </View>
          </View>

          {/* Meta Info */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{releaseYear}</Text>
            <View style={styles.metaDot} />
            {duration && (
              <>
                <Text style={styles.metaText}>{duration}</Text>
                <View style={styles.metaDot} />
              </>
            )}
            <Text style={styles.metaText}>{movie.language}</Text>
          </View>

          {/* Genre Tags */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreContainer}
          >
            {movie.genre.map((g) => (
              <View key={g} style={styles.genreBadge}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Watch Now (full-width primary action) */}
          <TouchableOpacity
            style={styles.watchNowButton}
            activeOpacity={0.8}
            onPress={handleWatchNow}
          >
            <Ionicons name="play" size={22} color="#000" />
            <Text style={styles.watchNowText}>Watch Now</Text>
          </TouchableOpacity>

          {/* Secondary actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.iconButton, isInWatchlist && styles.iconButtonActive]}
              onPress={handleWatchlistToggle}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isInWatchlist ? "bookmark" : "bookmark-outline"}
                size={22}
                color={isInWatchlist ? "#F59E0B" : "#FFFFFF"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, isInFavorites && styles.iconButtonActive]}
              onPress={handleFavoriteToggle}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isInFavorites ? "heart" : "heart-outline"}
                size={22}
                color={isInFavorites ? "#EF4444" : "#FFFFFF"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleDownloadPress}
              activeOpacity={0.7}
              accessibilityLabel={
                downloadEntry
                  ? 'Downloaded — tap to remove'
                  : activeDownload
                    ? `Downloading ${Math.round(activeDownload.progress * 100)}%`
                    : 'Download for offline viewing'
              }
            >
              {downloadEntry ? (
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              ) : activeDownload ? (
                <View style={styles.downloadProgressWrap}>
                  <ActivityIndicator size="small" color="#F59E0B" />
                  <Text style={styles.downloadProgressText}>
                    {Math.round(activeDownload.progress * 100)}%
                  </Text>
                </View>
              ) : (
                <Ionicons name="download-outline" size={22} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Synopsis */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Synopsis</Text>
            <Text style={styles.description}>{movie.description}</Text>
          </View>

          {/* Director */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Director</Text>
            <View style={styles.crewItem}>
              <View style={styles.crewAvatar}>
                <Ionicons name="person" size={20} color="#6B7280" />
              </View>
              <Text style={styles.crewName}>{movie.director}</Text>
            </View>
          </View>

          {/* Cast */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.castContainer}
            >
              {movie.cast.map((actor, index) => (
                <View key={index} style={styles.castItem}>
                  <View style={styles.castAvatar}>
                    <Ionicons name="person" size={24} color="#6B7280" />
                  </View>
                  <Text style={styles.castName} numberOfLines={2}>{actor}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Reviews */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <View style={styles.reviewCount}>
                <Text style={styles.reviewCountText}>{reviews.length}</Text>
              </View>
            </View>

            {reviews.length === 0 ? (
              <View style={styles.noReviewsContainer}>
                <Ionicons name="chatbubble-outline" size={32} color="#374151" />
                <Text style={styles.noReviews}>No reviews yet</Text>
                <Text style={styles.noReviewsSubtext}>Be the first to review this movie</Text>
              </View>
            ) : (
              reviews.slice(0, 5).map((review) => (
                <View key={review._id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAuthorRow}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {(review.nickname || 'A').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reviewAuthor}>{review.nickname || 'Anonymous'}</Text>
                        <View style={styles.reviewStars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons
                              key={star}
                              name={star <= review.rating ? "star" : "star-outline"}
                              size={12}
                              color="#F59E0B"
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))
            )}
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 40 }} />
        </View>
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
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginTop: 12,
  },
  posterContainer: {
    height: POSTER_HEIGHT,
    position: 'relative',
  },
  poster: {
    width: width,
    height: POSTER_HEIGHT,
  },
  posterGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: POSTER_HEIGHT * 0.6,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -35,
    marginLeft: -35,
  },
  playButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    marginTop: -60,
    paddingHorizontal: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4B5563',
    marginHorizontal: 10,
  },
  genreContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  genreBadge: {
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  genreText: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 14,
  },
  watchNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    marginBottom: 14,
  },
  watchNowText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '700',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  iconButtonActive: {
    borderColor: 'transparent',
    backgroundColor: '#1F1F1F',
  },
  downloadProgressWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadProgressText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  reviewCount: {
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    marginBottom: 12,
  },
  reviewCountText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    color: '#9CA3AF',
    fontSize: 15,
    lineHeight: 24,
  },
  crewItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  crewName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  castContainer: {
    gap: 16,
    paddingRight: 20,
  },
  castItem: {
    alignItems: 'center',
    width: 80,
  },
  castAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  castName: {
    color: '#D1D5DB',
    fontSize: 12,
    textAlign: 'center',
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  noReviews: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 12,
  },
  noReviewsSubtext: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  reviewHeader: {
    marginBottom: 12,
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewAvatarText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewAuthor: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 22,
  },
});

export default MovieDetailScreen;
