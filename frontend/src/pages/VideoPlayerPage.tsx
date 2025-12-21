import React, { useState, useEffect, useRef, MouseEvent, KeyboardEvent as ReactKeyboardEvent, ChangeEvent } from 'react'
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

import { Movie } from '../types'

interface TrackProgressResponse {
  completionPercentage: number
}

type SubtitleSize = 'small' | 'medium' | 'large'

const VideoPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isAuthenticated, addToFavorites, removeFromFavorites, isInFavorites: checkIsInFavorites } = useUser()
  const { t } = useSettings()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [relatedMovies, setRelatedMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [selectedQuality, setSelectedQuality] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [volume, setVolume] = useState<number>(1)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [showControls, setShowControls] = useState<boolean>(true)
  const [isSeeking, setIsSeeking] = useState<boolean>(false)
  const [isHoveringProgress, setIsHoveringProgress] = useState<boolean>(false)
  const [hoverTime, setHoverTime] = useState<number>(0)
  const [hoverPosition, setHoverPosition] = useState<number>(0)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({})
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const progressBarRef = useRef<HTMLDivElement | null>(null)
  const videoContainerRef = useRef<HTMLDivElement | null>(null)

  // Playback speed state
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false)
  const speedOptions: number[] = [0.5, 0.75, 1, 1.25, 1.5, 2]

  // Subtitle state
  const [showSubtitleMenu, setShowSubtitleMenu] = useState<boolean>(false)
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('off')
  const [subtitleSize, setSubtitleSize] = useState<SubtitleSize>('medium')
  const subtitleSizes: Record<SubtitleSize, string> = { small: '14px', medium: '18px', large: '24px' }
  
  // Show settings menu
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false)
  
  // Watchlist state
  const [isInWatchlist, setIsInWatchlist] = useState<boolean>(false)
  const [watchlistLoading, setWatchlistLoading] = useState<boolean>(false)
  
  // Favorites state
  const [isInFavoritesList, setIsInFavoritesList] = useState<boolean>(false)
  const [favoritesLoading, setFavoritesLoading] = useState<boolean>(false)
  
  // Watch time tracking state
  const [sessionId] = useState<string>(() => {
    const stored = localStorage.getItem(`watchSession_${id}`)
    if (stored) return stored
    const newSessionId = uuidv4()
    localStorage.setItem(`watchSession_${id}`, newSessionId)
    return newSessionId
  })
  const [lastTrackedTime, setLastTrackedTime] = useState<number>(0)
  const [hasTrackedStart, setHasTrackedStart] = useState<boolean>(false)
  const [hasTrackedCompletion, setHasTrackedCompletion] = useState<boolean>(false)
  const watchTimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check if movie is in watchlist
  useEffect(() => {
    if (isAuthenticated && user?.watchlist && id) {
      const inWatchlist = user.watchlist.some((movieId: string | { _id: string }) => {
        const watchlistId = typeof movieId === 'object' ? movieId._id : movieId
        return watchlistId === id
      })
      setIsInWatchlist(inWatchlist)
    }
  }, [user, id, isAuthenticated])

  // Check if movie is in favorites
  useEffect(() => {
    if (isAuthenticated && id) {
      setIsInFavoritesList(checkIsInFavorites(id))
    }
  }, [user, id, isAuthenticated, checkIsInFavorites])

  // Fetch movie data and related movies
  useEffect(() => {
    setLoading(true)
    setError('')
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setShowControls(true)
    setLastTrackedTime(0)
    setHasTrackedStart(false)
    setHasTrackedCompletion(false)
    
    if (watchTimeIntervalRef.current) {
      clearInterval(watchTimeIntervalRef.current)
      watchTimeIntervalRef.current = null
    }
    
    const doc = document as Document & {
      webkitFullscreenElement?: Element
      mozFullScreenElement?: Element
      msFullscreenElement?: Element
      webkitExitFullscreen?: () => void
      mozCancelFullScreen?: () => void
      msExitFullscreen?: () => void
    }
    
    if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
      if (doc.exitFullscreen) {
        doc.exitFullscreen()
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen()
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen()
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen()
      }
    }
    
    const fetchMovieAndRelated = async () => {
      try {
        const [movieResponse, relatedResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/movies/${id}`),
          fetch(`${API_BASE_URL}/api/movies?limit=6&exclude=${id}`)
        ])
        
        if (!movieResponse.ok) {
          throw new Error('Failed to fetch movie')
        }
        const movieData: Movie = await movieResponse.json()
        
        setMovie(movieData)

        const availableQualities = Object.entries(movieData.videoUrls || {}).filter(([, url]) => url && url.trim() !== '')
        
        if (availableQualities.length > 0) {
          const hlsQuality = availableQualities.find(([q]) => q === 'hls')
          const firstQuality = hlsQuality ? hlsQuality[0] : availableQualities[0][0]
          setSelectedQuality(firstQuality)
        }

        if (relatedResponse.ok) {
          const relatedData: Movie[] = await relatedResponse.json()
          setRelatedMovies(relatedData)
        }
      } catch (err) {
        console.error('Error fetching movie data:', err)
        setError('Failed to load movie. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchMovieAndRelated()
    
    return () => {
      localStorage.removeItem(`watchSession_${id}`)
      if (watchTimeIntervalRef.current) {
        clearInterval(watchTimeIntervalRef.current)
        watchTimeIntervalRef.current = null
      }
    }
  }, [id])

  // Handle video player controls visibility
  useEffect(() => {
    const handleInteraction = () => {
      setShowControls(true)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying && !isSeeking && !showSettingsMenu && !showSpeedMenu && !showSubtitleMenu) {
          setShowControls(false)
        }
      }, 3000)
    }

    document.addEventListener('mousemove', handleInteraction)
    document.addEventListener('touchstart', handleInteraction)
    document.addEventListener('touchmove', handleInteraction)
    
    return () => {
      document.removeEventListener('mousemove', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
      document.removeEventListener('touchmove', handleInteraction)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying, isSeeking, showSettingsMenu, showSpeedMenu, showSubtitleMenu])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element
        mozFullScreenElement?: Element
        msFullscreenElement?: Element
      }
      const isInFullscreen = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      )
      setIsFullscreen(isInFullscreen)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  // IntersectionObserver for sections
  useEffect(() => {
    if (loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setVisibleSections(prev => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }))
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    )

    const sections = document.querySelectorAll('section[id]')
    sections.forEach(section => observer.observe(section))

    return () => {
      sections.forEach(section => observer.unobserve(section))
    }
  }, [loading, relatedMovies.length])

  // Helper to track watch time
  const trackProgress = async (force: boolean = false): Promise<void> => {
    const video = videoRef.current
    if (!video || !movie || !id || !sessionId || !hasTrackedStart) return

    const currentTimeVal = video.currentTime
    const videoDuration = video.duration || duration
    
    if (!videoDuration) return

    if (force || Math.abs(currentTimeVal - lastTrackedTime) >= 2) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/watch-time/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            movieId: id,
            sessionId: sessionId,
            currentTime: currentTimeVal,
            videoDuration: videoDuration,
            quality: selectedQuality
          })
        })
        
        if (response.ok) {
          const data: TrackProgressResponse = await response.json()
          setLastTrackedTime(currentTimeVal)
          
          if (data.completionPercentage >= 90 && !hasTrackedCompletion && movie?.title) {
            analytics.trackVideoComplete(movie.title)
            setHasTrackedCompletion(true)
          }
        }
      } catch (error) {
        console.error('Error tracking watch time:', error)
      }
    }
  }

  // Track watch time periodically
  useEffect(() => {
    if (!movie || !videoRef.current || !duration || loading) return

    const interval = setInterval(() => {
      if (!videoRef.current?.paused) {
        trackProgress()
      }
    }, 5000)

    watchTimeIntervalRef.current = interval

    return () => {
      clearInterval(interval)
      watchTimeIntervalRef.current = null
      
      if (hasTrackedStart && videoRef.current) {
        const finalTime = videoRef.current.currentTime
        const finalDuration = videoRef.current.duration || duration
        
        if (finalDuration > 0) {
          fetch(`${API_BASE_URL}/api/watch-time/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            fetch(`${API_BASE_URL}/api/watch-time/end`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              keepalive: true,
              body: JSON.stringify({ movieId: id, sessionId: sessionId })
            }).catch(err => console.error('Error ending session:', err))
          }).catch(err => console.error('Error in final tracking:', err))
        }
      }
    }
  }, [movie, id, sessionId, duration, selectedQuality, lastTrackedTime, hasTrackedStart, hasTrackedCompletion, loading])

  const handleContextMenu = (e: MouseEvent<HTMLElement>): boolean => {
    e.preventDefault()
    return false
  }

  const handleKeyDown = (e: globalThis.KeyboardEvent): void => {
    const tag = ((e.target as HTMLElement).tagName || '').toLowerCase()
    if (['input', 'textarea', 'select'].includes(tag)) return

    if ((e.ctrlKey && (e.key === 's' || e.key === 'u')) || e.key === 'F12') {
      e.preventDefault()
      return
    }

    const video = videoRef.current
    if (!video) return

    switch (e.key.toLowerCase()) {
      case ' ':
      case 'k':
        e.preventDefault()
        handlePlayPause()
        break
      case 'j':
        video.currentTime = Math.max(0, video.currentTime - 10)
        break
      case 'l':
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10)
        break
      case 'arrowleft':
        e.preventDefault()
        video.currentTime = Math.max(0, video.currentTime - 5)
        break
      case 'arrowright':
        e.preventDefault()
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 5)
        break
      case 'arrowdown':
        e.preventDefault()
        handleVolumeChange(video.volume - 0.1)
        break
      case 'arrowup':
        e.preventDefault()
        handleVolumeChange(video.volume + 0.1)
        break
      case 'm':
        handleMute()
        break
      case 'f':
        toggleFullscreen()
        break
      case '0':
        video.currentTime = 0
        break
      case '1': case '2': case '3': case '4':
      case '5': case '6': case '7': case '8': case '9':
        video.currentTime = (parseInt(e.key, 10) / 10) * duration
        break
      default:
        break
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [duration])

  // Handle video source initialization
  useEffect(() => {
    let hls: Hls | null = null
    
    const initializeVideo = () => {
      const video = videoRef.current
      if (!video) {
        requestAnimationFrame(initializeVideo)
        return
      }
      if (!movie || !selectedQuality) return

      const videoUrl = movie.videoUrls[selectedQuality]
      if (!videoUrl) return
      
      initVideoSource(video, videoUrl)
    }
    
    const initVideoSource = (video: HTMLVideoElement, videoUrl: string) => {
      const resumeTimeParam = searchParams.get('t')
      const resumeTime = resumeTimeParam && !isNaN(Number(resumeTimeParam)) ? parseInt(resumeTimeParam, 10) : null
      const previousTime = resumeTime !== null ? resumeTime : video.currentTime
      const wasPlaying = !video.paused
      
      if (selectedQuality === 'hls' || videoUrl.endsWith('.m3u8')) {
        if (Hls.isSupported()) {
          hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: false,
          })
          hls.loadSource(videoUrl)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.currentTime = previousTime
            if (wasPlaying) video.play().catch(e => console.error("Auto-play blocked:", e))
          })
          hls.on(Hls.Events.ERROR, (_, data) => {
            console.error('HLS error:', data.type, data.details, data)
            if (data.fatal && hls) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad()
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError()
                  break
                default:
                  hls.destroy()
                  break
              }
            }
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = videoUrl
          video.currentTime = previousTime
        }
      } else {
        video.src = videoUrl
        video.load()
        const handleLoadedMetadata = () => {
          video.currentTime = previousTime
          if (wasPlaying) video.play().catch(e => console.error("Auto-play blocked:", e))
          video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        }
        const handleError = (e: Event) => {
          console.error('Video error:', video.error?.code, video.error?.message, e)
          video.removeEventListener('error', handleError)
        }
        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('error', handleError)
      }
    }
    
    initializeVideo()

    return () => {
      if (hls) {
        hls.destroy()
      }
    }
  }, [movie, selectedQuality, searchParams])

  const handlePlayPause = (): void => {
    const video = videoRef.current
    if (!video) return
    
    if (!video.src) {
      const videoUrl = movie?.videoUrls?.[selectedQuality]
      if (videoUrl) {
        video.src = videoUrl
        video.load()
      } else {
        return
      }
    }
    
    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true)
      }).catch(e => {
        console.error('Play failed:', e)
      })
      
      if (movie?.title) {
        analytics.playVideo(movie.title)
      }
      
      if (!hasTrackedStart) {
        setHasTrackedStart(true)
      }
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>): void => {
    if (!isSeeking) {
      setCurrentTime((e.target as HTMLVideoElement).currentTime)
    }
  }

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>): void => {
    const target = e.target as HTMLVideoElement
    setDuration(target.duration)

    const resumeTime = searchParams.get('t')
    if (resumeTime && !isNaN(Number(resumeTime)) && videoRef.current) {
      const timeInSeconds = parseInt(resumeTime, 10)
      if (timeInSeconds > 0 && timeInSeconds < target.duration) {
        videoRef.current.currentTime = timeInSeconds
        setCurrentTime(timeInSeconds)
        if (!hasTrackedStart) {
          setHasTrackedStart(true)
        }
      }
    }
  }

  const handleSeek = (e: MouseEvent<HTMLDivElement> | globalThis.MouseEvent): void => {
    const video = videoRef.current
    const progressBar = progressBarRef.current
    
    if (!video || !progressBar || !duration || isNaN(duration)) return
    
    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const progressBarWidth = rect.width
    const seekPercentage = Math.max(0, Math.min(1, clickX / progressBarWidth))
    const seekTime = seekPercentage * duration
    
    video.currentTime = seekTime
    setCurrentTime(seekTime)
  }

  const handleProgressHover = (e: MouseEvent<HTMLDivElement>): void => {
    const progressBar = progressBarRef.current
    if (!progressBar || !duration) return
    
    const rect = progressBar.getBoundingClientRect()
    const hoverX = e.clientX - rect.left
    const progressBarWidth = rect.width
    const hoverPercentage = Math.max(0, Math.min(1, hoverX / progressBarWidth))
    
    setHoverTime(hoverPercentage * duration)
    setHoverPosition(hoverX)
  }

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>): void => {
    setIsSeeking(true)
    handleSeek(e)
    
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      handleSeek(e)
    }
    
    const handleMouseUp = () => {
      setIsSeeking(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement> | number): void => {
    const video = videoRef.current
    if (!video) return
    
    const newVolume = typeof e === 'number' ? e : parseFloat(e.target.value)
    video.volume = Math.max(0, Math.min(1, newVolume))
    setVolume(video.volume)
    setIsMuted(video.volume === 0)
  }

  const handleMute = (): void => {
    const video = videoRef.current
    if (!video) return
    
    if (isMuted) {
      video.volume = volume > 0 ? volume : 0.5
      setIsMuted(false)
    } else {
      video.volume = 0
      setIsMuted(true)
    }
  }

  const handleQualityChange = (quality: string): void => {
    setSelectedQuality(quality)
    setShowSettingsMenu(false)
  }

  const handlePlaybackSpeedChange = (speed: number): void => {
    const video = videoRef.current
    if (video) {
      video.playbackRate = speed
      setPlaybackSpeed(speed)
      setShowSpeedMenu(false)
      setShowSettingsMenu(false)
    }
  }

  const handleSubtitleChange = (lang: string): void => {
    const video = videoRef.current
    if (!video) return

    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = 'hidden'
    }

    if (lang !== 'off') {
      for (let i = 0; i < video.textTracks.length; i++) {
        if (video.textTracks[i].language === lang) {
          video.textTracks[i].mode = 'showing'
          break
        }
      }
    }

    setCurrentSubtitle(lang)
    setShowSubtitleMenu(false)
    setShowSettingsMenu(false)
  }

  const handleSubtitleSizeChange = (size: SubtitleSize): void => {
    setSubtitleSize(size)
  }

  const getAvailableSubtitles = (): [string, string][] => {
    if (!movie?.subtitleUrls) return []
    return Object.entries(movie.subtitleUrls).filter(([, url]) => url) as [string, string][]
  }

  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (showSpeedMenu || showSubtitleMenu || showSettingsMenu) {
        const target = e.target as HTMLElement
        if (!target.closest('.settings-menu-container')) {
          setShowSpeedMenu(false)
          setShowSubtitleMenu(false)
          setShowSettingsMenu(false)
        }
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showSpeedMenu, showSubtitleMenu, showSettingsMenu])

  const toggleFullscreen = async (): Promise<void> => {
    const videoContainer = videoContainerRef.current as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>
      mozRequestFullScreen?: () => Promise<void>
      msRequestFullscreen?: () => Promise<void>
    }
    const video = videoRef.current as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void
    }
    
    if (!videoContainer || !video) return

    const doc = document as Document & {
      webkitFullscreenElement?: Element
      mozFullScreenElement?: Element
      msFullscreenElement?: Element
      webkitExitFullscreen?: () => void
      mozCancelFullScreen?: () => void
      msExitFullscreen?: () => void
    }

    const isCurrentlyFullscreen = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    )

    if (isCurrentlyFullscreen) {
      try {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen()
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen()
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen()
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen()
        }
      } catch (err) {
        console.error('Exit fullscreen failed:', err)
      }
      return
    }

    if (video.readyState < 2) {
      await new Promise<void>((resolve) => {
        const onReady = () => {
          video.removeEventListener('loadeddata', onReady)
          resolve()
        }
        video.addEventListener('loadeddata', onReady)
        setTimeout(resolve, 3000)
      })
    }

    try {
      if (videoContainer.requestFullscreen) {
        await videoContainer.requestFullscreen()
      } else if (videoContainer.webkitRequestFullscreen) {
        videoContainer.webkitRequestFullscreen()
      } else if (videoContainer.mozRequestFullScreen) {
        videoContainer.mozRequestFullScreen()
      } else if (videoContainer.msRequestFullscreen) {
        videoContainer.msRequestFullscreen()
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen()
      }
    } catch (err) {
      console.error('Fullscreen request failed:', err)
    }
  }

  const formatTime = (time: number): string => {
    if (!time || isNaN(time)) return '0:00'
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const toggleWatchlist = async (): Promise<void> => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/video/${id}` } } })
      return
    }

    setWatchlistLoading(true)
    try {
      const endpoint = `${API_BASE_URL}/api/users/watchlist/${id}`
      const method = isInWatchlist ? 'DELETE' : 'POST'

      const response = await fetch(endpoint, { method, credentials: 'include' })

      if (response.ok) {
        setIsInWatchlist(!isInWatchlist)
      } else {
        const data = await response.json()
        console.error('Failed to update watchlist:', data.message)
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error)
    } finally {
      setWatchlistLoading(false)
    }
  }

  const toggleFavorites = async (): Promise<void> => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/video/${id}` } } })
      return
    }

    setFavoritesLoading(true)
    try {
      const result = isInFavoritesList
        ? await removeFromFavorites(id!)
        : await addToFavorites(id!)

      if (result.success) {
        setIsInFavoritesList(!isInFavoritesList)
      } else {
        alert(result.error)
      }
    } catch (error) {
      console.error('Error toggling favorites:', error)
      alert('Failed to update favorites. Please try again.')
    } finally {
      setFavoritesLoading(false)
    }
  }

  const getAvailableQualities = (): [string, string][] => {
    if (!movie?.videoUrls) return []
    return Object.entries(movie.videoUrls).filter(([, url]) => url && url.trim() !== '') as [string, string][]
  }

  const getProgressPercentage = (): number => {
    if (!duration || isNaN(duration) || duration === 0) return 0
    return Math.max(0, Math.min(100, (currentTime / duration) * 100))
  }

  const getBufferedPercentage = (): number => {
    const video = videoRef.current
    if (!video || !duration) return 0
    if (video.buffered.length > 0) {
      return (video.buffered.end(video.buffered.length - 1) / duration) * 100
    }
    return 0
  }

  // Skip forward/backward 10 seconds
  const skipForward = () => {
    const video = videoRef.current
    if (video) {
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 10)
    }
  }

  const skipBackward = () => {
    const video = videoRef.current
    if (video) {
      video.currentTime = Math.max(0, video.currentTime - 10)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <NavBar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-white/20 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-white/40 text-sm tracking-widest uppercase">{t('video.loadingMovie')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <NavBar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-red-400 text-lg">{error || 'Movie not found'}</p>
            <Link to="/catalog" className="mt-6 inline-block text-amber-500 hover:text-amber-400 transition-colors">
              ← Back to Catalog
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <NavBar />
      
      {/* Cinematic Video Section */}
      <div className="relative pt-20">
        {/* Video Container */}
        <div 
          ref={videoContainerRef}
          className={`video-container relative w-full bg-black ${isFullscreen ? '' : 'aspect-video max-h-[85vh]'} ${!showControls ? 'cursor-none' : 'cursor-default'}`}
          onMouseEnter={() => setShowControls(true)}
        >
            <style>
              {`
                .video-container video::cue {
                  font-size: ${subtitleSizes[subtitleSize]};
                background-color: rgba(0, 0, 0, 0.8);
                  color: white;
                padding: 4px 12px;
                  border-radius: 4px;
                font-family: 'SF Pro Display', -apple-system, sans-serif;
                }
              `}
            </style>
          
              {movie && selectedQuality && movie.videoUrls[selectedQuality] ? (
                <video
                  ref={videoRef}
              className="w-full h-full object-contain bg-black"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => {
                    setIsPlaying(true)
                    if (!hasTrackedStart) {
                      setHasTrackedStart(true)
                    }
                  }}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => {
                    setIsPlaying(false)
                    trackProgress(true)
                  }}
                  onClick={handlePlayPause}
                  onContextMenu={handleContextMenu}
                  controlsList="nodownload nofullscreen noremoteplayback"
                  disablePictureInPicture
                  playsInline
                  preload="auto"
                >
                  {movie.subtitleUrls && Object.entries(movie.subtitleUrls).map(
                    ([lang, url], idx) => url && (
                      <track
                        key={idx}
                        src={url}
                        kind="subtitles"
                        srcLang={lang}
                        label={lang.toUpperCase()}
                        default={lang === 'en'}
                      />
                    )
                  )}
                </video>
              ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-white/40">{t('video.noVideo')}</p>
              </div>
                </div>
              )}
              
          {/* Large Center Play Button (when paused) */}
          {!isPlaying && movie && selectedQuality && movie.videoUrls[selectedQuality] && (
            <button
              onClick={handlePlayPause}
              className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-100 hover:bg-black/30 transition-all duration-300 group"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300">
                <svg className="w-10 h-10 md:w-12 md:h-12 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
          )}

          {/* Gradient Overlays */}
          <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className={`absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}></div>

          {/* Top Bar - Title and Back Button */}
          <div className={`absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden md:inline text-sm font-medium">Back</span>
            </button>
            
            <h1 className="text-lg md:text-xl font-medium text-white/90 truncate max-w-[60%]">{movie.title}</h1>
            
            <div className="w-16"></div>
          </div>

          {/* Center Controls (Skip buttons) - Only visible when controls are shown */}
          <div className={`absolute inset-0 flex items-center justify-center gap-16 md:gap-24 pointer-events-none transition-opacity duration-300 ${showControls && isPlaying ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={skipBackward}
              className="pointer-events-auto w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all duration-200"
            >
              <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
              <span className="absolute -bottom-6 text-xs text-white/60">10s</span>
            </button>
            
            <button
              onClick={handlePlayPause}
              className="pointer-events-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all duration-200"
            >
              {isPlaying ? (
                <svg className="w-8 h-8 md:w-10 md:h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 md:w-10 md:h-10 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            
            <button
              onClick={skipForward}
              className="pointer-events-auto w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all duration-200"
            >
              <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
              <span className="absolute -bottom-6 text-xs text-white/60">10s</span>
            </button>
          </div>

          {/* Bottom Controls */}
          <div className={`absolute bottom-0 left-0 right-0 p-4 md:p-6 transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Progress Bar */}
                <div 
                  ref={progressBarRef}
              className="relative h-1 group cursor-pointer mb-4"
                  onMouseDown={handleMouseDown}
              onMouseEnter={() => setIsHoveringProgress(true)}
              onMouseLeave={() => setIsHoveringProgress(false)}
              onMouseMove={handleProgressHover}
                >
              {/* Background */}
                  <div className="absolute inset-0 bg-white/20 rounded-full"></div>
              
              {/* Buffered */}
              <div 
                className="absolute h-full bg-white/30 rounded-full transition-all"
                style={{ width: `${getBufferedPercentage()}%` }}
              ></div>
              
              {/* Progress */}
              <div 
                className="absolute h-full bg-amber-500 rounded-full transition-all duration-75"
                    style={{ width: `${getProgressPercentage()}%` }}
              ></div>
              
              {/* Scrubber */}
                  <div 
                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-amber-500 rounded-full shadow-lg transition-all duration-150 ${isHoveringProgress || isSeeking ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
                    style={{ 
                      left: `${getProgressPercentage()}%`,
                      transform: 'translateX(-50%) translateY(-50%)'
                    }}
              ></div>

              {/* Hover Time Tooltip */}
              {isHoveringProgress && (
                <div 
                  className="absolute -top-10 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none"
                  style={{ 
                    left: `${hoverPosition}px`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}

              {/* Expand on hover */}
              <div className={`absolute inset-x-0 -top-1 -bottom-1 transition-all duration-200 ${isHoveringProgress ? 'bg-white/5' : ''}`}></div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between gap-4">
              {/* Left Controls */}
              <div className="flex items-center gap-2 md:gap-4">
                {/* Play/Pause */}
                    <button
                      onClick={handlePlayPause}
                  className="w-10 h-10 flex items-center justify-center text-white hover:text-amber-500 transition-colors"
                    >
                      {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>

                {/* Volume */}
                <div className="flex items-center gap-2 group/volume">
                      <button
                        onClick={handleMute}
                    className="w-10 h-10 flex items-center justify-center text-white hover:text-amber-500 transition-colors"
                      >
                    {isMuted || volume === 0 ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                    ) : volume < 0.5 ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                        ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        )}
                      </button>
                  <div className="w-0 group-hover/volume:w-20 overflow-hidden transition-all duration-300">
                      <input
                        type="range"
                        min="0"
                        max="1"
                      step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                      className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      />
                  </div>
                    </div>

                {/* Time Display */}
                <div className="text-sm text-white/80 font-mono tracking-wide hidden sm:block">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-white/40 mx-1">/</span>
                  <span className="text-white/60">{formatTime(duration)}</span>
                    </div>
                  </div>

              {/* Right Controls */}
              <div className="flex items-center gap-1 md:gap-2">
                {/* Subtitles */}
                {getAvailableSubtitles().length > 0 && (
                  <div className="relative settings-menu-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                        setShowSubtitleMenu(!showSubtitleMenu)
                        setShowSpeedMenu(false)
                        setShowSettingsMenu(false)
                        }}
                      className={`w-10 h-10 flex items-center justify-center transition-colors ${currentSubtitle !== 'off' ? 'text-amber-500' : 'text-white hover:text-amber-500'}`}
                      title={t('video.subtitles')}
                      >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                      </button>

                    {showSubtitleMenu && (
                      <div className="absolute bottom-full right-0 mb-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 min-w-[200px] overflow-hidden">
                        <div className="p-3 border-b border-white/10">
                          <p className="text-xs text-white/50 uppercase tracking-wider font-medium">{t('video.subtitles')}</p>
                        </div>
                          <div className="py-1">
                              <button
                            onClick={() => handleSubtitleChange('off')}
                            className={`w-full px-4 py-2.5 text-sm text-left flex items-center justify-between hover:bg-white/10 transition-colors ${currentSubtitle === 'off' ? 'text-amber-500' : 'text-white'}`}
                          >
                            <span>{t('video.off')}</span>
                            {currentSubtitle === 'off' && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                          {getAvailableSubtitles().map(([lang]) => (
                            <button
                              key={lang}
                              onClick={() => handleSubtitleChange(lang)}
                              className={`w-full px-4 py-2.5 text-sm text-left flex items-center justify-between hover:bg-white/10 transition-colors ${currentSubtitle === lang ? 'text-amber-500' : 'text-white'}`}
                            >
                              <span>{t(`video.subtitle.${lang}`) || lang.toUpperCase()}</span>
                              {currentSubtitle === lang && (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                              </button>
                            ))}
                          </div>
                        {currentSubtitle !== 'off' && (
                          <div className="border-t border-white/10 py-1">
                            <div className="px-3 py-2">
                              <p className="text-xs text-white/50 uppercase tracking-wider font-medium">{t('video.size')}</p>
                        </div>
                            {(Object.keys(subtitleSizes) as SubtitleSize[]).map((size) => (
                              <button
                                key={size}
                                onClick={() => handleSubtitleSizeChange(size)}
                                className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between hover:bg-white/10 transition-colors ${subtitleSize === size ? 'text-amber-500' : 'text-white'}`}
                              >
                                <span>{t(`video.subtitle.${size}`)}</span>
                                {subtitleSize === size && (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            ))}
                    </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Settings (Speed + Quality) */}
                <div className="relative settings-menu-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                      setShowSettingsMenu(!showSettingsMenu)
                          setShowSpeedMenu(false)
                      setShowSubtitleMenu(false)
                    }}
                    className="w-10 h-10 flex items-center justify-center text-white hover:text-amber-500 transition-colors"
                    title="Settings"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>

                  {showSettingsMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 min-w-[220px] overflow-hidden">
                      {/* Quality */}
                      <div className="p-3 border-b border-white/10">
                        <p className="text-xs text-white/50 uppercase tracking-wider font-medium mb-2">{t('video.quality') || 'Quality'}</p>
                        <div className="flex flex-wrap gap-2">
                          {getAvailableQualities().map(([quality]) => (
                            <button
                              key={quality}
                              onClick={() => handleQualityChange(quality)}
                              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${selectedQuality === quality ? 'bg-amber-500 text-black font-medium' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            >
                              {quality === 'hls' ? 'Auto' : quality}
                            </button>
                          ))}
                              </div>
                      </div>
                      
                      {/* Speed */}
                      <div className="p-3">
                        <p className="text-xs text-white/50 uppercase tracking-wider font-medium mb-2">{t('video.playbackSpeed')}</p>
                        <div className="flex flex-wrap gap-2">
                          {speedOptions.map((speed) => (
                                  <button
                              key={speed}
                              onClick={() => handlePlaybackSpeedChange(speed)}
                              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${playbackSpeed === speed ? 'bg-amber-500 text-black font-medium' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            >
                              {speed === 1 ? 'Normal' : `${speed}x`}
                                  </button>
                                ))}
                              </div>
                          </div>
                        </div>
                      )}
                    </div>

                {/* Fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                  className="w-10 h-10 flex items-center justify-center text-white hover:text-amber-500 transition-colors"
                      title={t('video.fullscreen')}
                    >
                      {isFullscreen ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M15 9h4.5M15 9V4.5M9 15v4.5M9 15H4.5M15 15h4.5M15 15v4.5" />
                        </svg>
                      ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
                </div>
              </div>

      {/* Movie Info Section */}
      <div className="relative bg-gradient-to-b from-black via-[#0a0a0a] to-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            {/* Main Content */}
            <div className="lg:col-span-8 space-y-12">
              {/* Title & Actions */}
                  <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-white mb-6 leading-tight">
                  {movie.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-white/60 mb-8">
                  <span className="text-lg">{new Date(movie.releaseDate).getFullYear()}</span>
                  <span className="w-1 h-1 rounded-full bg-white/40"></span>
                  <span className="text-lg">{movie.director}</span>
                  {movie.rating && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-white/40"></span>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-amber-500 font-medium">{movie.rating.toFixed(1)}</span>
                        </div>
                    </>
                  )}
            </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                <button
                  onClick={toggleWatchlist}
                  disabled={watchlistLoading}
                    className={`group flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    isInWatchlist
                        ? 'bg-amber-500 text-black hover:bg-amber-400'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  } ${watchlistLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {watchlistLoading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : isInWatchlist ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                  ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                  )}
                    <span>{isInWatchlist ? t('video.inWatchlist') : t('video.addToWatchlist')}</span>
                </button>

                <button
                  onClick={toggleFavorites}
                  disabled={favoritesLoading}
                    className={`group flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    isInFavoritesList
                        ? 'bg-rose-500 text-white hover:bg-rose-400'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  } ${favoritesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {favoritesLoading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className={`w-5 h-5 transition-transform group-hover:scale-110 ${isInFavoritesList ? 'fill-current' : ''}`} fill={isInFavoritesList ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                  )}
                    <span>{isInFavoritesList ? t('video.inFavorites') : t('video.addToFavorites')}</span>
                </button>
                </div>
              </div>

              {/* Synopsis */}
              <div className="relative">
                <div className="absolute -left-4 md:-left-8 top-0 w-px h-full bg-gradient-to-b from-amber-500 via-amber-500/50 to-transparent"></div>
                <div className="pl-4 md:pl-8">
                  <h2 className="text-sm font-medium text-amber-500 uppercase tracking-widest mb-4">{t('video.synopsis')}</h2>
                  <p className="text-lg md:text-xl text-white/80 font-light leading-relaxed">
                    {movie.description}
                  </p>
                </div>
                  </div>
                  
              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-6 md:p-8 bg-white/[0.02] rounded-2xl border border-white/5">
                <div>
                  <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest mb-3">{t('video.genre')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {movie.genre.map((g, index) => (
                      <span key={index} className="px-4 py-1.5 bg-amber-500/10 text-amber-500/90 rounded-full text-sm font-medium">
                        {g}
                      </span>
                    ))}
                  </div>
                  </div>

                <div>
                  <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest mb-3">{t('video.language')}</h3>
                  <p className="text-white/90 text-lg">{movie.language}</p>
                </div>

                {movie.cast && movie.cast.length > 0 && (
                  <div className="sm:col-span-2">
                    <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest mb-3">{t('video.cast')}</h3>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {movie.cast.slice(0, 8).map((actor, index) => (
                        <span key={index} className="text-white/80">{actor}</span>
                      ))}
                      {movie.cast.length > 8 && (
                        <span className="text-white/40">+{movie.cast.length - 8} more</span>
                      )}
                    </div>
                  </div>
                )}
                  </div>

              {/* Reviews */}
              <ReviewSection movieId={id!} movieTitle={movie?.title} />
                </div>

            {/* Sidebar - Poster */}
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <div 
                  className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5 relative group"
                  onContextMenu={handleContextMenu}
                >
                  <img 
                    src={movie.posterUrl} 
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Decorative corner accents */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-amber-500/0 group-hover:border-amber-500/60 transition-colors duration-500"></div>
                  <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-amber-500/0 group-hover:border-amber-500/60 transition-colors duration-500"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-amber-500/0 group-hover:border-amber-500/60 transition-colors duration-500"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-amber-500/0 group-hover:border-amber-500/60 transition-colors duration-500"></div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Films */}
      {relatedMovies.length > 0 && (
        <section id="related-videos" className="bg-[#0a0a0a] py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <CarouselRow title={t('video.relatedFilms')} movies={relatedMovies} />
          </div>
          </section>
      )}

      {/* Comments */}
          <section 
            id="comments" 
        className={`bg-[#0a0a0a] py-12 md:py-16 transition-opacity duration-1000 ${
          visibleSections['comments'] ? 'opacity-100' : 'opacity-50'
            }`}
            >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <CommentSection videoId={id!} />
        </div>
      </section>

      <Footer />

      <style>{`
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
        
        /* Custom range input styling */
        input[type="range"] {
          -webkit-appearance: none;
          background: transparent;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #f59e0b;
          margin-top: -4px;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-track {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
        input[type="range"]::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #f59e0b;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}

export default VideoPlayerPage
