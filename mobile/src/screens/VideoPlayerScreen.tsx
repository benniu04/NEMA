import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { moviesService } from '../services/movies';
import type { Movie } from '../types';
import type { RootStackScreenProps } from '../navigation/types';

type Props = RootStackScreenProps<'VideoPlayer'>;
const { width, height } = Dimensions.get('window');

const VideoPlayerScreen = ({ route, navigation }: Props) => {
  const { movieId, startTime = 0 } = route.params;
  const videoRef = useRef<Video>(null);

  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('720p');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Configure audio session for video playback
    const setupAudio = async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    };
    setupAudio();

    loadMovie();
    // Lock to landscape for better viewing
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

    return () => {
      // Restore portrait on unmount
      ScreenOrientation.unlockAsync();
    };
  }, [movieId]);

  useEffect(() => {
    if (showControls) {
      resetControlsTimeout();
    }
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [showControls]);

  const resetControlsTimeout = () => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 4000);
  };

  const loadMovie = async () => {
    try {
      const movieData = await moviesService.getMovieById(movieId);
      if (!movieData) {
        setError('Movie not found');
        return;
      }
      setMovie(movieData);

      // Select best available quality
      const qualities = Object.keys(movieData.videoUrls || {});
      if (qualities.includes('1080p')) {
        setSelectedQuality('1080p');
      } else if (qualities.includes('720p')) {
        setSelectedQuality('720p');
      } else if (qualities.includes('hls')) {
        setSelectedQuality('hls');
      } else if (qualities.length > 0) {
        setSelectedQuality(qualities[0]);
      }
    } catch (err) {
      console.error('Error loading movie:', err);
      setError('Failed to load video');
    } finally {
      setIsLoading(false);
    }
  };

  const getVideoUrl = (): string | null => {
    if (!movie?.videoUrls) return null;
    return movie.videoUrls[selectedQuality] || null;
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setError(`Playback error: ${status.error}`);
      }
      return;
    }

    setIsPlaying(status.isPlaying);
    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);
    setIsBuffering(status.isBuffering);
  };

  const togglePlayPause = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    resetControlsTimeout();
  };

  const seekRelative = async (seconds: number) => {
    if (!videoRef.current) return;
    const newPosition = Math.max(0, Math.min(position + seconds * 1000, duration));
    await videoRef.current.setPositionAsync(newPosition);
    resetControlsTimeout();
  };

  const handleSliderChange = async (value: number) => {
    if (!videoRef.current) return;
    await videoRef.current.setPositionAsync(value);
    resetControlsTimeout();
  };

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleScreenTap = () => {
    setShowControls(!showControls);
    if (!showControls) {
      resetControlsTimeout();
    }
  };

  const handleQualityChange = async (quality: string) => {
    const currentPosition = position;
    setSelectedQuality(quality);
    setShowQualityMenu(false);

    // Seek to current position after quality change
    setTimeout(async () => {
      if (videoRef.current) {
        await videoRef.current.setPositionAsync(currentPosition);
      }
    }, 500);
  };

  const handleClose = async () => {
    if (videoRef.current) {
      await videoRef.current.pauseAsync();
    }
    navigation.goBack();
  };

  const availableQualities = movie?.videoUrls ? Object.keys(movie.videoUrls).filter(q => movie.videoUrls[q]) : [];
  const videoUrl = getVideoUrl();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden />
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={styles.loadingText}>Loading video...</Text>
      </View>
    );
  }

  if (error || !videoUrl) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar hidden />
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Unable to play video</Text>
        <Text style={styles.errorText}>{error || 'No video URL available for this movie'}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={handleClose}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={handleScreenTap}
      >
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={true}
          isMuted={false}
          volume={1.0}
          positionMillis={startTime * 1000}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={(error) => setError(error)}
        />

        {/* Buffering Indicator */}
        {isBuffering && (
          <View style={styles.bufferingContainer}>
            <ActivityIndicator size="large" color="#F59E0B" />
          </View>
        )}

        {/* Controls Overlay */}
        {showControls && (
          <View style={styles.controlsOverlay}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.movieTitle} numberOfLines={1}>
                {movie?.title}
              </Text>
              <TouchableOpacity
                style={styles.qualityButton}
                onPress={() => setShowQualityMenu(!showQualityMenu)}
              >
                <Text style={styles.qualityText}>{selectedQuality}</Text>
                <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Quality Menu */}
            {showQualityMenu && (
              <View style={styles.qualityMenu}>
                {availableQualities.map((quality) => (
                  <TouchableOpacity
                    key={quality}
                    style={[
                      styles.qualityOption,
                      selectedQuality === quality && styles.qualityOptionActive,
                    ]}
                    onPress={() => handleQualityChange(quality)}
                  >
                    <Text
                      style={[
                        styles.qualityOptionText,
                        selectedQuality === quality && styles.qualityOptionTextActive,
                      ]}
                    >
                      {quality.toUpperCase()}
                    </Text>
                    {selectedQuality === quality && (
                      <Ionicons name="checkmark" size={18} color="#F59E0B" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Center Controls */}
            <View style={styles.centerControls}>
              <TouchableOpacity
                style={styles.seekButton}
                onPress={() => seekRelative(-10)}
              >
                <Ionicons name="play-back" size={32} color="#FFFFFF" />
                <Text style={styles.seekText}>10</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.playPauseButton} onPress={togglePlayPause}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={44}
                  color="#000"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.seekButton}
                onPress={() => seekRelative(10)}
              >
                <Ionicons name="play-forward" size={32} color="#FFFFFF" />
                <Text style={styles.seekText}>10</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Bar */}
            <View style={styles.bottomBar}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>

              {/* Progress Bar */}
              <View
                style={styles.progressContainer}
                onTouchEnd={(e) => {
                  const x = e.nativeEvent.locationX;
                  // Estimate progress bar width based on screen dimensions
                  const progressWidth = width - 140; // Account for padding and time labels
                  const newPosition = Math.max(0, Math.min((x / progressWidth) * duration, duration));
                  handleSliderChange(newPosition);
                }}
              >
                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${duration > 0 ? (position / duration) * 100 : 0}%` },
                    ]}
                  />
                </View>
              </View>

              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  bufferingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  qualityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  qualityText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  qualityMenu: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 10,
  },
  qualityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 100,
  },
  qualityOptionActive: {
    backgroundColor: '#2A2A2A',
  },
  qualityOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  qualityOptionTextActive: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },
  seekButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    gap: 12,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    minWidth: 50,
  },
  progressContainer: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  progressBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
});

export default VideoPlayerScreen;
