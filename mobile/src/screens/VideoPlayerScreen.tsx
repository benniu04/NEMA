import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import Slider from '@react-native-community/slider';
import { moviesService } from '../services/movies';
import { watchProgressService } from '../services/watchProgress';
import { useDownloads } from '../context/DownloadsContext';
import type { Movie } from '../types';
import type { RootStackScreenProps } from '../navigation/types';

type Props = RootStackScreenProps<'VideoPlayer'>;
const { width, height } = Dimensions.get('window');

const VideoPlayerScreen = ({ route, navigation }: Props) => {
  const { movieId, startTime = 0 } = route.params;
  const videoRef = useRef<Video>(null);

  const { getDownload } = useDownloads();
  const downloadEntry = getDownload(movieId);
  const isOffline = !!downloadEntry;

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
  const [isFinished, setIsFinished] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);

  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef(0);
  const lastSaveTime = useRef(0);
  const hasLoadedSavedProgress = useRef(false);

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
    if (showControls && !isSeeking) {
      resetControlsTimeout();
    }
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [showControls, isSeeking]);

  const resetControlsTimeout = () => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying && !isSeeking) {
        setShowControls(false);
      }
    }, 4000);
  };

  const loadMovie = async () => {
    // Offline path: play from local file without hitting the network.
    if (downloadEntry) {
      setMovie({
        _id: downloadEntry.movieId,
        title: downloadEntry.title,
        description: '',
        rating: 0,
        releaseDate: '',
        genre: [],
        director: '',
        cast: [],
        language: '',
        videoUrls: { local: downloadEntry.localUri },
        posterUrl: downloadEntry.posterUrl,
        thumbnailUrl: downloadEntry.posterUrl,
        views: 0,
        isFeatured: false,
        tags: [],
        createdAt: downloadEntry.downloadedAt,
        updatedAt: downloadEntry.downloadedAt,
      });
      setSelectedQuality('local');
      setIsLoading(false);
      return;
    }

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

  // Save watch progress (debounced - every 5 seconds)
  const saveWatchProgress = useCallback(async (positionMs: number, durationMs: number) => {
    if (!movie || durationMs === 0) return;

    const now = Date.now();
    // Debounce: only save every 5 seconds
    if (now - lastSaveTime.current < 5000) return;
    lastSaveTime.current = now;

    const percentage = (positionMs / durationMs) * 100;

    await watchProgressService.save({
      movieId: movie._id,
      position: positionMs,
      duration: durationMs,
      percentage,
      lastWatched: new Date().toISOString(),
      thumbnailUrl: movie.thumbnailUrl || movie.posterUrl,
      title: movie.title,
    });
  }, [movie]);

  // Force save progress (used on close/pause)
  const forceSaveProgress = useCallback(async () => {
    if (!movie || duration === 0) return;

    const percentage = (position / duration) * 100;

    await watchProgressService.save({
      movieId: movie._id,
      position,
      duration,
      percentage,
      lastWatched: new Date().toISOString(),
      thumbnailUrl: movie.thumbnailUrl || movie.posterUrl,
      title: movie.title,
    });
  }, [movie, position, duration]);

  // Load saved progress if no startTime provided
  useEffect(() => {
    const loadSavedProgress = async () => {
      if (startTime > 0 || hasLoadedSavedProgress.current || !movie) return;
      hasLoadedSavedProgress.current = true;

      const savedProgress = await watchProgressService.get(movie._id);
      if (savedProgress && savedProgress.position > 0 && videoRef.current) {
        await videoRef.current.setPositionAsync(savedProgress.position);
      }
    };

    if (movie && !isLoading) {
      loadSavedProgress();
    }
  }, [movie, isLoading, startTime]);

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

    // Only update position if not seeking (to prevent jumpy UI)
    if (!isSeeking) {
      setPosition(status.positionMillis || 0);
    }

    setDuration(status.durationMillis || 0);
    durationRef.current = status.durationMillis || 0;
    setIsBuffering(status.isBuffering);

    // Handle video finished
    if (status.didJustFinish) {
      setIsFinished(true);
      setIsPlaying(false);
      setShowControls(true);
      // Remove from continue watching when finished
      if (movie) {
        watchProgressService.remove(movie._id);
      }
    }

    // Save watch progress periodically
    if (status.isPlaying && status.positionMillis && status.durationMillis) {
      saveWatchProgress(status.positionMillis, status.durationMillis);
    }
  };

  const togglePlayPause = async () => {
    if (!videoRef.current) return;

    // If video finished, seek to beginning first
    if (isFinished) {
      await videoRef.current.setPositionAsync(0);
      setIsFinished(false);
      setPosition(0);
      await videoRef.current.playAsync();
    } else if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    resetControlsTimeout();
  };

  const seekRelative = async (seconds: number) => {
    if (!videoRef.current) return;

    // Reset finished state when seeking
    if (isFinished) {
      setIsFinished(false);
    }

    const newPosition = Math.max(0, Math.min(position + seconds * 1000, duration));
    await videoRef.current.setPositionAsync(newPosition);
    setPosition(newPosition);

    // Auto-play if was finished
    if (isFinished || !isPlaying) {
      await videoRef.current.playAsync();
    }

    resetControlsTimeout();
  };

  const seekToPosition = async (newPosition: number) => {
    if (!videoRef.current) return;

    // Reset finished state when seeking
    if (isFinished) {
      setIsFinished(false);
    }

    const clampedPosition = Math.max(0, Math.min(newPosition, duration));
    await videoRef.current.setPositionAsync(clampedPosition);
    setPosition(clampedPosition);
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
    if (isSeeking) return;
    setShowControls(!showControls);
    setShowQualityMenu(false);
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
    // Save progress before closing
    await forceSaveProgress();
    navigation.goBack();
  };

  // Slider handlers for seeking
  const handleSlidingStart = () => {
    setIsSeeking(true);
    // Keep controls visible while seeking
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
  };

  const handleSlidingComplete = async (value: number) => {
    setIsSeeking(false);
    await seekToPosition(value);
  };

  const handleSliderChange = (value: number) => {
    setSeekPosition(value);
  };

  const availableQualities = movie?.videoUrls ? Object.keys(movie.videoUrls).filter(q => movie.videoUrls[q]) : [];
  const videoUrl = getVideoUrl();

  // Use seek position while dragging, otherwise use actual position
  const displayPosition = isSeeking ? seekPosition : position;

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
          isLooping={false}
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
              {isOffline ? (
                <View style={styles.offlineBadge}>
                  <Ionicons name="cloud-offline-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.qualityText}>Offline</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.qualityButton}
                  onPress={() => setShowQualityMenu(!showQualityMenu)}
                >
                  <Text style={styles.qualityText}>{selectedQuality}</Text>
                  <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
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
                  name={isFinished ? 'reload' : isPlaying ? 'pause' : 'play'}
                  size={44}
                  color="#000"
                  style={!isFinished && !isPlaying ? { marginLeft: 4 } : undefined}
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
              <Text style={styles.timeText}>{formatTime(displayPosition)}</Text>

              {/* Slider for seeking - YouTube style */}
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration}
                value={isSeeking ? seekPosition : position}
                onSlidingStart={handleSlidingStart}
                onSlidingComplete={handleSlidingComplete}
                onValueChange={handleSliderChange}
                minimumTrackTintColor="#F59E0B"
                maximumTrackTintColor="rgba(255,255,255,0.3)"
                thumbTintColor="#F59E0B"
              />

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
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
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
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
});

export default VideoPlayerScreen;
