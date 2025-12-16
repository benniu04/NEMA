import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useSettings } from '../context/SettingsContext';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

const WatchlistPage = () => {
  const navigate = useNavigate();
  const { user, loading, isAuthenticated, removeFromWatchlist } = useUser();
  const { t } = useSettings();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/watchlist' } } });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleRemoveFromWatchlist = async (movieId, movieTitle, e) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmRemove = window.confirm(`Remove "${movieTitle}" from your watchlist?`);
    if (!confirmRemove) return;

    try {
      await removeFromWatchlist(movieId);
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      alert('Failed to remove from watchlist. Please try again.');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-amber-100/60">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const watchlist = user.watchlist?.filter(movie => movie && typeof movie === 'object' && movie._id) || [];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <NavBar />

      <main className="flex-grow pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-light tracking-wide mb-2">{t('nav.watchlist')}</h1>
            <p className="text-white/50 text-sm">
              {watchlist.length} {watchlist.length === 1 ? 'film' : 'films'} saved to watch later
            </p>
          </div>

          {/* Watchlist Content */}
          {watchlist.length === 0 ? (
            <div className="text-center py-20 border border-white/10 border-dashed">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto text-white/20 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <p className="text-white/40 mb-2 text-lg">{t('watchlist.empty') || 'Your watchlist is empty'}</p>
              <p className="text-white/30 text-sm mb-6">{t('watchlist.emptyDescription') || 'Save films to watch later by clicking the bookmark icon'}</p>
              <Link
                to="/"
                className="inline-block px-6 py-2.5 bg-white text-black hover:bg-white/90 transition-colors font-light tracking-wide"
              >
                {t('watchlist.browseFilms') || 'Browse Films'}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {watchlist.map((movie) => (
                <div key={movie._id} className="group relative">
                  <Link
                    to={`/video/${movie._id}`}
                    className="block"
                  >
                    {/* Poster */}
                    <div className="aspect-[2/3] bg-white/5 overflow-hidden mb-3 relative">
                      {movie.posterUrl ? (
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Movie Info */}
                    <div className="pr-8">
                      <p className="text-sm text-white/90 group-hover:text-white transition-colors truncate font-medium">
                        {movie.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        {movie.director && `${movie.director} • `}
                        {movie.releaseDate && new Date(movie.releaseDate).getFullYear()}
                      </p>
                    </div>
                  </Link>

                  {/* Remove button */}
                  <button
                    onClick={(e) => handleRemoveFromWatchlist(movie._id, movie.title, e)}
                    className="absolute top-2 right-2 p-2 bg-black/70 backdrop-blur-sm hover:bg-red-500/80 text-white/70 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                    title="Remove from watchlist"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WatchlistPage;
