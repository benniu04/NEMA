import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Loader2, Sparkles, Clock3, X } from 'lucide-react';
import API_BASE_URL from '../config/api';
import { useSettings } from '../context/SettingsContext';
import { Movie } from '../types';

const HISTORY_KEY = 'nema-search-history';

// Add keyframe animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('search-animations')) {
  style.id = 'search-animations';
  document.head.appendChild(style);
}

interface SearchBarProps {
  className?: string;
  isMobile?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ className = '', isMobile = false }) => {
  const { t } = useSettings();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close results when navigating
  useEffect(() => {
    setOpen(false);
    setQuery('');
  }, [location.pathname]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scroll when overlay is open and reset scroll position
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      // Store original styles
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalLeft = document.body.style.left;
      const originalRight = document.body.style.right;
      const originalWillChange = document.body.style.willChange;
      
      // Hint to browser for optimization
      document.body.style.willChange = 'position, top';
      
      // Force a reflow to apply will-change before the actual changes
      document.body.offsetHeight;
      
      // Apply all styles at once to minimize reflow
      Object.assign(document.body.style, {
        overflow: 'hidden',
        position: 'fixed',
        top: `-${scrollY}px`,
        left: '0',
        right: `${scrollbarWidth}px`,
        willChange: 'auto'
      });
      
      // Reset overlay scroll
      if (overlayRef.current) {
        overlayRef.current.scrollTop = 0;
      }
      
      return () => {
        // Restore all at once
        Object.assign(document.body.style, {
          overflow: originalOverflow,
          position: originalPosition,
          top: originalTop,
          left: originalLeft,
          right: originalRight,
          willChange: originalWillChange
        });
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Prefetch a few trending titles for chips
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/movies?limit=6`);
        if (!res.ok) return;
        const data = await res.json();
        setTrending(Array.isArray(data) ? data.slice(0, 6) : []);
      } catch {
        // Ignore quietly
      }
    };
    fetchTrending();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError('');
      setLoading(false);
      controllerRef.current?.abort();
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError('');

      controllerRef.current?.abort();
      controllerRef.current = new AbortController();

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/movies/search?q=${encodeURIComponent(query.trim())}&limit=8`,
          { signal: controllerRef.current.signal }
        );

        if (!res.ok) {
          throw new Error('Search failed');
        }

        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError('Could not search right now');
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const persistHistory = (term: string) => {
    if (!term) return;
    const next = [term, ...recent.filter(item => item !== term)].slice(0, 6);
    setRecent(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const clearSearchHistory = () => {
    setRecent([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
  };

  const handleSelectMovie = (movie: Movie) => {
    if (!movie?._id) return;
    persistHistory(query || movie.title);
    setOpen(false);
    setQuery('');
    navigate(`/video/${movie._id}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    persistHistory(query.trim());
    setOpen(false);
    navigate(`/catalog?q=${encodeURIComponent(query.trim())}`);
  };

  const handleChipClick = (term: string) => {
    setQuery(term);
    setOpen(true);
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${isMobile ? 'w-full' : 'w-full md:w-[360px]'} ${className}`}
    >
      <form
        onSubmit={handleSubmit}
        className={`flex items-center gap-2 rounded-none border border-amber-100/15 bg-white/5 backdrop-blur-sm px-3 py-2 transition-all duration-200 focus-within:border-amber-100/40 focus-within:bg-white/10 focus-within:shadow-lg focus-within:shadow-amber-500/10 ${
          isMobile ? 'w-full' : 'w-full'
        }`}
      >
        <Search className="h-4 w-4 text-amber-100/50" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={t('search.placeholder')}
          className="w-full bg-transparent text-sm font-light text-white placeholder-amber-100/40 focus:outline-none"
        />
        {query && !loading && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="text-amber-100/40 hover:text-amber-100 transition"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-amber-100/70" />}
      </form>

      {open && (
        <div className="fixed inset-0 z-[120]">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="fixed inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/50" />

          {/* Close button - fixed position */}
          <button
            onClick={() => setOpen(false)}
            className="fixed top-6 right-6 z-[130] p-2 rounded-full border border-amber-100/20 bg-black/40 backdrop-blur-sm text-amber-100/70 hover:text-amber-100 hover:border-amber-100/40 hover:bg-black/60 transition-all duration-200 group"
            aria-label="Close search"
          >
            <X className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
          </button>

          <div ref={overlayRef} className="fixed inset-0 z-[125] overflow-y-auto">
            <div className="min-h-screen max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-12">

            {/* Expanded search input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-3 rounded-none border border-amber-100/25 bg-white/10 backdrop-blur-lg px-4 py-3 text-base sm:text-lg transition-all duration-200 focus-within:border-amber-100/40 focus-within:bg-white/15"
            >
              <Search className="h-5 w-5 text-amber-100/60" />
              <input
                value={query}
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search.placeholder')}
                className="w-full bg-transparent text-base sm:text-lg font-light text-white placeholder-amber-100/50 focus:outline-none"
              />
              {query && !loading && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                  }}
                  className="text-amber-100/60 hover:text-amber-100 transition"
                  aria-label="Clear search"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              {loading && <Loader2 className="h-5 w-5 animate-spin text-amber-100/80" />}
            </form>

            {error && <div className="mt-3 text-sm text-red-200">{error}</div>}

            {/* Results grid */}
            <div className="mt-6 space-y-6">
              {results.length > 0 ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-100/70">
                      <Sparkles className="h-4 w-4 text-amber-200" />
                      {t('search.results')}
                    </div>
                    <span className="text-amber-100/50 text-xs">{results.length} {t('search.matches')}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {results.map((movie, idx) => (
                      <button
                        key={movie._id}
                        onClick={() => handleSelectMovie(movie)}
                        className="group relative aspect-[3/4] overflow-hidden border border-amber-100/10 bg-white/5 text-left shadow-lg shadow-black/30 hover:border-amber-100/30 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 hover:scale-[1.02]"
                        style={{ 
                          animation: `fadeInUp 0.4s ease-out ${idx * 0.05}s both` 
                        }}
                      >
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: movie.thumbnailUrl ? `url(${movie.thumbnailUrl})` : undefined }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500/10" />
                        <div className="absolute bottom-0 p-3 space-y-1">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-amber-100/70">
                            <span>{movie.genre?.[0] || 'Film'}</span>
                            <span className="h-[1px] w-6 bg-amber-100/30" />
                            <span>{movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '—'}</span>
                          </div>
                          <p className="text-sm sm:text-base text-white font-semibold line-clamp-1 group-hover:text-amber-100 transition-colors">
                            {movie.title}
                          </p>
                          <p className="text-[12px] text-amber-100/70 line-clamp-1">
                            {movie.director || 'Director'}{movie.language ? ` • ${movie.language}` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                query && !loading && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 py-8 text-center">
                    <div className="text-amber-100/40 mb-2">
                      <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    </div>
                    <p className="text-sm text-amber-100/70">{t('search.noResults')} "{query}".</p>
                    <p className="text-xs text-amber-100/50 mt-1">{t('search.tryDifferent')}</p>
                  </div>
                )
              )}

              {/* Recent searches */}
              {recent.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-amber-100/60">
                      <Clock3 className="h-4 w-4" />
                      {t('search.recent')}
                    </div>
                    <button
                      onClick={clearSearchHistory}
                      className="group flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-amber-100/50 hover:text-amber-100 transition-colors"
                      aria-label="Clear search history"
                    >
                      <span className="hidden sm:inline">{t('common.clear')}</span>
                      <X className="h-3.5 w-3.5 group-hover:rotate-90 transition-transform duration-200" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((item, idx) => (
                      <button
                        key={item}
                        onClick={() => handleChipClick(item)}
                        className="rounded-none border border-amber-100/20 px-3 py-1 text-xs text-amber-100/80 hover:border-amber-100/40 hover:text-amber-100 hover:bg-white/5 transition-all duration-150"
                        style={{ 
                          animation: `fadeInUp 0.3s ease-out ${idx * 0.05}s both` 
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending picks */}
              {trending.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-400">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-amber-100/60">
                    <Sparkles className="h-4 w-4" />
                    {t('search.trending')}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {trending.map((movie, idx) => (
                      <button
                        key={movie._id}
                        onClick={() => handleSelectMovie(movie)}
                        className="group relative aspect-[3/4] overflow-hidden border border-amber-100/10 bg-white/5 text-left shadow-lg shadow-black/30 hover:border-amber-100/30 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 hover:scale-[1.02]"
                        style={{ 
                          animation: `fadeInUp 0.4s ease-out ${idx * 0.05 + 0.1}s both` 
                        }}
                      >
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: movie.thumbnailUrl ? `url(${movie.thumbnailUrl})` : undefined }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500/10" />
                        <div className="absolute bottom-0 p-3 space-y-1">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-amber-100/70">
                            <span>{movie.genre?.[0] || 'Film'}</span>
                            <span className="h-[1px] w-6 bg-amber-100/30" />
                            <span>{movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '—'}</span>
                          </div>
                          <p className="text-sm sm:text-base text-white font-semibold line-clamp-1 group-hover:text-amber-100 transition-colors">
                            {movie.title}
                          </p>
                          <p className="text-[12px] text-amber-100/70 line-clamp-1">
                            {movie.genre?.slice(0, 2).join(' • ') || '—'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;

