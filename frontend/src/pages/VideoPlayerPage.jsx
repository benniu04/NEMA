import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import Hls from 'hls.js'
import NavBar from '../components/NavBar'
import API_BASE_URL from '../config/api'
import CommentSection from '../components/CommentSection'
import ReviewSection from '../components/ReviewSection'
import CarouselRow from '../components/CarouselRow'
import Footer from '../components/Footer'
import { analytics } from '../config/analytics'
import { useUser } from '../context/UserContext'
import { useSettings } from '../context/SettingsContext'

const VideoPlayerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, addToFavorites, removeFromFavorites, isInFavorites: checkIsInFavorites } = useUser();
  const { t } = useSettings();
  const [movie, setMovie] = useState(null);
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const controlsTimeoutRef = React.useRef(null);
  const [visibleSections, setVisibleSections] = useState({});
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);

  // Playback speed state
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  // Subtitle state
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState('off');
  const [subtitleSize, setSubtitleSize] = useState('medium'); // small, medium, large
  const subtitleSizes = { small: '14px', medium: '18px', large: '24px' };
  
  // Watchlist state
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  
  // Favorites state
  const [isInFavoritesList, setIsInFavoritesList] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  
  // Watch time tracking state
  const [sessionId] = useState(() => {
    // Generate or retrieve session ID from localStorage
    const stored = localStorage.getItem(`watchSession_${id}`);
    if (stored) return stored;
    const newSessionId = uuidv4();
    localStorage.setItem(`watchSession_${id}`, newSessionId);
    return newSessionId;
  });
  const [lastTrackedTime, setLastTrackedTime] = useState(0);
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [hasTrackedCompletion, setHasTrackedCompletion] = useState(false);
  const watchTimeIntervalRef = useRef(null);

  // Check if movie is in watchlist
  useEffect(() => {
    if (isAuthenticated && user?.watchlist && id) {
      const inWatchlist = user.watchlist.some(movieId => {
        // Handle both ObjectId objects and string IDs
        const watchlistId = typeof movieId === 'object' ? movieId._id : movieId;
        return watchlistId === id;
      });
      setIsInWatchlist(inWatchlist);
    }
  }, [user, id, isAuthenticated]);

  // Check if movie is in favorites
  useEffect(() => {
    if (isAuthenticated && id) {
      setIsInFavoritesList(checkIsInFavorites(id));
    }
  }, [user, id, isAuthenticated, checkIsInFavorites]);

  // Fetch movie data and related movies
  useEffect(() => {
    // Reset video player state when movie changes
    setLoading(true);
    setError('');
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setShowControls(true);
    setLastTrackedTime(0);
    setHasTrackedStart(false);
    setHasTrackedCompletion(false);
    
    // Clean up any existing watch time interval
    if (watchTimeIntervalRef.current) {
      clearInterval(watchTimeIntervalRef.current);
      watchTimeIntervalRef.current = null;
    }
    
    // Exit fullscreen if currently in fullscreen when navigating away
    if (document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.mozFullScreenElement || 
        document.msFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
    
    const fetchMovieAndRelated = async () => {
      try {
        // OPTIMIZED: Fetch movie and related movies in PARALLEL
        const [movieResponse, relatedResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/movies/${id}`),
          fetch(`${API_BASE_URL}/api/movies?limit=3&exclude=${id}`)
        ]);
        
        if (!movieResponse.ok) {
          throw new Error('Failed to fetch movie');
        }
        const movieData = await movieResponse.json();
        
        setMovie(movieData);

        // Set the first available quality as default
        const availableQualities = Object.entries(movieData.videoUrls || {}).filter(([quality, url]) => url && url.trim() !== '');
        
        if (availableQualities.length > 0) {
          // Prefer HLS if available, otherwise use first available quality
          const hlsQuality = availableQualities.find(([q]) => q === 'hls');
          const firstQuality = hlsQuality ? hlsQuality[0] : availableQualities[0][0];
          setSelectedQuality(firstQuality);
        }

        // Process related movies response
        if (relatedResponse.ok) {
          const relatedData = await relatedResponse.json();
          setRelatedMovies(relatedData);
        }
      } catch (err) {
        console.error('Error fetching movie data:', err);
        setError('Failed to load movie. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMovieAndRelated();
    
    // Cleanup function
    return () => {
      // Clean up session ID from localStorage when leaving page
      localStorage.removeItem(`watchSession_${id}`);
      if (watchTimeIntervalRef.current) {
        clearInterval(watchTimeIntervalRef.current);
        watchTimeIntervalRef.current = null;
      }
    };
  }, [id]);

  // Handle video player controls visibility (mouse and touch support)
  useEffect(() => {
    const handleInteraction = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying && !isSeeking) {
          setShowControls(false);
        }
      }, 3000);
    };

    // Listen for both mouse and touch events for mobile support
    document.addEventListener('mousemove', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('touchmove', handleInteraction);
    
    return () => {
      document.removeEventListener('mousemove', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('touchmove', handleInteraction);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isSeeking]);

  // Handle fullscreen changes (with mobile support)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isInFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isInFullscreen);
    };

    // Listen to all vendor-prefixed fullscreen change events for mobile compatibility
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Re-run once the page has real content so the
  // IntersectionObserver can actually find the sections.
  useEffect(() => {
    if (loading) return;            // wait until the movie has loaded

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setVisibleSections(prev => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }));
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => observer.observe(section));

    return () => {
      sections.forEach(section => observer.unobserve(section));
    };
  }, [loading, relatedMovies.length]);

  // Helper to track watch time
  const trackProgress = async (force = false) => {
    const video = videoRef.current;
    if (!video || !movie || !id || !sessionId || !hasTrackedStart) return;

    const currentTime = video.currentTime;
    const videoDuration = video.duration || duration;
    
    if (!videoDuration) return;

    // Only track if time has progressed (prevent spam) or if forced (e.g. video ended)
    if (force || Math.abs(currentTime - lastTrackedTime) >= 2) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/watch-time/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            movieId: id,
            sessionId: sessionId,
            currentTime: currentTime,
            videoDuration: videoDuration,
            quality: selectedQuality
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setLastTrackedTime(currentTime);
          
          // Track completion milestone (only once per session)
          if (data.completionPercentage >= 90 && !hasTrackedCompletion && movie?.title) {
            analytics.trackVideoComplete(movie.title);
            setHasTrackedCompletion(true);
          }
        }
      } catch (error) {
        console.error('Error tracking watch time:', error);
      }
    }
  };

  // Track watch time periodically
  useEffect(() => {
    if (!movie || !videoRef.current || !duration || loading) return;

    // Track watch time every 5 seconds
    const interval = setInterval(() => {
      if (!videoRef.current?.paused) {
        trackProgress();
      }
    }, 5000);

    watchTimeIntervalRef.current = interval;

    // Cleanup on unmount or when dependencies change
    return () => {
      clearInterval(interval);
      watchTimeIntervalRef.current = null;
      
      // Send one last progress update before ending session
      if (hasTrackedStart && videoRef.current) {
        const finalTime = videoRef.current.currentTime;
        const finalDuration = videoRef.current.duration || duration;
        
        if (finalDuration > 0) {
          console.log('Sending final progress update:', { finalTime, finalDuration });
          
          // Use fetch with keepalive to ensure it reaches the server even if page is closed
          fetch(`${API_BASE_URL}/api/watch-time/track`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            keepalive: true,
            body: JSON.stringify({
              movieId: id,
              sessionId: sessionId,
              currentTime: finalTime,
              videoDuration: finalDuration,
              quality: selectedQuality
            })
          }).then(() => {
            // Mark session as ended
            fetch(`${API_BASE_URL}/api/watch-time/end`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              credentials: 'include',
              keepalive: true,
              body: JSON.stringify({
                movieId: id,
                sessionId: sessionId
              })
            }).catch(err => console.error('Error ending session:', err));
          }).catch(err => console.error('Error in final tracking:', err));
        }
      }
    };
  }, [movie, id, sessionId, duration, selectedQuality, lastTrackedTime, hasTrackedStart, hasTrackedCompletion, loading]); 

  // Prevent video download and right-click
  const handleContextMenu = (e) => {
    e.preventDefault();
    return false;
  };

  // Disable keyboard shortcuts that could be used to download
  const handleKeyDown = (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return; 

    // block download shortcuts you already had
    if ((e.ctrlKey && (e.key === 's' || e.key === 'u')) || e.key === 'F12') {
      e.preventDefault();
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    switch (e.key.toLowerCase()) {
      /* play / pause */
      case ' ':
      case 'k':
        e.preventDefault();
        handlePlayPause();
        break;

      /* seek */
      case 'j':
        video.currentTime = Math.max(0, video.currentTime - 10);
        break;
      case 'l':
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
        break;
      case 'arrowleft':
        e.preventDefault();                      
        video.currentTime = Math.max(0, video.currentTime - 5); // ⬅ rewind
        break;
      case 'arrowright':
        e.preventDefault();
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
        break;

      /* volume & mute */
      case 'arrowdown':
        e.preventDefault();
        handleVolumeChange(video.volume - 0.1);
        break;
      case 'arrowup':
        e.preventDefault();
        handleVolumeChange(video.volume + 0.1);
        break;
      case 'm':
        handleMute();
        break;

      /* fullscreen */
      case 'f':
        toggleFullscreen();
        break;

      /* digit keys – jump by percentage */
      case '0': video.currentTime = 0; break;
      case '1': case '2': case '3': case '4':
      case '5': case '6': case '7': case '8': case '9':
        video.currentTime = (parseInt(e.key, 10) / 10) * duration;
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handle video source initialization
  useEffect(() => {
    let hls; // Declare hls outside so cleanup can access it
    
    // Wait a tick to ensure the video element is mounted
    const initializeVideo = () => {
      const video = videoRef.current;
      if (!video) {
        // If video ref isn't ready yet, try again in the next frame
        requestAnimationFrame(initializeVideo);
        return;
      }
      if (!movie) {
        return;
      }
      if (!selectedQuality) {
        return;
      }

      const videoUrl = movie.videoUrls[selectedQuality];
      if (!videoUrl) {
        return;
      }
      
      // Now initialize the video (the rest of the existing code follows)
      initVideoSource(video, videoUrl);
    };
    
    const initVideoSource = (video, videoUrl) => {
      // Check for resume timestamp in URL - this takes priority
      const resumeTimeParam = searchParams.get('t');
      const resumeTime = resumeTimeParam && !isNaN(resumeTimeParam) ? parseInt(resumeTimeParam, 10) : null;
      
      // Use resume time from URL if available, otherwise keep current position (for quality switching)
      const previousTime = resumeTime !== null ? resumeTime : video.currentTime;
      const wasPlaying = !video.paused;
      
      if (selectedQuality === 'hls' || videoUrl.endsWith('.m3u8')) {
        if (Hls.isSupported()) {
          hls = new Hls({
            debug: false, // Set to true for verbose HLS debugging
            enableWorker: true,
            lowLatencyMode: false,
          });
          hls.loadSource(videoUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            video.currentTime = previousTime;
            if (wasPlaying) video.play().catch(e => console.error("Auto-play blocked:", e));
          });
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data.type, data.details, data);
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  break;
              }
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          video.src = videoUrl;
          video.currentTime = previousTime;
        }
      } else {
        // Normal MP4 playback
        video.src = videoUrl;
        video.load(); // Explicitly trigger load
        const handleLoadedMetadata = () => {
          video.currentTime = previousTime;
          if (wasPlaying) video.play().catch(e => console.error("Auto-play blocked:", e));
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
        const handleError = (e) => {
          console.error('Video error:', video.error?.code, video.error?.message, e);
          video.removeEventListener('error', handleError);
        };
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('error', handleError);
      }
    };
    
    // Start the initialization process
    initializeVideo();

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [movie, selectedQuality]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    
    if (!video) {
      return;
    }
    
    if (!video.src) {
      // Try to set the source if it's missing
      const videoUrl = movie?.videoUrls?.[selectedQuality];
      if (videoUrl) {
        video.src = videoUrl;
        video.load();
      } else {
        return;
      }
    }
    
    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(e => {
        console.error('Play failed:', e);
      });
      
      // Track video play event
      if (movie?.title) {
        analytics.playVideo(movie.title);
      }
      
      // Mark that we've started tracking
      if (!hasTrackedStart) {
        setHasTrackedStart(true);
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = (e) => {
    if (!isSeeking) {
      setCurrentTime(e.target.currentTime);
    }
  };

  const handleLoadedMetadata = (e) => {
    setDuration(e.target.duration);
    
    // Check for resume timestamp in URL
    const resumeTime = searchParams.get('t');
    if (resumeTime && !isNaN(resumeTime) && videoRef.current) {
      const timeInSeconds = parseInt(resumeTime, 10);
      if (timeInSeconds > 0 && timeInSeconds < e.target.duration) {
        videoRef.current.currentTime = timeInSeconds;
        setCurrentTime(timeInSeconds);
      }
    }
  };

  // Fixed seek function with better accuracy
  const handleSeek = (e) => {
    const video = videoRef.current;
    const progressBar = progressBarRef.current;
    
    if (!video || !progressBar || !duration || isNaN(duration)) return;
    
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressBarWidth = rect.width;
    const seekPercentage = Math.max(0, Math.min(1, clickX / progressBarWidth));
    const seekTime = seekPercentage * duration;
    
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  // Enhanced seek with mouse drag support
  const handleMouseDown = (e) => {
    setIsSeeking(true);
    handleSeek(e);
    
    const handleMouseMove = (e) => {
      handleSeek(e);
    };
    
    const handleMouseUp = () => {
      setIsSeeking(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    if (!video) return;
    
    const newVolume = typeof e === 'number' ? e : parseFloat(e.target.value);
    video.volume = Math.max(0, Math.min(1, newVolume));
    setVolume(video.volume);
    setIsMuted(video.volume === 0);
  };

  const handleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isMuted) {
      video.volume = volume > 0 ? volume : 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const handleQualityChange = (quality) => {
    setSelectedQuality(quality);
    // The useEffect will handle the source change
  };

  // Playback speed handler
  const handlePlaybackSpeedChange = (speed) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSpeedMenu(false);
    }
  };

  // Subtitle handlers
  const handleSubtitleChange = (lang) => {
    const video = videoRef.current;
    if (!video) return;

    // Disable all tracks first
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = 'hidden';
    }

    if (lang !== 'off') {
      // Find and enable the selected track
      for (let i = 0; i < video.textTracks.length; i++) {
        if (video.textTracks[i].language === lang) {
          video.textTracks[i].mode = 'showing';
          break;
        }
      }
    }

    setCurrentSubtitle(lang);
    setShowSubtitleMenu(false);
  };

  const handleSubtitleSizeChange = (size) => {
    setSubtitleSize(size);
  };

  // Get available subtitles from movie
  const getAvailableSubtitles = () => {
    if (!movie?.subtitleUrls) return [];
    return Object.entries(movie.subtitleUrls).filter(([_, url]) => url);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSpeedMenu || showSubtitleMenu) {
        if (!e.target.closest('.speed-menu-container') && !e.target.closest('.subtitle-menu-container')) {
          setShowSpeedMenu(false);
          setShowSubtitleMenu(false);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSpeedMenu, showSubtitleMenu]);

  const toggleFullscreen = async () => {
    const videoContainer = document.querySelector('.video-container');
    const video = videoRef.current;
    
    if (!videoContainer) {
      console.warn('Video container not found');
      return;
    }
    
    if (!video) {
      console.warn('Video element not found');
      return;
    }

    // Check if already in fullscreen (check all vendor prefixes)
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    if (isCurrentlyFullscreen) {
      // Exit fullscreen
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      } catch (err) {
        console.error('Exit fullscreen failed:', err);
      }
      return;
    }

    // Ensure video is loaded before entering fullscreen
    if (video.readyState < 2) {
      console.warn('Video not ready yet, waiting...');
      // Wait for video to be ready
      await new Promise((resolve) => {
        const onReady = () => {
          video.removeEventListener('loadeddata', onReady);
          resolve();
        };
        video.addEventListener('loadeddata', onReady);
        // Timeout after 3 seconds
        setTimeout(resolve, 3000);
      });
    }

    // Enter fullscreen
    try {
      // Try container first (brings controls with it)
      if (videoContainer.requestFullscreen) {
        await videoContainer.requestFullscreen();
      } else if (videoContainer.webkitRequestFullscreen) {
        // iOS Safari needs webkitRequestFullscreen
        videoContainer.webkitRequestFullscreen();
      } else if (videoContainer.mozRequestFullScreen) {
        videoContainer.mozRequestFullScreen();
      } else if (videoContainer.msRequestFullscreen) {
        videoContainer.msRequestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        // Fallback for older iOS: use native video fullscreen
        video.webkitEnterFullscreen();
      } else {
        console.error('Fullscreen API not supported on this device');
      }
    } catch (err) {
      console.error('Fullscreen request failed:', err);
      // On mobile, user gesture might be required - show a helpful message
      if (err.name === 'NotAllowedError') {
        console.warn('Fullscreen requires user interaction on mobile');
      }
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Toggle watchlist
  const toggleWatchlist = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/video/${id}` } } });
      return;
    }

    setWatchlistLoading(true);
    try {
      const endpoint = isInWatchlist
        ? `${API_BASE_URL}/api/users/watchlist/${id}`
        : `${API_BASE_URL}/api/users/watchlist/${id}`;

      const method = isInWatchlist ? 'DELETE' : 'POST';

      const response = await fetch(endpoint, {
        method,
        credentials: 'include'
      });

      if (response.ok) {
        setIsInWatchlist(!isInWatchlist);
        // Optionally refresh user context to update watchlist
        if (window.location) {
          // Trigger a soft refresh of user data if your context supports it
        }
      } else {
        const data = await response.json();
        console.error('Failed to update watchlist:', data.message);
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
    } finally {
      setWatchlistLoading(false);
    }
  };

  // Toggle favorites
  const toggleFavorites = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/video/${id}` } } });
      return;
    }

    setFavoritesLoading(true);
    try {
      const result = isInFavoritesList
        ? await removeFromFavorites(id)
        : await addToFavorites(id);

      if (result.success) {
        setIsInFavoritesList(!isInFavoritesList);
      } else {
        // Show error message to user
        alert(result.error);
      }
    } catch (error) {
      console.error('Error toggling favorites:', error);
      alert('Failed to update favorites. Please try again.');
    } finally {
      setFavoritesLoading(false);
    }
  };

  // Get available video qualities (only those with valid URLs)
  const getAvailableQualities = () => {
    if (!movie?.videoUrls) return [];
    return Object.entries(movie.videoUrls).filter(([quality, url]) => url && url.trim() !== '');
  };

  // Calculate progress percentage safely
  const getProgressPercentage = () => {
    if (!duration || isNaN(duration) || duration === 0) return 0;
    return Math.max(0, Math.min(100, (currentTime / duration) * 100));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <NavBar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-amber-100/60">{t('video.loadingMovie')}</div>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-black text-white">
        <NavBar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-red-500">{error || 'Movie not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <NavBar />
      
      <div className="relative min-h-screen pt-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 -left-40 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <section className="mb-16">
            {/* Subtitle styling */}
            <style>
              {`
                .video-container video::cue {
                  font-size: ${subtitleSizes[subtitleSize]};
                  background-color: rgba(0, 0, 0, 0.75);
                  color: white;
                  padding: 4px 8px;
                  border-radius: 4px;
                }
              `}
            </style>
            <div className={`video-container relative aspect-video bg-black rounded-none overflow-hidden ${!showControls ? 'cursor-none' : 'cursor-default'}`}>
              {movie && selectedQuality && movie.videoUrls[selectedQuality] ? (
                <video
                  ref={videoRef}
                  className="w-full h-full"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => {
                    setIsPlaying(false);
                    trackProgress(true);
                  }}
                  onClick={handlePlayPause}
                  onContextMenu={handleContextMenu}
                  controlsList="nodownload nofullscreen noremoteplayback"
                  disablePictureInPicture
                  playsInline
                  preload="auto"
                >
                  {/* ─── Subtitle tracks ─── */}
                  {movie.subtitleUrls && Object.entries(movie.subtitleUrls).map(
                    ([lang, url], idx) => url && (
                      <track
                        key={idx}
                        src={url}
                        kind="subtitles"
                        srcLang={lang}
                        label={lang.toUpperCase()}
                        default={lang === 'en'}   // first/default track
                      />
                    )
                  )}
                </video>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <p className="text-white/60">{t('video.noVideo')}</p>
                </div>
              )}
              
              <div 
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {/* Enhanced Progress Bar */}
                <div 
                  ref={progressBarRef}
                  className="relative h-1 bg-white/20 mb-4 cursor-pointer group"
                  onMouseDown={handleMouseDown}
                >
                  {/* Background bar */}
                  <div className="absolute inset-0 bg-white/20 rounded-full"></div>
                  
                  {/* Progress fill */}
                  <div 
                    className="absolute h-full bg-amber-500 rounded-full transition-all duration-150"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                  
                  {/* Hover indicator */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{ 
                      left: `${getProgressPercentage()}%`,
                      transform: 'translateX(-50%) translateY(-50%)'
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handlePlayPause}
                      className="text-white hover:text-amber-500 transition-colors"
                    >
                      {isPlaying ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleMute}
                        className="text-white hover:text-amber-500 transition-colors"
                      >
                        {isMuted ? (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20"
                      />
                    </div>

                    <div className="text-sm text-white/80">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Quality Selector */}
                    <select
                      value={selectedQuality}
                      onChange={(e) => handleQualityChange(e.target.value)}
                      className="bg-white/5 border border-amber-100/20 rounded-none px-2 py-1 text-sm focus:outline-none focus:border-amber-100/40 transition-colors"
                    >
                      {getAvailableQualities().map(([quality, url]) => (
                        <option key={quality} value={quality}>{quality}</option>
                      ))}
                    </select>

                    {/* Playback Speed Control */}
                    <div className="relative speed-menu-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSpeedMenu(!showSpeedMenu);
                          setShowSubtitleMenu(false);
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-white hover:text-amber-500 transition-colors bg-white/5 border border-amber-100/20"
                        title={t('video.playbackSpeed')}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>{playbackSpeed}x</span>
                      </button>

                      {showSpeedMenu && (
                        <div className="absolute bottom-full right-0 mb-2 bg-black/95 border border-amber-100/20 rounded shadow-xl z-50 min-w-[100px]">
                          <div className="py-1">
                            {speedOptions.map((speed) => (
                              <button
                                key={speed}
                                onClick={() => handlePlaybackSpeedChange(speed)}
                                className={`w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors ${
                                  playbackSpeed === speed ? 'text-amber-500 bg-white/5' : 'text-white'
                                }`}
                              >
                                {speed === 1 ? t('video.normal') : `${speed}x`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Subtitle Control */}
                    <div className="relative subtitle-menu-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSubtitleMenu(!showSubtitleMenu);
                          setShowSpeedMenu(false);
                        }}
                        className={`flex items-center gap-1 px-2 py-1 text-sm transition-colors bg-white/5 border border-amber-100/20 ${
                          currentSubtitle !== 'off' ? 'text-amber-500' : 'text-white hover:text-amber-500'
                        }`}
                        title={t('video.subtitles')}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <span className="hidden sm:inline">{t('video.cc')}</span>
                      </button>

                      {showSubtitleMenu && (
                        <div className="absolute bottom-full right-0 mb-2 bg-black/95 border border-amber-100/20 rounded shadow-xl z-50 min-w-[180px]">
                          <div className="py-1">
                            {/* Subtitle Language Options */}
                            <div className="px-3 py-1 text-xs text-white/50 uppercase tracking-wider">{t('video.language')}</div>
                            <button
                              onClick={() => handleSubtitleChange('off')}
                              className={`w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors ${
                                currentSubtitle === 'off' ? 'text-amber-500 bg-white/5' : 'text-white'
                              }`}
                            >
                              {t('video.off')}
                            </button>
                            {getAvailableSubtitles().length > 0 ? (
                              getAvailableSubtitles().map(([lang, url]) => (
                                <button
                                  key={lang}
                                  onClick={() => handleSubtitleChange(lang)}
                                  className={`w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors ${
                                    currentSubtitle === lang ? 'text-amber-500 bg-white/5' : 'text-white'
                                  }`}
                                >
                                  {t(`video.subtitle.${lang}`) || lang.toUpperCase()}
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-white/40 italic">
                                {t('video.noSubtitles')}
                              </div>
                            )}

                            {/* Subtitle Size Options */}
                            {currentSubtitle !== 'off' && (
                              <>
                                <div className="border-t border-white/10 mt-1 pt-1">
                                  <div className="px-3 py-1 text-xs text-white/50 uppercase tracking-wider">{t('video.size')}</div>
                                  {Object.keys(subtitleSizes).map((size) => (
                                    <button
                                      key={size}
                                      onClick={() => handleSubtitleSizeChange(size)}
                                      className={`w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors ${
                                        subtitleSize === size ? 'text-amber-500 bg-white/5' : 'text-white'
                                      }`}
                                    >
                                      {t(`video.subtitle.${size}`)}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Fullscreen Button */}
                    <button
                      onClick={toggleFullscreen}
                      className="text-white hover:text-amber-500 transition-colors"
                      title={t('video.fullscreen')}
                    >
                      {isFullscreen ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M15 9h4.5M15 9V4.5M9 15v4.5M9 15H4.5M15 15h4.5M15 15v4.5" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              {/* Title and Meta Info */}
              <div className="mb-8">
                <h1 className="text-5xl font-light mb-6 tracking-wide text-white leading-tight">{movie.title}</h1>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-amber-100/70 text-lg">
                  <span className="font-medium">{movie.director}</span>
                  <span className="text-amber-100/40">•</span>
                  <span>{new Date(movie.releaseDate).getFullYear()}</span>
                </div>
              </div>

              {/* Description Section - Enhanced */}
              <div className="mb-10">
                <div className="relative">
                  <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-amber-500 to-amber-600 rounded-full"></div>
                  <div className="pl-8">
                    <h2 className="text-xl font-medium text-amber-100/90 mb-4 tracking-wide">{t('video.synopsis')}</h2>
                    <div className="prose prose-lg max-w-none">
                      <p className="text-gray-200 text-lg font-light tracking-wide leading-8">
                        {movie.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Review block */}
              <ReviewSection movieId={id} movieTitle={movie?.title} />

              {/* Movie Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-amber-100/10 rounded-lg p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-amber-100/90 font-medium mb-3 text-sm uppercase tracking-wider">{t('video.genre')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {movie.genre.map((g, index) => (
                        <span key={index} className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-100/80 text-sm">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-amber-100/90 font-medium mb-3 text-sm uppercase tracking-wider">{t('video.language')}</h3>
                    <p className="text-gray-200 text-lg">{movie.language}</p>
                  </div>
                </div>

                {movie.cast && (
                  <div>
                    <h3 className="text-amber-100/90 font-medium mb-3 text-sm uppercase tracking-wider">{t('video.cast')}</h3>
                    <div className="space-y-2">
                      {movie.cast.slice(0, 5).map((actor, index) => (
                        <div key={index} className="text-gray-200 text-lg">
                          {actor}
                        </div>
                      ))}
                      {movie.cast.length > 5 && (
                        <div className="text-amber-100/60 text-sm italic">
                          +{movie.cast.length - 5} {t('video.more')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24">
                {/* Watchlist Button */}
                <button
                  onClick={toggleWatchlist}
                  disabled={watchlistLoading}
                  className={`w-full mb-4 px-4 py-3 border transition-all duration-300 flex items-center justify-center gap-2 ${
                    isInWatchlist
                      ? 'bg-amber-500 border-amber-500 text-black hover:bg-amber-600 hover:border-amber-600'
                      : 'bg-transparent border-amber-100/20 text-amber-100/80 hover:border-amber-100/40 hover:text-amber-100'
                  } ${watchlistLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {watchlistLoading ? (
                    <span>{t('video.loading')}</span>
                  ) : isInWatchlist ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {t('video.inWatchlist')}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {t('video.addToWatchlist')}
                    </>
                  )}
                </button>

                {/* Favorites Button */}
                <button
                  onClick={toggleFavorites}
                  disabled={favoritesLoading}
                  className={`w-full mb-4 px-4 py-3 border transition-all duration-300 flex items-center justify-center gap-2 ${
                    isInFavoritesList
                      ? 'bg-rose-500 border-rose-500 text-white hover:bg-rose-600 hover:border-rose-600'
                      : 'bg-transparent border-rose-400/20 text-rose-400/80 hover:border-rose-400/40 hover:text-rose-400'
                  } ${favoritesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {favoritesLoading ? (
                    <span>{t('video.loading')}</span>
                  ) : isInFavoritesList ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      {t('video.inFavorites')}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {t('video.addToFavorites')}
                    </>
                  )}
                </button>
                
                <div 
                  className="poster-container group relative aspect-[2/3] bg-cover bg-center rounded-lg overflow-hidden mb-6 border border-amber-100/20 shadow-2xl transition-all duration-500 hover:shadow-3xl hover:shadow-amber-500/30 cursor-pointer"
                  style={{ backgroundImage: `url(${movie.posterUrl})` }}
                  onContextMenu={handleContextMenu}
                >
                  {/* Edge glow effects */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700">
                    {/* Top edge */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-amber-400/60 to-transparent transform -translate-y-2 group-hover:translate-y-0 transition-transform duration-500"></div>
                    {/* Bottom edge */}
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-amber-400/60 to-transparent transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500"></div>
                    {/* Left edge */}
                    <div className="absolute top-0 bottom-0 left-0 w-2 bg-gradient-to-r from-amber-400/60 to-transparent transform -translate-x-2 group-hover:translate-x-0 transition-transform duration-500"></div>
                    {/* Right edge */}
                    <div className="absolute top-0 bottom-0 right-0 w-2 bg-gradient-to-l from-amber-400/60 to-transparent transform translate-x-2 group-hover:translate-x-0 transition-transform duration-500"></div>
                  </div>
                  
                  {/* Corner highlights */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    {/* Top-left corner */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-400/80 transform -translate-x-2 -translate-y-2 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-700"></div>
                    {/* Top-right corner */}
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-400/80 transform translate-x-2 -translate-y-2 group-hover:-translate-x-2 group-hover:translate-y-2 transition-transform duration-700"></div>
                    {/* Bottom-left corner */}
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-400/80 transform -translate-x-2 translate-y-2 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-700"></div>
                    {/* Bottom-right corner */}
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-400/80 transform translate-x-2 translate-y-2 group-hover:-translate-x-2 group-hover:-translate-y-2 transition-transform duration-700"></div>
                  </div>

                  {/* Subtle overlay animation */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  
                  {/* Floating particles effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
                    <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-amber-400/60 rounded-full animate-ping"></div>
                    <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-amber-400/40 rounded-full animate-ping animation-delay-300"></div>
                    <div className="absolute bottom-1/3 left-2/3 w-1 h-1 bg-amber-400/50 rounded-full animate-ping animation-delay-700"></div>
                  </div>

                  {/* Protective overlay to prevent right-click save */}
                  <div className="absolute inset-0 pointer-events-none select-none"></div>
                </div>
              </div>
            </div>
          </section>

          <section id="related-videos" className="mt-16">
            <CarouselRow title={t('video.relatedFilms')} movies={relatedMovies} />
          </section>
          <section 
            id="comments" 
            className={`transition-opacity duration-1000 ${
            visibleSections['comments'] ? 'opacity-100' : 'opacity-0'
            }`}
            >
            <CommentSection videoId={id} />
          </section>
        </div>
      </div>

      <style jsx>{`
        .animation-delay-300 {
          animation-delay: 300ms;
        }
        .animation-delay-700 {
          animation-delay: 700ms;
        }
        .poster-container:hover {
          transform: scale(1.02);
        }
        /* Fullscreen video styling */
        .video-container:fullscreen {
          width: 100vw;
          height: 100vh;
          background: black;
        }
        .video-container:fullscreen video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .video-container:fullscreen.cursor-none {
          cursor: none;
        }
        .video-container:fullscreen.cursor-none * {
          cursor: none;
        }
        /* Webkit browsers (Safari, older Chrome) */
        .video-container:-webkit-full-screen {
          width: 100vw;
          height: 100vh;
          background: black;
        }
        .video-container:-webkit-full-screen video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        /* Firefox */
        .video-container:-moz-full-screen {
          width: 100vw;
          height: 100vh;
          background: black;
        }
        .video-container:-moz-full-screen video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        /* Microsoft Edge */
        .video-container:-ms-fullscreen {
          width: 100vw;
          height: 100vh;
          background: black;
        }
        .video-container:-ms-fullscreen video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      `}</style>
      <Footer />
    </div>
  )
}

export default VideoPlayerPage