import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import Hls from 'hls.js'
import NavBar from '../components/NavBar'
import API_BASE_URL from '../config/api'
import { useSettings } from '../context/SettingsContext'
import { useUser } from '../context/UserContext'
import { ChevronDown, ChevronLeft, ChevronRight, Filter, X, Play, Info, ArrowRight, Volume2, VolumeX, RotateCcw } from 'lucide-react'

// Type definitions
interface Movie {
  _id: string
  title: string
  description?: string
  director?: string
  genre?: string[]
  releaseDate?: string
  createdAt?: string
  duration?: number
  language?: string
  rating?: number
  thumbnailUrl?: string
  posterUrl?: string
  videoUrls?: {
    '720p'?: string
    '1080p'?: string
    hls?: string
    [key: string]: string | undefined
  }
}

interface WatchSession {
  _id: string
  movieId: Movie | null
  maxTimeReached: number
  videoDuration: number
  completionPercentage: number
}

interface RecommendedMovie extends Movie {
  recommendationType?: 'behavior' | 'personalized' | 'popular'
}

interface Testimonial {
  quote: string
  author: string
  role: string
}

interface FAQItem {
  question: string
  answer: string
}

interface VisibleSections {
  [key: string]: boolean
}

// Testimonials from directors and filmmakers
const testimonials: Testimonial[] = [
  {
    quote: "NEMA's platform gave my indie film the visibility it deserved. They truly care about authentic storytelling.",
    author: "Isabella Chen",
    role: "Independent Filmmaker"
  },
  {
    quote: "A revolutionary space for emerging voices in cinema. NEMA connects artists with audiences who appreciate artistic vision.",
    author: "Marcus Rivera",
    role: "Director & Producer"
  },
  {
    quote: "The curation at NEMA is unmatched. They're preserving the art of filmmaking in the digital age.",
    author: "Sophia Williams",
    role: "Film Critic"
  }
]

// FAQ items
const faqItems: FAQItem[] = [
  {
    question: "What is NEMA?",
    answer: "NEMA is a curated streaming platform dedicated to independent cinema. We showcase films from emerging filmmakers and established indie directors, providing a space for authentic storytelling that often goes unnoticed by mainstream platforms."
  },
  {
    question: "Is NEMA free to use?",
    answer: "Yes! NEMA is completely free to use. Simply create an account to start watching our curated collection of independent films, save favorites, create watchlists, and engage with our community of film enthusiasts."
  },
  {
    question: "How do I create an account?",
    answer: "Click the 'Sign Up' button in the navigation bar. You can register with your email address or sign in quickly using your Google account. Once registered, you'll have full access to all features including reviews, comments, and personalized recommendations."
  },
  {
    question: "Can I watch films without an account?",
    answer: "Yes! You can watch films, leave reviews, and comment without creating an account. However, creating a free account unlocks additional features like saving films to your watchlist, adding favorites, following other users, and getting personalized recommendations."
  },
  {
    question: "How are films selected for NEMA?",
    answer: "Our curatorial team carefully selects films based on artistic merit, storytelling innovation, and cultural significance. We prioritize works from independent filmmakers, film school graduates, and underrepresented voices in cinema."
  },
  {
    question: "Can I submit my film to NEMA?",
    answer: "Yes! We welcome submissions from independent filmmakers. Visit our Contact page to learn more about our submission process. We review all submissions and respond to filmmakers whose work aligns with our platform's vision."
  },
  {
    question: "What devices can I watch NEMA on?",
    answer: "NEMA currently works best on a laptop or desktop computer with a modern web browser. We recommend using the latest version of Chrome, Firefox, Safari, or Edge for the best viewing experience. Mobile support is currently being worked on!"
  },
  {
    question: "How do I delete my account?",
    answer: "You can delete your account at any time from your Settings page under the Account section. Please note that account deletion is permanent and will remove all your reviews, comments, watchlist, and other data."
  }
]

// Component Props interfaces
interface HeroBannerProps {
  movie: Movie
}

interface MovieCardProps {
  movie: Movie
}

interface ContinueWatchingCardProps {
  session: WatchSession
}

interface RecommendationCardProps {
  movie: Movie
}

