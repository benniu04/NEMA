import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import API_BASE_URL from '../../config/api.js'
import CommentSection from '../components/CommentSection'
import ReviewSection from '../components/ReviewSection'

const VideoPlayerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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

  // Fetch movie data and related movies
  useEffect(() => {
    const fetchMovieAndRelated = async () => {
      try {
        const movieResponse = await fetch(`${API_BASE_URL}/api/movies/${id}`);
        if (!movieResponse.ok) {
          throw new Error('Failed to fetch movie');
        }
        const movieData = await movieResponse.json();
        
        setMovie(movieData);

        // Set the first available quality as default
        const availableQualities = Object.entries(movieData.videoUrls || {}).filter(([quality, url]) => url && url.trim() !== '');
        
        if (availableQualities.length > 0) {
          const firstQuality = availableQualities[0][0];
          setSelectedQuality(firstQuality);
        }

        // Fetch related movies (excluding current movie)
        const relatedResponse = await fetch(`${API_BASE_URL}/api/movies?limit=3&exclude=${id}`);
        if (!relatedResponse.ok) {
          throw new Error('Failed to fetch related movies');
        }
        const relatedData = await relatedResponse.json();
        console.log('Related movies:', relatedData);
        setRelatedMovies(relatedData);
      } catch (err) {
        console.error('Error fetching movie data:', err);
        setError('Failed to load movie. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMovieAndRelated();
  }, [id]);

  // Handle video player controls visibility
  useEffect(() => {
    const handleMouseMove = () => {
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

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isSeeking]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
  }, [loading, relatedMovies.length]);   // <— re-attach when content appears

  // Prevent video download and right-click
  const handleContextMenu = (e) => {
    e.preventDefault();
    return false;
  };

  // Disable keyboard shortcuts that could be used to download
  const handleKeyDown = (e) => {
    // Prevent Ctrl+S, Ctrl+U, F12, etc.
    if ((e.ctrlKey && (e.key === 's' || e.key === 'u')) || e.key === 'F12') {
      e.preventDefault();
      return false;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video || !video.src) return;
    
    if (video.paused) {
      video.play();
      setIsPlaying(true);
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
    
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
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
    const video = videoRef.current;
    if (!video || !movie.videoUrls[quality]) return;
    
    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;
    
    setSelectedQuality(quality);
    video.src = movie.videoUrls[quality];
    
    // Wait for video to load before setting time
    const handleLoadedData = () => {
      video.currentTime = currentTime;
      if (wasPlaying) {
        video.play();
      }
      video.removeEventListener('loadeddata', handleLoadedData);
    };
    
    video.addEventListener('loadeddata', handleLoadedData);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    // Already in FS ⇒ exit
    if (document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement) {
      if (document.exitFullscreen)        document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen)     document.msExitFullscreen();
      return;
    }

    // Enter FS (mobile-safe)
    if (video.requestFullscreen)               video.requestFullscreen();
    else if (video.webkitRequestFullscreen)    video.webkitRequestFullscreen();   // Android Chrome
    else if (video.webkitEnterFullscreen)      video.webkitEnterFullscreen();     // iOS Safari
    else if (video.msRequestFullscreen)        video.msRequestFullscreen();
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
          <div className="text-amber-100/60">Loading movie...</div>
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
            <div className="video-container relative aspect-video bg-black rounded-none overflow-hidden">
              {movie && selectedQuality && movie.videoUrls[selectedQuality] ? (
                <video
                  ref={videoRef}
                  src={movie.videoUrls[selectedQuality]}
                  className="w-full h-full"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onClick={handlePlayPause}
                  onContextMenu={handleContextMenu}
                  controlsList="nodownload nofullscreen noremoteplayback"
                  disablePictureInPicture
                  playsInline
                  preload="metadata"
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
                  <p className="text-white/60">No video available</p>
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

                  <div className="flex items-center space-x-4">
                    <select
                      value={selectedQuality}
                      onChange={(e) => handleQualityChange(e.target.value)}
                      className="bg-white/5 border border-amber-100/20 rounded-none px-2 py-1 text-sm focus:outline-none focus:border-amber-100/40 transition-colors"
                    >
                      {getAvailableQualities().map(([quality, url]) => (
                        <option key={quality} value={quality}>{quality}</option>
                      ))}
                    </select>

                    <button
                      onClick={toggleFullscreen}
                      className="text-white hover:text-amber-500 transition-colors"
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
                  {movie.rating && (
                    <>
                      <span className="text-amber-100/40">•</span>
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-amber-400 font-medium">{movie.rating}/10</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Description Section - Enhanced */}
              <div className="mb-10">
                <div className="relative">
                  <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-amber-500 to-amber-600 rounded-full"></div>
                  <div className="pl-8">
                    <h2 className="text-xl font-medium text-amber-100/90 mb-4 tracking-wide">Synopsis</h2>
                    <div className="prose prose-lg max-w-none">
                      <p className="text-gray-200 leading-relaxed text-lg font-light tracking-wide leading-8">
                        {movie.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Review block */}
              <ReviewSection movieId={id} />

              {/* Movie Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-amber-100/10 rounded-lg p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-amber-100/90 font-medium mb-3 text-sm uppercase tracking-wider">Genre</h3>
                    <div className="flex flex-wrap gap-2">
                      {movie.genre.map((g, index) => (
                        <span key={index} className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-100/80 text-sm">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-amber-100/90 font-medium mb-3 text-sm uppercase tracking-wider">Language</h3>
                    <p className="text-gray-200 text-lg">{movie.language}</p>
                  </div>
                </div>
                
                {movie.cast && (
                  <div>
                    <h3 className="text-amber-100/90 font-medium mb-3 text-sm uppercase tracking-wider">Cast</h3>
                    <div className="space-y-2">
                      {movie.cast.slice(0, 5).map((actor, index) => (
                        <div key={index} className="text-gray-200 text-lg">
                          {actor}
                        </div>
                      ))}
                      {movie.cast.length > 5 && (
                        <div className="text-amber-100/60 text-sm italic">
                          +{movie.cast.length - 5} more
                        </div>
         
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24">
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

          <section 
            id="related-videos" 
            className={`mt-16 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-amber-100/10 rounded-lg p-8 transition-opacity duration-1000 ${
              visibleSections['related-videos'] ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <h2 className="text-2xl font-light mb-8 text-amber-100/90">Related Films</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {!relatedMovies || relatedMovies.length === 0 ? (
                <div className="text-amber-100/60">No related films available</div>
              ) : (
                relatedMovies.map((movie) => (
                  <Link 
                    key={movie._id}
                    to={`/video/${movie._id}`}
                    className="group relative aspect-video rounded-lg overflow-hidden cursor-pointer border border-amber-100/20 transition-all duration-300 hover:border-amber-100/40"
                    style={{
                      backgroundImage: `url(${movie.thumbnailUrl || movie.posterUrl || '/placeholder-thumb.jpg'})`
                    }}
                    onContextMenu={handleContextMenu}
                  >
                    <img
                      src={movie.thumbnailUrl || movie.posterUrl || '/placeholder-thumb.jpg'}
                      alt={movie.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = '/placeholder-thumb.jpg'; }}
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 p-4">
                        <h3 className="text-xl font-light mb-1">{movie.title}</h3>
                        <p className="text-amber-100/60 text-sm">{movie.director} • {new Date(movie.releaseDate).getFullYear()}</p>
                        <p className="text-amber-100/60 text-sm">{movie.genre.join(', ')}</p>
                      </div>
                    </div>
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 flex items-center justify-center border-2 border-white/50 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
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
      `}</style>
    </div>
  )
}

export default VideoPlayerPage