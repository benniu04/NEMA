import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Movie } from '../types';

const { width } = Dimensions.get('window');

export type CardSize = 'small' | 'medium' | 'large';

interface MovieCardProps {
  movie: Movie;
  onPress: () => void;
  size?: CardSize;
  showProgress?: boolean;
  progressPercentage?: number;
}

const CARD_SIZES = {
  small: width * 0.3,
  medium: width * 0.38,
  large: width * 0.45,
};

const ASPECT_RATIO = 1.5; // 2:3 aspect ratio for posters

const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onPress,
  size = 'medium',
  showProgress = false,
  progressPercentage = 0,
}) => {
  const cardWidth = CARD_SIZES[size];
  const cardHeight = cardWidth * ASPECT_RATIO;

  return (
    <TouchableOpacity
      style={[styles.container, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.imageContainer, { height: cardHeight }]}>
        <Image
          source={{ uri: movie.posterUrl || movie.thumbnailUrl }}
          style={styles.poster}
          contentFit="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        />

        {/* Progress bar for continue watching */}
        {showProgress && progressPercentage > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${Math.min(progressPercentage, 100)}%` }
                ]}
              />
            </View>
          </View>
        )}

        {/* Play icon overlay for continue watching */}
        {showProgress && (
          <View style={styles.playIconContainer}>
            <View style={styles.playIcon}>
              <Ionicons name="play" size={20} color="#FFF" style={{ marginLeft: 2 }} />
            </View>
          </View>
        )}

        <View style={styles.cardInfo}>
          <Text style={styles.title} numberOfLines={1}>
            {movie.title}
          </Text>
          <View style={styles.meta}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.rating}>{(movie.rating ?? 0).toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  imageContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  progressContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  progressBackground: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#E50914',
  },
  playIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default MovieCard;
