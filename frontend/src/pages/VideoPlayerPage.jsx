import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import NavBar from '../components/NavBar'

const videosData = [
  {
    id: 1,
    title: "The Solo",
    director: "Ryan Ma",
    year: 2024,
    image: "Ryan-Ma-2.jpeg",
    videoSrc: "/trimmedmovie.mov", // Using the video from public folder
    description: "A powerful superhero origin story that follows Carol Danvers as she becomes one of the universe's most powerful heroes.",
    duration: "2h 4m",
    rating: "PG-13",
    genre: "Action, Adventure, Sci-Fi",
    cast: ["Brie Larson", "Samuel L. Jackson", "Ben Mendelsohn"]
  },
  {
    id: 2,
    title: "Pacific Rim",
    director: "Jean Dupont",
    year: 2024,
    image: "wallpaper-2.jpg",
    videoSrc: "/varun_sign.mp4", // Using the same video for demo purposes
    description: "As a war between humankind and monstrous sea creatures wages on, a former pilot and a trainee are paired up to drive a seemingly obsolete special weapon in a desperate effort to save the world from the apocalypse.",
    duration: "2h 11m",
    rating: "PG-13",
    genre: "Action, Adventure, Sci-Fi",
    cast: ["Idris Elba", "Charlie Hunnam", "Rinko Kikuchi"]
  },
  {
    id: 3,
    title: "TRON: Legacy",
    director: "Marcus Johnson",
    year: 2024,
    image: "wallpaper-3.jpg",
    videoSrc: "/varun_sign.mp4", // Using the same video for demo purposes
    description: "The son of a virtual world designer goes looking for his father and ends up inside the digital world that his father designed. He meets his father's corrupted creation and a unique ally who was born inside the digital world.",
    duration: "2h 5m",
    rating: "PG",
    genre: "Action, Adventure, Sci-Fi",
    cast: ["Jeff Bridges", "Garrett Hedlund", "Olivia Wilde"]
  }
];

const getRelatedVideos = (currentId) => {
  return videosData.filter(video => video.id !== parseInt(currentId));
};

const VideoPlayerPage = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [visibleSections, setVisibleSections] = useState({});
  const videoRef = useRef(null);
  const { id } = useParams(); 
  

  const videoData = videosData.find(video => video.id === parseInt(id)) || videosData[0];
  const relatedVideos = getRelatedVideos(id);

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


  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };


  useEffect(() => {
    let animationFrameId;
    
    const updateProgress = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
      }
      animationFrameId = requestAnimationFrame(updateProgress);
    };
    
    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateProgress);
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <NavBar />
      
      <div className="relative min-h-screen pt-20">

        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 -right-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

          <section 
            id="video-player" 
            className={`mb-12 transition-opacity duration-1000 ${
              visibleSections['video-player'] ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="relative aspect-video bg-black/40 border border-amber-100/20 overflow-hidden mb-6">

              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                onLoadedMetadata={handleLoadedMetadata}
                onClick={togglePlay}
                poster={videoData.image}
                playsInline
              >
                <source src={videoData.videoSrc} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              
    
              {!isPlaying && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                  onClick={togglePlay}
                >
                  <div className="w-20 h-20 flex items-center justify-center border-2 border-white/50 rounded-full bg-black/30 hover:bg-black/50 transition-colors">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              )}
              

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex flex-col space-y-2">
                 
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-amber-100/60">{formatTime(currentTime)}</span>
                    <div className="relative flex-1 h-1 bg-white/20 rounded-none cursor-pointer" onClick={(e) => {
                      const bounds = e.currentTarget.getBoundingClientRect();
                      const percent = (e.clientX - bounds.left) / bounds.width;
                      const newTime = percent * duration;
                      if (videoRef.current) {
                        videoRef.current.currentTime = newTime;
                        setCurrentTime(newTime);
                      }
                    }}>
                      <div 
                        className="absolute top-0 left-0 h-full bg-amber-500/70 rounded-none"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      ></div>
                      <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-xs text-amber-100/60">{formatTime(duration)}</span>
                  </div>
                  
               
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={togglePlay}
                      className="text-white/80 hover:text-white transition-colors"
                    >
                      {isPlaying ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    
               
                    <div className="flex items-center space-x-2 volume-slider">
                      <button 
                        className="text-white/80 hover:text-white transition-colors"
                        onClick={() => {
                          if (videoRef.current) {
                            const newVolume = volume === 0 ? 1 : 0;
                            videoRef.current.volume = newVolume;
                            setVolume(newVolume);
                          }
                        }}
                      >
                        {volume === 0 ? (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                          </svg>
                        )}
                      </button>
                      <div className="relative w-20 h-1 bg-white/20 rounded-none cursor-pointer" onClick={(e) => {
                        const bounds = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - bounds.left) / bounds.width;
                        const newVolume = Math.max(0, Math.min(1, percent));
                        if (videoRef.current) {
                          videoRef.current.volume = newVolume;
                          setVolume(newVolume);
                        }
                      }}>
                        <div 
                          className="absolute top-0 left-0 h-full bg-amber-500/70 rounded-none"
                          style={{ width: `${volume * 100}%` }}
                        ></div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                    
  
                    <button 
                      className="text-white/80 hover:text-white transition-colors ml-auto"
                      onClick={() => {
                        if (videoRef.current) {
                          if (document.fullscreenElement) {
                            document.exitFullscreen();
                          } else {
                            videoRef.current.requestFullscreen();
                          }
                        }
                      }}
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

      
          <section 
            id="video-info" 
            className={`mb-16 transition-opacity duration-1000 ${
              visibleSections['video-info'] ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="border border-amber-100/20 p-8 bg-white/5">
              <h1 className="text-4xl font-light mb-2">{videoData.title}</h1>
              <div className="flex flex-wrap gap-4 text-amber-100/60 mb-6">
                <span>{videoData.director}</span>
                <span>•</span>
                <span>{videoData.year}</span>
                <span>•</span>
                <span>{videoData.duration}</span>
                <span>•</span>
                <span>{videoData.rating}</span>
              </div>
              
              <p className="text-lg text-white/80 mb-8 leading-relaxed">
                {videoData.description}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4 border-b border-amber-100/20 pb-2">Genre</h3>
                  <p className="text-amber-100/60">{videoData.genre}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4 border-b border-amber-100/20 pb-2">Cast</h3>
                  <div className="space-y-2">
                    {videoData.cast.map((actor, index) => (
                      <div key={index} className="text-amber-100/60">{actor}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

    
          <section 
            id="related-videos" 
            className={`transition-opacity duration-1000 ${
              visibleSections['related-videos'] ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <h2 className="text-2xl font-light mb-8 border-b border-amber-100/20 pb-4">Related Films</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedVideos.map((video) => (
                <Link 
                  key={video.id}
                  to={`/video/${video.id}`}
                  className="group relative aspect-video bg-cover bg-center rounded-none overflow-hidden cursor-pointer border border-amber-100/20"
                  style={{ backgroundImage: `url(${video.image})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 p-4">
                      <h3 className="text-xl font-light mb-1">{video.title}</h3>
                      <p className="text-amber-100/60 text-sm">{video.director} • {video.year}</p>
                      <p className="text-amber-100/60 text-sm">{video.duration}</p>
                    </div>
                  </div>
                  
              
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 flex items-center justify-center border-2 border-white/50 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
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