const HomePage: React.FC = () => {
  const { t } = useSettings()
  const { isAuthenticated } = useUser()
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null)
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([])
  const [allMovies, setAllMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [continueWatching, setContinueWatching] = useState<WatchSession[]>([])
  const [recommendations, setRecommendations] = useState<RecommendedMovie[]>([])
  const [recommendationType, setRecommendationType] = useState<'popular' | 'personalized' | 'behavior'>('popular')
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([])
  const [becauseYouWatched, setBecauseYouWatched] = useState<{ anchorMovie: { _id: string; title: string; posterUrl: string | null } | null; recommendations: Movie[] }>({ anchorMovie: null, recommendations: [] })

  // Filter states (for authenticated users)
  const [filterOpen, setFilterOpen] = useState<boolean>(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [selectedYear, setSelectedYear] = useState<string>("All")
  const [selectedLanguage, setSelectedLanguage] = useState<string>("All")
  const [sortBy, setSortBy] = useState<string>("newest")

  // Landing page states (for non-authenticated users)
  const [scrollPosition, setScrollPosition] = useState<number>(0)
  const [visibleSections, setVisibleSections] = useState<VisibleSections>({})
  const [currentTestimonial, setCurrentTestimonial] = useState<number>(0)
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  const heroRef = useRef<HTMLElement>(null)
  const featuredFilmsRef = useRef<HTMLElement>(null)
  const continueWatchingRef = useRef<HTMLDivElement>(null)
  const recommendationsRef = useRef<HTMLDivElement>(null)
  const trendingRef = useRef<HTMLDivElement>(null)
  const becauseYouWatchedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = (): void => {
      setScrollPosition(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        // Fetch all movies first (always needed)
        const allRes = await fetch(`${API_BASE_URL}/api/movies`)
        if (!allRes.ok) throw new Error('Failed to fetch movies')
        const allData = await allRes.json()
        const movies = Array.isArray(allData) ? allData : []
        setAllMovies(movies)

        // Try to fetch hero movie (optional - might not be set)
        try {
          const heroRes = await fetch(`${API_BASE_URL}/api/movies/hero`)
          if (heroRes.ok) {
            const heroData = await heroRes.json()
            setHeroMovie(heroData)
          } else {
            // No hero set - use first movie as fallback
            if (movies.length > 0) {
              setHeroMovie(movies[0])
            }
          }
        } catch {
          // Hero fetch failed - use first movie as fallback
          if (movies.length > 0) {
            setHeroMovie(movies[0])
          }
        }

        // Try to fetch featured movies (optional)
        try {
          const featuredRes = await fetch(`${API_BASE_URL}/api/movies/featured?limit=6`)
          if (featuredRes.ok) {
            const featuredData = await featuredRes.json()
            setFeaturedMovies(Array.isArray(featuredData) ? featuredData : [])
          }
        } catch {
          // Featured fetch failed - ignore
        }
      } catch (err) {
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Fetch continue watching data for authenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      setContinueWatching([])
      return
    }

    const fetchWatchHistory = async (): Promise<void> => {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`

        const response = await fetch(`${API_BASE_URL}/api/watch-time/history?limit=20`, {
          credentials: 'include',
          headers
        })

        if (response.ok) {
          const data: WatchSession[] = await response.json()
          const seenMovies = new Set<string>()
          const incomplete = data.filter(session => {
            if (!session.movieId || seenMovies.has(session.movieId._id)) return false
            if (session.completionPercentage >= 90) return false
            seenMovies.add(session.movieId._id)
            return true
          })
          setContinueWatching(incomplete)
        }
      } catch (err) {
        console.error('Failed to fetch watch history:', err)
      }
    }

    fetchWatchHistory()
  }, [isAuthenticated])

  // Fetch recommendations for authenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      setRecommendations([])
      setRecommendationType('popular')
      return
    }

    const fetchRecommendations = async (): Promise<void> => {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`

        const response = await fetch(`${API_BASE_URL}/api/movies/recommendations?limit=12`, {
          credentials: 'include',
          headers
        })

        if (response.ok) {
          const data: RecommendedMovie[] = await response.json()
          if (data.length > 0) {
            setRecommendations(data)
            setRecommendationType(data[0]?.recommendationType || 'popular')
          }
        }
      } catch (err) {
        console.error('Failed to fetch recommendations:', err)
      }
    }

    fetchRecommendations()
  }, [isAuthenticated])

  useEffect(() => {
    const fetchTrending = async (): Promise<void> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/movies/trending?days=7&limit=12`)
        if (response.ok) {
          const data: Movie[] = await response.json()
          setTrendingMovies(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.error('Failed to fetch trending movies:', err)
      }
    }

    fetchTrending()
  }, [])

  useEffect(() => {
    const fetchBecauseYouWatched = async (): Promise<void> => {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`

        const response = await fetch(`${API_BASE_URL}/api/movies/because-you-watched?limit=12`, {
          credentials: 'include',
          headers
        })

        if (response.ok) {
          const data = await response.json()
          setBecauseYouWatched({
            anchorMovie: data.anchorMovie || null,
            recommendations: Array.isArray(data.recommendations) ? data.recommendations : []
          })
        }
      } catch (err) {
        console.error('Failed to fetch because-you-watched:', err)
      }
    }

    fetchBecauseYouWatched()
  }, [isAuthenticated])

  const scrollToFeatured = (): void => {
    featuredFilmsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollContinueWatching = (direction: 'left' | 'right'): void => {
    if (continueWatchingRef.current) {
      const scrollAmount = 400
      continueWatchingRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const scrollRecommendations = (direction: 'left' | 'right'): void => {
    if (recommendationsRef.current) {
      const scrollAmount = 400
      recommendationsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const scrollTrending = (direction: 'left' | 'right'): void => {
    if (trendingRef.current) {
      const scrollAmount = 400
      trendingRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const scrollBecauseYouWatched = (direction: 'left' | 'right'): void => {
    if (becauseYouWatchedRef.current) {
      const scrollAmount = 400
      becauseYouWatchedRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const formatResumeTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60)
      const remainingMins = mins % 60
      return `${hrs}h ${remainingMins}m`
    }
    return `${mins}m ${secs}s`
  }

  // Intersection observer for landing page sections
  useEffect(() => {
    if (isAuthenticated) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setVisibleSections(prev => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }))
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
      }
    )

    const sections = document.querySelectorAll('section[id]')
    sections.forEach(section => observer.observe(section))

    return () => {
      sections.forEach(section => observer.unobserve(section))
    }
  }, [isAuthenticated])

  // Testimonial carousel
  useEffect(() => {
    if (isAuthenticated) return

    const interval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length)
    }, 8000)

    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Parallax effect for hero section
  useEffect(() => {
    if (isAuthenticated) return

    const handleParallax = (): void => {
      if (heroRef.current) {
        const scrollPosition = window.scrollY
        const parallaxElements = heroRef.current.querySelectorAll<HTMLElement>('.parallax')

        parallaxElements.forEach((el, index) => {
          const speed = 0.2 + (index * 0.1)
          const yPos = -(scrollPosition * speed)
          el.style.transform = `translate3d(0, ${yPos}px, 0)`
        })
      }
    }

    window.addEventListener('scroll', handleParallax)
    return () => window.removeEventListener('scroll', handleParallax)
  }, [isAuthenticated])

  // Get unique values for filters
  const categories = useMemo<string[]>(() =>
    ["All", ...new Set(allMovies.flatMap(movie => movie.genre || []))],
    [allMovies]
  )
  const years = useMemo<string[]>(() =>
    ["All", ...new Set(allMovies.map(movie => movie.releaseDate ? new Date(movie.releaseDate).getFullYear().toString() : ''))].filter(Boolean).sort((a, b) => b === "All" ? 1 : a === "All" ? -1 : Number(b) - Number(a)),
    [allMovies]
  )
  const languages = useMemo<string[]>(() =>
    ["All", ...new Set(allMovies.map(movie => movie.language).filter((l): l is string => Boolean(l)))],
    [allMovies]
  )

  // Filter and sort movies
  const filteredMovies = useMemo<Movie[]>(() => {
    let filtered = allMovies.filter(movie => {
      const matchesCategory = selectedCategory === "All" || (movie.genre && movie.genre.includes(selectedCategory))
      const matchesYear = selectedYear === "All" || (movie.releaseDate && new Date(movie.releaseDate).getFullYear().toString() === selectedYear)
      const matchesLanguage = selectedLanguage === "All" || movie.language === selectedLanguage
      return matchesCategory && matchesYear && matchesLanguage
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime()
      if (sortBy === "oldest") return new Date(a.releaseDate || 0).getTime() - new Date(b.releaseDate || 0).getTime()
      if (sortBy === "title") return a.title.localeCompare(b.title)
      return 0
    })
  }, [allMovies, selectedCategory, selectedYear, selectedLanguage, sortBy])

  const hasActiveFilters = selectedCategory !== "All" || selectedYear !== "All" || selectedLanguage !== "All"

  const clearFilters = (): void => {
    setSelectedCategory("All")
    setSelectedYear("All")
    setSelectedLanguage("All")
    setSortBy("newest")
  }

  // heroMovie is already set with fallback in useEffect
  const displayHeroMovie = heroMovie

  // Hero Banner Component (for authenticated users)
  const HeroBanner: React.FC<HeroBannerProps> = ({ movie }) => {
    const [showTrailer, setShowTrailer] = useState(false)
    const [isMuted, setIsMuted] = useState(true)
    const [isEnded, setIsEnded] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [videoError, setVideoError] = useState(false)
    const [mobileNeedsInteraction, setMobileNeedsInteraction] = useState(false)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const hlsRef = useRef<Hls | null>(null)
    const { t } = useSettings()

    // Detect mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    // Preview/trailer segment configuration (in seconds)
    const PREVIEW_START_TIME = 10  // Start from beginning
    const PREVIEW_DURATION = 30   // Play for 30 seconds before looping

    // Get the best available video URL (prefer HLS, fallback to 1080p or 720p)
    const getVideoUrl = (): string | null => {
      if (!movie?.videoUrls) return null
      return movie.videoUrls.hls || movie.videoUrls['1080p'] || movie.videoUrls['720p'] || null
    }

    const videoUrl = getVideoUrl()
    const isHls = videoUrl === movie?.videoUrls?.hls

    useEffect(() => {
      // Show poster briefly before starting preview
      const timer = setTimeout(() => {
        if (videoUrl) {
          if (isMobile) {
            setMobileNeedsInteraction(true)
          } else {
            setShowTrailer(true)
          }
        }
      }, 1500) // 1.5 second delay to show poster

      return () => {
        clearTimeout(timer)
        if (hlsRef.current) {
          hlsRef.current.destroy()
          hlsRef.current = null
        }
      }
    }, [movie, videoUrl, isHls, isMobile])

    useEffect(() => {
      if (showTrailer && videoUrl && videoRef.current) {
        // If it's an HLS URL (.m3u8)
        if (isHls && (videoUrl.includes('.m3u8') || videoUrl.includes('hls'))) {
          if (Hls.isSupported()) {
            if (hlsRef.current) {
              hlsRef.current.destroy()
            }

            const hls = new Hls({
              capLevelToPlayerSize: true,
              autoStartLoad: true,
              debug: false
            })

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              videoRef.current?.play().catch(() => setVideoError(true))
            })

            hls.on(Hls.Events.ERROR, (_, data) => {
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    hls.startLoad()
                    break
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    hls.recoverMediaError()
                    break
                  default:
                    hls.destroy()
                    setVideoError(true)
                    break
                }
              }
            })

            hls.loadSource(videoUrl)
            hls.attachMedia(videoRef.current)
            hlsRef.current = hls
          } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = videoUrl
            videoRef.current.play().catch(() => setVideoError(true))
          }
        } else {
          // Direct MP4 playback (1080p or 720p)
          videoRef.current.src = videoUrl

          videoRef.current.addEventListener('canplay', () => {
            videoRef.current?.play().catch(() => setVideoError(true))
          }, { once: true })
        }
      }
    }, [showTrailer, videoUrl, isHls])

    if (!movie) return null

    const handleReplay = () => {
      if (videoRef.current) {
        videoRef.current.currentTime = PREVIEW_START_TIME
        videoRef.current.play().then(() => setIsEnded(false)).catch(() => {})
      }
    }

    const handleMobilePlay = () => {
      setMobileNeedsInteraction(false)
      setShowTrailer(true)
    }

    const handleVideoPlay = () => {
      setIsPlaying(true)
      setVideoError(false)
    }

    const handleVideoError = () => {
      setVideoError(true)
      setIsPlaying(false)
    }

    const handleLoadedMetadata = () => {
      if (videoRef.current && PREVIEW_START_TIME > 0) {
        videoRef.current.currentTime = PREVIEW_START_TIME
      }
    }

    // Handle segment looping - restart preview when reaching segment end
    const handlePreviewTimeUpdate = () => {
      if (!videoRef.current) return
      const segmentEnd = PREVIEW_START_TIME + PREVIEW_DURATION
      if (videoRef.current.currentTime >= segmentEnd) {
        videoRef.current.currentTime = PREVIEW_START_TIME
      }
    }

    return (
      <div className="relative w-full h-[95vh] min-h-[700px] max-h-[1200px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={movie.thumbnailUrl}
            alt={movie.title}
            className={`w-full h-full object-cover transition-opacity duration-1000 ${showTrailer && isPlaying && !isEnded ? 'opacity-0' : 'opacity-100'}`}
          />
          
          {showTrailer && videoUrl && (
            <div className={`absolute inset-0 transition-opacity duration-1000 ${isEnded || videoError ? 'opacity-0' : 'opacity-100'}`}>
              <video
                ref={videoRef}
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
                onPlay={handleVideoPlay}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handlePreviewTimeUpdate}
                onError={handleVideoError}
                onEnded={() => {
                  setIsEnded(true)
                  setIsPlaying(false)
                }}
              />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
          
          {/* Mobile Play Button - shown when waiting for user interaction */}
          {mobileNeedsInteraction && videoUrl && !showTrailer && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <button
                onClick={handleMobilePlay}
                className="p-6 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all border border-white/30 animate-pulse"
                title="Tap to play trailer"
              >
                <Play className="w-12 h-12" fill="white" />
              </button>
            </div>
          )}

          {/* Mute/Unmute & Replay Controls */}
          {showTrailer && videoUrl && (
            <div className="absolute bottom-40 right-10 z-20 flex items-center gap-4">
              {isEnded ? (
                <button
                  onClick={handleReplay}
                  className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/20"
                  title="Replay"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/20"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full pt-20">
            <div className="max-w-2xl">
              {movie.genre && movie.genre.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  {movie.genre.slice(0, 3).map((g, i) => (
                    <span key={i} className="px-2 py-1 bg-white/10 backdrop-blur-sm text-xs text-white/80 uppercase tracking-wider">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
                {movie.title}
              </h1>

              <div className="flex items-center gap-4 text-white/70 text-sm mb-4">
                {movie.releaseDate && (
                  <span>{new Date(movie.releaseDate).getFullYear()}</span>
                )}
                {movie.duration && (
                  <span>{Math.floor(movie.duration / 60)}h {movie.duration % 60}m</span>
                )}
                {movie.language && (
                  <span className="uppercase">{movie.language}</span>
                )}
                {movie.rating && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {movie.rating.toFixed(1)}
                  </span>
                )}
              </div>

              {movie.director && (
                <p className="text-white/60 text-sm mb-4">
                  {t('video.directedBy') || 'Directed by'} <span className="text-white/80">{movie.director}</span>
                </p>
              )}

              {movie.description && (
                <p className="text-white/70 text-base leading-relaxed mb-8 line-clamp-3">
                  {movie.description}
                </p>
              )}

              <div className="flex items-center gap-4">
                <Link
                  to={`/video/${movie._id}`}
                  className="flex items-center gap-2 px-8 py-3 bg-white text-black font-semibold rounded hover:bg-white/90 transition-all duration-200"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>{t('home.play') || 'Play'}</span>
                </Link>
                <Link
                  to={`/video/${movie._id}`}
                  className="flex items-center gap-2 px-8 py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded hover:bg-white/30 transition-all duration-200"
                >
                  <Info className="w-5 h-5" />
                  <span>{t('home.moreInfo') || 'More Info'}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const MovieCard: React.FC<MovieCardProps> = ({ movie }) => (
    <Link
      to={`/video/${movie._id}`}
      className="group relative aspect-[16/9] overflow-visible bg-black/40 transform transition-all duration-500 hover:scale-[1.02]"
    >
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-0 left-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 to-transparent"></div>
          <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-amber-400 to-transparent"></div>
        </div>
        <div className="absolute top-0 right-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ transitionDelay: '50ms' }}>
          <div className="absolute top-0 right-0 w-full h-0.5 bg-gradient-to-l from-amber-400 to-transparent"></div>
          <div className="absolute top-0 right-0 w-0.5 h-full bg-gradient-to-b from-amber-400 to-transparent"></div>
        </div>
        <div className="absolute bottom-0 left-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ transitionDelay: '100ms' }}>
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-0.5 h-full bg-gradient-to-t from-amber-400 to-transparent"></div>
        </div>
        <div className="absolute bottom-0 right-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ transitionDelay: '150ms' }}>
          <div className="absolute bottom-0 right-0 w-full h-0.5 bg-gradient-to-l from-amber-400 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-0.5 h-full bg-gradient-to-t from-amber-400 to-transparent"></div>
        </div>
      </div>

      <img src={movie.thumbnailUrl} alt={movie.title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 w-20 h-20 -ml-2 -mt-2 flex items-center justify-center">
            <svg className="w-20 h-20 text-amber-400/40" viewBox="0 0 100 100">
              <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-black/80 backdrop-blur-sm border-2 border-white/90 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-amber-500/10 to-transparent"></div>
            <svg className="w-7 h-7 text-white ml-0.5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 p-4">
        <h4 className="text-lg font-light text-white/95 line-clamp-1">{movie.title}</h4>
        <p className="text-white/70 text-sm">{movie.director} • {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : ''}</p>
      </div>
    </Link>
  )

  const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({ session }) => {
    const movie = session.movieId
    if (!movie) return null

    const resumeTime = Math.floor(session.maxTimeReached)
    const imageUrl = movie.thumbnailUrl || movie.posterUrl

    return (
      <Link
        to={`/video/${movie._id}?t=${resumeTime}`}
        className="group relative flex-shrink-0 w-[320px] aspect-video overflow-hidden bg-black/40 transform transition-all duration-300 hover:scale-[1.02]"
      >
        <img
          src={imageUrl}
          alt={movie.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-white/90 shadow-lg">
              <Play className="w-6 h-6 text-black fill-current ml-0.5" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="w-full h-1 bg-white/20 rounded-full mb-3 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${session.completionPercentage}%` }}
            />
          </div>

          <h4 className="text-base font-medium text-white line-clamp-1 mb-1">{movie.title}</h4>
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>{session.completionPercentage}% watched</span>
            <span>{formatResumeTime(session.videoDuration - session.maxTimeReached)} left</span>
          </div>
        </div>

        <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-sm text-xs text-white/90 flex items-center gap-1">
          <Play className="w-3 h-3 fill-current" />
          Resume
        </div>
      </Link>
    )
  }

  const ContinueWatchingSection: React.FC = () => {
    if (continueWatching.length === 0) return null

    return (
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-light tracking-wide text-white">
            {t('home.continueWatching') || 'Continue Watching'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollContinueWatching('left')}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-white/70" />
            </button>
            <button
              onClick={() => scrollContinueWatching('right')}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>

        <div
          ref={continueWatchingRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {continueWatching.map((session) => (
            <ContinueWatchingCard key={session._id} session={session} />
          ))}
        </div>
      </div>
    )
  }

  const RecommendationCard: React.FC<RecommendationCardProps> = ({ movie }) => {
    if (!movie) return null

    const imageUrl = movie.thumbnailUrl || movie.posterUrl

    return (
      <Link
        to={`/video/${movie._id}`}
        className="group relative flex-shrink-0 w-[280px] aspect-[2/3] overflow-hidden bg-black/40 transform transition-all duration-300 hover:scale-[1.02]"
      >
        <img
          src={imageUrl}
          alt={movie.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <h4 className="text-base font-medium text-white line-clamp-1 mb-1">{movie.title}</h4>
          <div className="flex items-center gap-2 text-xs text-white/70">
            {movie.releaseDate && (
              <span>{new Date(movie.releaseDate).getFullYear()}</span>
            )}
            {movie.rating && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {movie.rating.toFixed(1)}
              </span>
            )}
          </div>
          {movie.genre && movie.genre.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {movie.genre.slice(0, 2).map((g, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-white/10 text-[10px] text-white/80 uppercase">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-white/90 shadow-lg">
              <Play className="w-6 h-6 text-black fill-current ml-0.5" />
            </div>
          </div>
        </div>
      </Link>
    )
  }

  const BecauseYouWatchedSection: React.FC = () => {
    if (!becauseYouWatched.anchorMovie || becauseYouWatched.recommendations.length === 0) return null

    return (
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-light tracking-wide text-white">
            {`Because you watched ${becauseYouWatched.anchorMovie.title}`}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollBecauseYouWatched('left')}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-white/70" />
            </button>
            <button
              onClick={() => scrollBecauseYouWatched('right')}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>

        <div
          ref={becauseYouWatchedRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {becauseYouWatched.recommendations.map((movie) => (
            <RecommendationCard key={movie._id} movie={movie} />
          ))}
        </div>
      </div>
    )
  }

  const TrendingSection: React.FC = () => {
    if (trendingMovies.length === 0) return null

    return (
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-light tracking-wide text-white">
            {t('home.trendingNow') || 'Trending Now'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollTrending('left')}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-white/70" />
            </button>
            <button
              onClick={() => scrollTrending('right')}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>

        <div
          ref={trendingRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {trendingMovies.map((movie) => (
            <RecommendationCard key={movie._id} movie={movie} />
          ))}
        </div>
      </div>
    )
  }

  const RecommendationsSection: React.FC = () => {
    if (recommendations.length === 0) return null

    const isPersonalized = recommendationType === 'personalized' || recommendationType === 'behavior'
    const sectionTitle = isPersonalized
      ? (t('home.recommendedForYou') || 'Recommended For You')
      : (t('home.popularNow') || 'Popular Now')
    const subtitle = recommendationType === 'behavior'
      ? (t('home.basedOnWatching') || "Based on what you've been watching")
      : recommendationType === 'personalized'
        ? (t('home.basedOnPreferences') || 'Based on your favorite genres')
        : null

    return (
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-light tracking-wide text-white">
              {sectionTitle}
            </h3>
            {subtitle && (
              <p className="text-xs text-white/50 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollRecommendations('left')}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-white/70" />
            </button>
            <button
              onClick={() => scrollRecommendations('right')}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>

        <div
          ref={recommendationsRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {recommendations.map((movie) => (
            <RecommendationCard key={movie._id} movie={movie} />
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <NavBar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)] pt-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
            <p className="text-amber-100/60 text-sm">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const newReleases = [...allMovies]
    .filter(m => {
      if (!m.createdAt) return false
      const uploadDate = new Date(m.createdAt)
      return uploadDate >= oneWeekAgo
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 9)

  const topRated = [...allMovies]
    .filter(m => typeof m.rating === 'number')
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
    .slice(0, 6)

  if (isAuthenticated) {
    const gridMovies = filteredMovies.filter(m => m._id !== displayHeroMovie?._id)

    return (
      <div className="min-h-screen bg-black text-white overflow-x-hidden">
        <NavBar />

        {displayHeroMovie && <HeroBanner movie={displayHeroMovie} />}

        <div className="pb-12 px-6 -mt-16 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="pt-8">
              <ContinueWatchingSection />
            </div>

            <BecauseYouWatchedSection />

            <TrendingSection />

            <RecommendationsSection />

            <div className="flex items-center justify-between mb-8 pt-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button
                    onClick={() => setFilterOpen(!filterOpen)}
                    className={`flex items-center gap-2 px-4 py-2 border transition-all duration-200 ${
                      filterOpen || hasActiveFilters
                        ? 'border-amber-100/40 bg-white/10 text-white'
                        : 'border-amber-100/20 bg-white/5 text-amber-100/70 hover:border-amber-100/30 hover:text-white'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-light">{t('catalog.filters') || 'Filters'}</span>
                    {hasActiveFilters && (
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {filterOpen && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-black/95 border border-amber-100/20 shadow-xl z-50">
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-xs text-amber-100/60 mb-2 uppercase tracking-wider">{t('catalog.category')}</label>
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full bg-white/5 border border-amber-100/20 px-3 py-2 text-sm font-light focus:outline-none focus:border-amber-100/40 transition-colors"
                          >
                            {categories.map(category => (
                              <option key={category} value={category} className="bg-black text-white">{category}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-amber-100/60 mb-2 uppercase tracking-wider">{t('catalog.year')}</label>
                          <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full bg-white/5 border border-amber-100/20 px-3 py-2 text-sm font-light focus:outline-none focus:border-amber-100/40 transition-colors"
                          >
                            {years.map(year => (
                              <option key={year} value={year} className="bg-black text-white">{year}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-amber-100/60 mb-2 uppercase tracking-wider">{t('catalog.language')}</label>
                          <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="w-full bg-white/5 border border-amber-100/20 px-3 py-2 text-sm font-light focus:outline-none focus:border-amber-100/40 transition-colors"
                          >
                            {languages.map(language => (
                              <option key={language} value={language} className="bg-black text-white">{language}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-amber-100/60 mb-2 uppercase tracking-wider">{t('catalog.sort')}</label>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full bg-white/5 border border-amber-100/20 px-3 py-2 text-sm font-light focus:outline-none focus:border-amber-100/40 transition-colors"
                          >
                            <option value="newest" className="bg-black text-white">{t('catalog.newest')}</option>
                            <option value="oldest" className="bg-black text-white">{t('catalog.oldest')}</option>
                            <option value="title" className="bg-black text-white">{t('catalog.aToZ')}</option>
                          </select>
                        </div>

                        {hasActiveFilters && (
                          <button
                            onClick={clearFilters}
                            className="w-full text-center text-sm text-amber-100/60 hover:text-amber-100 py-2 border-t border-amber-100/10 mt-2"
                          >
                            {t('common.clearFilters')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {hasActiveFilters && (
                  <div className="flex items-center gap-2">
                    {selectedCategory !== "All" && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-amber-100/20 text-xs text-amber-100/80">
                        {selectedCategory}
                        <button onClick={() => setSelectedCategory("All")} className="hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedYear !== "All" && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-amber-100/20 text-xs text-amber-100/80">
                        {selectedYear}
                        <button onClick={() => setSelectedYear("All")} className="hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedLanguage !== "All" && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-amber-100/20 text-xs text-amber-100/80">
                        {selectedLanguage}
                        <button onClick={() => setSelectedLanguage("All")} className="hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <span className="text-amber-100/50 text-sm">
                {gridMovies.length} {t('common.films')}
              </span>
            </div>

            {gridMovies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {gridMovies.map((movie) => (
                  <MovieCard key={movie._id} movie={movie} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-amber-100/60 text-lg">{t('catalog.noFilms')}</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 text-amber-100/70 hover:text-amber-100 underline text-sm"
                >
                  {t('common.clearFilters')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <NavBar />

      <section
        ref={heroRef}
        id="hero"
        className="relative h-screen flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black z-10"></div>

        <div
          className="absolute z-0 opacity-60 parallax"
          style={{
            left: "-5vw",
            right: "-5vw",
            top: "-5vh",
            bottom: "-5vh",
            willChange: "transform",
            transform: "translateZ(0)",
          }}
        >
          <picture className="block w-full h-full">
            <source srcSet="/hero-image.webp" type="image/webp" />
            <img
              src="/hero-image.jpg"
              alt=""
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </picture>
        </div>

        <div className="relative z-20 text-center px-4 max-w-5xl mx-auto">
          <div className="mb-6 opacity-0 animate-fade-in" style={{ animationDelay: '0.2s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            <span className="text-amber-100/80 tracking-[0.6em] uppercase text-sm font-extralight">{t('home.independentCinema')}</span>
          </div>

          <h1 className="text-7xl md:text-9xl font-extralight mb-6 tracking-[0.3em] uppercase opacity-0 animate-fade-in" style={{ animationDelay: '0.4s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            NEMA
          </h1>

          <div className="w-0 h-[1px] bg-amber-100/30 mx-auto mb-10 opacity-0 animate-expand" style={{ animationDelay: '0.6s', animationDuration: '1.5s', animationFillMode: 'forwards' }}></div>

          <p className="text-2xl md:text-3xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed font-extralight tracking-wide opacity-0 animate-fade-in" style={{ animationDelay: '0.8s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            {t('home.tagline')}
          </p>

          <p className="text-white/60 mb-12 max-w-xl mx-auto font-light opacity-0 animate-fade-in" style={{ animationDelay: '1s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            {t('home.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center opacity-0 animate-fade-in" style={{ animationDelay: '1.2s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            <Link to="/catalog" className="group relative overflow-hidden border border-white/20 px-10 py-4 transition-all duration-500 text-white/90 tracking-wider text-base uppercase">
              <span className="relative z-10">{t('home.exploreFilms')}</span>
              <span className="absolute inset-0 bg-white/5 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></span>
            </Link>
            {featuredMovies.length > 0 && (
              <Link
                to={`/video/${featuredMovies[0]._id}`}
                className="group relative overflow-hidden border border-amber-100/20 px-10 py-4 transition-all duration-500 text-amber-100/90 tracking-wider text-base uppercase"
              >
                <span className="relative z-10">{t('home.featuredFilm')}</span>
                <span className="absolute inset-0 bg-amber-100/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></span>
              </Link>
            )}
          </div>

          <div className="mt-16 opacity-0 animate-fade-in" style={{ animationDelay: '1.4s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            <button
              onClick={scrollToFeatured}
              className="flex flex-col items-center cursor-pointer mx-auto hover:opacity-80 transition-opacity duration-300"
            >
              <span className="text-white/50 text-xs tracking-widest uppercase mb-2">{t('home.explore')}</span>
              <ChevronDown className="w-6 h-6 text-white/50 animate-bounce" />
            </button>
          </div>
        </div>
      </section>

      <section
        ref={featuredFilmsRef}
        id="featured"
        className="relative py-24 px-6"
      >
        <div className="relative z-20 max-w-7xl mx-auto w-full">
          <div className="flex flex-col items-center mb-10">
            <div className="mb-2">
              <span className="text-amber-100/80 tracking-[0.3em] uppercase text-sm font-extralight">{t('home.curatorsSelection')}</span>
            </div>
            <h2 className="text-4xl font-extralight tracking-wide">{t('home.featured')}</h2>
            <div className="w-16 h-[1px] bg-amber-100/30 mt-4"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredMovies.map((movie) => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-4">
        {allMovies && allMovies.length > 0 && (
          <>
            {newReleases.length > 0 && (
              <div className="max-w-7xl mx-auto mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-light tracking-wide">{t('home.newReleases')}</h3>
                  <Link to="/catalog" className="text-amber-100/70 text-sm hover:text-amber-100 transition">{t('common.seeAll')}</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {newReleases.map((movie) => (
                    <MovieCard key={movie._id} movie={movie} />
                  ))}
                </div>
              </div>
            )}
            {topRated.length > 0 && (
              <div className="max-w-7xl mx-auto mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-light tracking-wide">{t('home.topRated')}</h3>
                  <Link to="/catalog" className="text-amber-100/70 text-sm hover:text-amber-100 transition">{t('common.seeAll')}</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {topRated.map((movie) => (
                    <MovieCard key={movie._id} movie={movie} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section
        id="testimonials"
        className="relative py-32 px-6 overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/80"></div>

        <div className="absolute top-0 left-0 right-0 h-[30px] bg-[url('/film-strip.png')] bg-repeat-x opacity-30"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[30px] bg-[url('/film-strip.png')] bg-repeat-x opacity-30"></div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="mb-8 text-8xl text-amber-100/10 font-serif">"</div>

          <div className="relative h-48">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out flex flex-col items-center justify-center ${
                  index === currentTestimonial
                    ? 'opacity-100 transform translate-x-0 z-10'
                    : index < currentTestimonial
                      ? 'opacity-0 transform -translate-x-10 z-0'
                      : 'opacity-0 transform translate-x-10 z-0'
                }`}
              >
                <p className="text-xl md:text-2xl text-white/90 mb-8 italic leading-relaxed font-light">
                  {testimonial.quote}
                </p>
                <div className="text-amber-100/80 font-normal">
                  {testimonial.author} <span className="text-white/50 font-light ml-2">• {testimonial.role}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3 mt-16">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`h-[2px] rounded-none transition-all duration-500 ${
                  index === currentTestimonial ? 'bg-amber-100/70 w-8' : 'bg-white/20 w-4'
                }`}
                onClick={() => setCurrentTestimonial(index)}
                aria-label={`View testimonial ${index + 1}`}
              ></button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className="relative py-24 px-6"
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col items-center mb-12 text-center">
            <div className="mb-2">
              <span className="text-amber-100/80 tracking-[0.3em] uppercase text-sm font-extralight">Got Questions?</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extralight tracking-wide">Frequently Asked Questions</h2>
            <div className="w-16 h-[1px] bg-amber-100/30 mt-4"></div>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className="border border-white/10 bg-white/[0.02] overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-white/90 font-light tracking-wide pr-4">{item.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-amber-100/60 flex-shrink-0 transition-transform duration-300 ${
                      openFAQ === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFAQ === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-6 pb-5 pt-0">
                    <p className="text-white/60 font-light leading-relaxed">{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-white/50 font-light mb-4">Still have questions?</p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-amber-100/80 hover:text-amber-100 transition-colors font-light tracking-wide"
            >
              Contact us
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="cta"
        className="relative py-36 px-6 flex items-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-radial-at-center from-transparent via-black/30 to-black"></div>

        <div className="relative z-20 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-extralight mb-6 tracking-wide">{t('home.supportCinema')}</h2>
          <div className="w-16 h-[1px] bg-amber-100/30 mx-auto mb-8"></div>
          <p className="text-xl text-white/80 mb-12 leading-relaxed max-w-3xl mx-auto font-light">
            {t('home.supportText')}
          </p>
          <Link to="/about" className="group relative overflow-hidden inline-flex items-center gap-2 border border-amber-100/30 px-12 py-4 transition-all duration-500 text-amber-100/90 tracking-wider text-base uppercase">
            <span className="relative z-10">{t('home.joinCommunity')}</span>
            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform duration-500" />
            <span className="absolute inset-0 bg-amber-100/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></span>
          </Link>
        </div>
      </section>

      <footer className="relative py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-8 md:mb-0">
            <div className="text-3xl font-extralight tracking-[0.2em] text-white/90 mb-4">NEMA</div>
            <p className="text-white/50 text-sm">© 2025 NEMA Archives. {t('home.allRightsReserved')}</p>
          </div>
          <div className="flex gap-10 text-white/60">
            <Link to="/about" className="hover:text-amber-100/90 transition-colors duration-300 text-sm tracking-wide">{t('footer.about')}</Link>
            <Link to="/catalog" className="hover:text-amber-100/90 transition-colors duration-300 text-sm tracking-wide">{t('footer.films')}</Link>
            <Link to="/contact" className="hover:text-amber-100/90 transition-colors duration-300 text-sm tracking-wide">{t('footer.contact')}</Link>
            <a href="https://www.instagram.com/nemaarchives/" className="hover:text-amber-100/90 transition-colors duration-300 text-sm tracking-wide">Instagram</a>
          </div>
        </div>
      </footer>

      <div className="fixed inset-0 pointer-events-none z-[100] opacity-30 mix-blend-overlay bg-[url('/film-grain.png')]"></div>
      <div className="fixed inset-0 pointer-events-none z-[99] opacity-15 bg-gradient-to-br from-amber-900/20 via-transparent to-indigo-900/20"></div>
      <div
        className="fixed inset-0 pointer-events-none z-[98] opacity-30 mix-blend-multiply"
        style={{ boxShadow: "inset 0 0 200px rgba(0,0,0,0.7)" }}
      ></div>
    </div>
  )
}

export default HomePage