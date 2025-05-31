import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'

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
  const controlsTimeoutRef = React.useRef(null);
  const [visibleSections, setVisibleSections] = useState({});
  const videoRef = useRef(null);

  // Fetch movie data and related movies
  useEffect(() => {
    const fetchMovieAndRelated = async () => {
      try {
        // Fetch the main movie
        const movieResponse = await fetch(`http://localhost:5000/api/movies/${id}`);
        if (!movieResponse.ok) {
          throw new Error('Failed to fetch movie');
        }
        const movieData = await movieResponse.json();
        setMovie(movieData);

        // Set the first available quality as default
        const availableQualities = Object.entries(movieData.videoUrls).filter(([quality, url]) => url && url.trim() !== '');
        if (availableQualities.length > 0) {
          setSelectedQuality(availableQualities[0][0]);
        }

        // Fetch related movies (excluding current movie)
        const relatedResponse = await fetch(`http://localhost:5000/api/movies?limit=3&exclude=${id}`);
        if (!relatedResponse.ok) {
          throw new Error('Failed to fetch related movies');
        }
        const relatedData = await relatedResponse.json();
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
        if (isPlaying) {
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
  }, [isPlaying]);

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

  useEffect(() => {
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
    setCurrentTime(e.target.currentTime);
    setDuration(e.target.duration);
  };

  const handleSeek = (e) => {
    const video = document.querySelector('video');
    const seekTime = (e.nativeEvent.offsetX / e.target.offsetWidth) * duration;
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (e) => {
    const video = document.querySelector('video');
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleMute = () => {
    const video = document.querySelector('video');
    if (isMuted) {
      video.volume = volume;
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
    video.currentTime = currentTime;
    
    if (wasPlaying) {
      video.play();
    }
  };

  const toggleFullscreen = () => {
    const videoContainer = document.querySelector('.video-container');
    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get available video qualities (only those with valid URLs)
  const getAvailableQualities = () => {
    if (!movie?.videoUrls) return [];
    return Object.entries(movie.videoUrls).filter(([quality, url]) => url && url.trim() !== '');
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
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onClick={handlePlayPause}
                />
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
                <div 
                  className="relative h-1 bg-white/20 mb-4 cursor-pointer"
                  onClick={handleSeek}
                >
                  <div 
                    className="absolute h-full bg-amber-500"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
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
                        value={volume}
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
              <h1 className="text-4xl font-light mb-4 tracking-wide">{movie.title}</h1>
              <div className="flex items-center space-x-4 text-amber-100/60 mb-6">
                <span>{movie.director}</span>
                <span>•</span>
                <span>{new Date(movie.releaseDate).getFullYear()}</span>
                {movie.rating && (
                  <>
                    <span>•</span>
                    <span>Rating: {movie.rating}/10</span>
                  </>
                )}
              </div>
              <p className="text-lg text-gray-300 leading-relaxed mb-8">{movie.description}</p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-amber-100/80 mb-2">Genre</h3>
                  <p className="text-gray-300">{movie.genre.join(', ')}</p>
                </div>
                <div>
                  <h3 className="text-amber-100/80 mb-2">Language</h3>
                  <p className="text-gray-300">{movie.language}</p>
                </div>
                {movie.cast && (
                  <div>
                    <h3 className="text-amber-100/80 mb-2">Cast</h3>
                    <p className="text-gray-300">{movie.cast.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="aspect-[2/3] bg-cover bg-center rounded-none overflow-hidden mb-6"
                style={{ backgroundImage: `url(${movie.posterUrl})` }}
              />
            </div>
          </section>

          <section 
            id="related-videos" 
            className={`mt-16 transition-opacity duration-1000 ${
              visibleSections['related-videos'] ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <h2 className="text-2xl font-light mb-8 border-b border-amber-100/20 pb-4">Related Films</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedMovies.map((movie) => (
                <Link 
                  key={movie._id}
                  to={`/video/${movie._id}`}
                  className="group relative aspect-video bg-cover bg-center rounded-none overflow-hidden cursor-pointer border border-amber-100/20"
                  style={{ backgroundImage: `url(${movie.thumbnailUrl})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
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
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default VideoPlayerPage