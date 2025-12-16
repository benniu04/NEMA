import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import API_BASE_URL from '../../config/api.js'
import { useSettings } from '../context/SettingsContext'
import { useUser } from '../context/UserContext'
import { ChevronDown, Filter, X, Play, Info, ArrowRight } from 'lucide-react'

// Testimonials from directors and filmmakers
const testimonials = [
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
];

const HomePage = () => {
  const { t } = useSettings();
  const { isAuthenticated } = useUser();
  const [featuredMovies, setFeaturedMovies] = useState([])
  const [allMovies, setAllMovies] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter states (for authenticated users)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedYear, setSelectedYear] = useState("All")
  const [selectedLanguage, setSelectedLanguage] = useState("All")
  const [sortBy, setSortBy] = useState("newest")

  // Landing page states (for non-authenticated users)
  const [scrollPosition, setScrollPosition] = useState(0);
  const [visibleSections, setVisibleSections] = useState({});
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const heroRef = useRef(null);
  const featuredFilmsRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featuredRes, allRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/movies?limit=3`),
          fetch(`${API_BASE_URL}/api/movies`)
        ])

        if (!featuredRes.ok) throw new Error('Failed to fetch featured movies')
        if (!allRes.ok) throw new Error('Failed to fetch movies')

        const [featuredData, allData] = await Promise.all([
          featuredRes.json(),
          allRes.json()
        ])

        setFeaturedMovies(Array.isArray(featuredData) ? featuredData : [])
        setAllMovies(Array.isArray(allData) ? allData : [])
      } catch (err) {
        console.error('Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const scrollToFeatured = () => {
    featuredFilmsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Intersection observer for landing page sections
  useEffect(() => {
    if (isAuthenticated) return;

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
  }, [isAuthenticated]);

  // Testimonial carousel
  useEffect(() => {
    if (isAuthenticated) return;

    const interval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Parallax effect for hero section
  useEffect(() => {
    if (isAuthenticated) return;

    const handleParallax = () => {
      if (heroRef.current) {
        const scrollPosition = window.scrollY;
        const parallaxElements = heroRef.current.querySelectorAll('.parallax');

        parallaxElements.forEach((el, index) => {
          const speed = 0.2 + (index * 0.1);
          const yPos = -(scrollPosition * speed);
          el.style.transform = `translate3d(0, ${yPos}px, 0)`;
        });
      }
    };

    window.addEventListener('scroll', handleParallax);
    return () => window.removeEventListener('scroll', handleParallax);
  }, [isAuthenticated]);

  // Get unique values for filters
  const categories = useMemo(() =>
    ["All", ...new Set(allMovies.flatMap(movie => movie.genre || []))],
    [allMovies]
  )
  const years = useMemo(() =>
    ["All", ...new Set(allMovies.map(movie => new Date(movie.releaseDate).getFullYear().toString()))].sort((a, b) => b === "All" ? 1 : a === "All" ? -1 : b - a),
    [allMovies]
  )
  const languages = useMemo(() =>
    ["All", ...new Set(allMovies.map(movie => movie.language).filter(Boolean))],
    [allMovies]
  )

  // Filter and sort movies
  const filteredMovies = useMemo(() => {
    let filtered = allMovies.filter(movie => {
      const matchesCategory = selectedCategory === "All" || (movie.genre && movie.genre.includes(selectedCategory));
      const matchesYear = selectedYear === "All" || new Date(movie.releaseDate).getFullYear().toString() === selectedYear;
      const matchesLanguage = selectedLanguage === "All" || movie.language === selectedLanguage;
      return matchesCategory && matchesYear && matchesLanguage;
    });

    // Sort
    return [...filtered].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.releaseDate) - new Date(a.releaseDate);
      if (sortBy === "oldest") return new Date(a.releaseDate) - new Date(b.releaseDate);
      if (sortBy === "title") return a.title.localeCompare(b.title);
      return 0;
    });
  }, [allMovies, selectedCategory, selectedYear, selectedLanguage, sortBy]);

  const hasActiveFilters = selectedCategory !== "All" || selectedYear !== "All" || selectedLanguage !== "All";

  const clearFilters = () => {
    setSelectedCategory("All");
    setSelectedYear("All");
    setSelectedLanguage("All");
    setSortBy("newest");
  };

  // Get the hero/featured film (first featured movie or random from all)
  const heroMovie = featuredMovies[0] || allMovies[0];

  // Hero Banner Component (for authenticated users)
  const HeroBanner = ({ movie }) => {
    if (!movie) return null;

    return (
      <div className="relative w-full h-[70vh] min-h-[500px] max-h-[800px]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={movie.thumbnailUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full pt-20">
            <div className="max-w-2xl">
              {/* Genre tags */}
              {movie.genre && movie.genre.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  {movie.genre.slice(0, 3).map((g, i) => (
                    <span key={i} className="px-2 py-1 bg-white/10 backdrop-blur-sm text-xs text-white/80 uppercase tracking-wider">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
                {movie.title}
              </h1>

              {/* Meta info */}
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

              {/* Director */}
              {movie.director && (
                <p className="text-white/60 text-sm mb-4">
                  {t('video.directedBy') || 'Directed by'} <span className="text-white/80">{movie.director}</span>
                </p>
              )}

              {/* Description */}
              {movie.description && (
                <p className="text-white/70 text-base leading-relaxed mb-8 line-clamp-3">
                  {movie.description}
                </p>
              )}

              {/* Action buttons */}
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
    );
  };

  const MovieCard = ({ movie }) => (
    <Link
      to={`/video/${movie._id}`}
      className="group relative aspect-[16/9] overflow-visible bg-black/40 transform transition-all duration-500 hover:scale-[1.02]"
    >
      {/* Animated corner borders */}
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

      {/* Play button on hover */}
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
        <p className="text-white/70 text-sm">{movie.director} • {new Date(movie.releaseDate).getFullYear()}</p>
      </div>
    </Link>
  )

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

  // Calculate new releases (uploaded in last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const newReleases = [...allMovies]
    .filter(m => {
      if (!m.createdAt) return false;
      const uploadDate = new Date(m.createdAt);
      return uploadDate >= oneWeekAgo;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 9)

  const topRated = [...allMovies]
    .filter(m => typeof m.rating === 'number')
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
    .slice(0, 6)

  // For logged in users, show filtered view with hero banner
  if (isAuthenticated) {
    const gridMovies = filteredMovies.filter(m => m._id !== heroMovie?._id);

    return (
      <div className="min-h-screen bg-black text-white">
        <NavBar />

        {/* Hero Banner */}
        {heroMovie && <HeroBanner movie={heroMovie} />}

        <div className="pb-12 px-6 -mt-16 relative z-10">
          <div className="max-w-7xl mx-auto">
            {/* Filter Header */}
            <div className="flex items-center justify-between mb-8 pt-8">
              <div className="flex items-center gap-4">
                {/* Filter Dropdown Button */}
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

                  {/* Filter Dropdown Panel */}
                  {filterOpen && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-black/95 border border-amber-100/20 shadow-xl z-50">
                      <div className="p-4 space-y-4">
                        {/* Category */}
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

                        {/* Year */}
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

                        {/* Language */}
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

                        {/* Sort */}
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

                        {/* Clear Filters */}
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

                {/* Active filter tags */}
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

            {/* Movies Grid */}
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

  // For non-logged in users, show the full landing page
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <NavBar />

      {/* Hero Section with Cinematic Background */}
      <section
        ref={heroRef}
        id="hero"
        className="relative h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black z-10"></div>

        {/* Film Grain Effect */}
        <div className="absolute inset-0 bg-[url('/film-grain.png')] opacity-[0.03] mix-blend-overlay z-10 pointer-events-none"></div>

        {/* Parallax Background */}
        <div
          className="absolute z-0 inset-0 bg-[url('/hero-image.png')] bg-cover bg-center opacity-60 parallax"
        ></div>

        {/* Content */}
        <div className="relative z-20 text-center px-4 max-w-5xl mx-auto">
          <div className="mb-6 opacity-0 animate-fade-in" style={{ animationDelay: '0.2s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            <span className="text-amber-100/80 tracking-[0.6em] uppercase text-sm font-extralight">{t('home.independentCinema')}</span>
          </div>

          {/* Main Logo/Title */}
          <h1 className="text-7xl md:text-9xl font-extralight mb-6 tracking-[0.3em] uppercase opacity-0 animate-fade-in" style={{ animationDelay: '0.4s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            NEMA
          </h1>

          {/* Cinematic Line */}
          <div className="w-0 h-[1px] bg-amber-100/30 mx-auto mb-10 opacity-0 animate-expand" style={{ animationDelay: '0.6s', animationDuration: '1.5s', animationFillMode: 'forwards' }}></div>

          {/* Tagline */}
          <p className="text-2xl md:text-3xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed font-extralight tracking-wide opacity-0 animate-fade-in" style={{ animationDelay: '0.8s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            {t('home.tagline')}
          </p>

          {/* Subtitle */}
          <p className="text-white/60 mb-12 max-w-xl mx-auto font-light opacity-0 animate-fade-in" style={{ animationDelay: '1s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            {t('home.subtitle')}
          </p>

          {/* Call to Action Buttons */}
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

          {/* Scroll Indicator */}
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

      {/* Featured Section */}
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

      {/* New Releases & Top Rated Sections */}
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

      {/* Testimonials Section */}
      <section
        id="testimonials"
        className="relative py-32 px-6 overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/80"></div>

        {/* Film Strip Decorative Element */}
        <div className="absolute top-0 left-0 right-0 h-[30px] bg-[url('/film-strip.png')] bg-repeat-x opacity-30"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[30px] bg-[url('/film-strip.png')] bg-repeat-x opacity-30"></div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Big Quote Mark */}
          <div className="mb-8 text-8xl text-amber-100/10 font-serif">"</div>

          {/* Testimonial Carousel */}
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

          {/* Carousel Indicators */}
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

      {/* CTA Section */}
      <section
        id="cta"
        className="relative py-36 px-6 flex items-center overflow-hidden"
      >
        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-radial-at-center from-transparent via-black/30 to-black"></div>

        {/* Content Container */}
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

      {/* Footer with Film Reel Design */}
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

      {/* Global Cinema Effects */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-30 mix-blend-overlay bg-[url('/film-grain.png')]"></div>
      <div className="fixed inset-0 pointer-events-none z-[99] opacity-15 bg-gradient-to-br from-amber-900/20 via-transparent to-indigo-900/20"></div>
      <div className="fixed inset-0 pointer-events-none z-[98] opacity-30 mix-blend-multiply box-shadow: inset 0 0 200px rgba(0,0,0,0.7)"></div>
    </div>
  )
}

export default HomePage
