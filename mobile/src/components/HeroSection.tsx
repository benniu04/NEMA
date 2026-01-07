import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Movie } from '../types';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 420;
const AUTO_PLAY_DELAY = 2000; // 2 seconds before auto-play

interface HeroSectionProps {
  movie: Movie;
  onPress: () => void;
  onPlayPress: () => void;
  onSearchPress: () => void;
  autoPlayEnabled?: boolean;
  isFocused?: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  movie,
  onPress,
  onPlayPress,
  onSearchPress,
  autoPlayEnabled = true,
  isFocused = true,
}) => {
  const videoRef = useRef<Video>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showPoster, setShowPoster] = useState(true);
  const posterOpacity = useRef(new Animated.Value(1)).current;

  // Get preview video URL (prefer lower quality for preview)
  const previewUrl = movie.videoUrls?.['720p'] || movie.videoUrls?.hls;

  // Configure audio for muted playback
  useEffect(() => {
    const configureAudio = async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    };
    configureAudio();
  }, []);

  // Auto-play delay and focus handling
  useEffect(() => {
    if (!autoPlayEnabled || !previewUrl || !isFocused) {
      videoRef.current?.pauseAsync();
      setIsVideoPlaying(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (isFocused && videoRef.current) {
        try {
          await videoRef.current.playAsync();
        } catch (error) {
          console.log('Auto-play failed:', error);
        }
      }
    }, AUTO_PLAY_DELAY);

    return () => clearTimeout(timer);
  }, [isFocused, autoPlayEnabled, previewUrl]);

  // Pause video when screen loses focus
  useEffect(() => {
    if (!isFocused && videoRef.current) {
      videoRef.current.pauseAsync();
      setIsVideoPlaying(false);
    }
  }, [isFocused]);

  // Handle video ready - fade from poster to video
  const handleVideoLoad = () => {
    setIsVideoReady(true);
    // Crossfade from poster to video
    Animated.timing(posterOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setShowPoster(false);
    });
  };

  const handleVideoError = () => {
    setShowPoster(true);
    posterOpacity.setValue(1);
  };

  const genres = movie.genre?.slice(0, 3).join(' / ') || '';

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
      <View style={styles.container}>
        {/* Video layer (behind poster initially) */}
        {previewUrl && autoPlayEnabled && (
          <Video
            ref={videoRef}
            source={{ uri: previewUrl }}
            style={[styles.video, { opacity: isVideoReady ? 1 : 0 }]}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isLooping={true}
            isMuted={true}
            onLoad={handleVideoLoad}
            onError={handleVideoError}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded) {
                setIsVideoPlaying(status.isPlaying);
              }
            }}
          />
        )}

        {/* Poster layer (fades out when video ready) */}
        {showPoster && (
          <Animated.View style={[styles.posterContainer, { opacity: posterOpacity }]}>
            <Image
              source={{ uri: movie.posterUrl || movie.thumbnailUrl }}
              style={styles.poster}
              contentFit="cover"
            />
          </Animated.View>
        )}

        {/* Gradient overlay */}
        <LinearGradient
          colors={['rgba(15,15,15,0.3)', 'transparent', 'rgba(15,15,15,0.8)', '#0F0F0F']}
          locations={[0, 0.3, 0.7, 1]}
          style={styles.gradient}
        />

        {/* Mute indicator when video playing */}
        {isVideoPlaying && (
          <View style={styles.muteIndicator}>
            <Ionicons name="volume-mute" size={16} color="#FFFFFF" />
          </View>
        )}

        {/* Header */}
        <SafeAreaView style={styles.header} edges={['top']}>
          <Text style={styles.logo}>NEMA</Text>
          <TouchableOpacity style={styles.searchButton} onPress={onSearchPress}>
            <Ionicons name="search" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Hero content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {movie.title}
          </Text>

          {genres && (
            <Text style={styles.genres}>{genres}</Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>{(movie.rating ?? 0).toFixed(1)}</Text>
            </View>
            {movie.releaseDate && (
              <Text style={styles.year}>
                {new Date(movie.releaseDate).getFullYear()}
              </Text>
            )}
            {movie.duration && (
              <Text style={styles.duration}>{movie.duration} min</Text>
            )}
          </View>

          <TouchableOpacity style={styles.playButton} onPress={onPlayPress}>
            <Ionicons name="play" size={20} color="#000" style={{ marginLeft: 2 }} />
            <Text style={styles.playButtonText}>Watch Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: HERO_HEIGHT,
    width: width,
    position: 'relative',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  posterContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  muteIndicator: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  logo: {
    color: '#F59E0B',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  genres: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
  },
  year: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  duration: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 8,
  },
  playButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HeroSection;
