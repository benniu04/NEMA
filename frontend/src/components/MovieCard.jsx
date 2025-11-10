import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import LazyImage from './LazyImage'
import API_BASE_URL from '../../config/api.js'

const MovieCard = ({ movie }) => {
  const [prefetched, setPrefetched] = useState(false);

  if (!movie) return null;

  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '';

  // Prefetch movie data on hover for instant loading
  const handleMouseEnter = () => {
    if (!prefetched && movie._id) {
      // Start prefetching movie data
      fetch(`${API_BASE_URL}/api/movies/${movie._id}`, {
        method: 'GET',
        credentials: 'include'
      }).then(() => {
        setPrefetched(true);
      }).catch(err => {
        console.debug('Prefetch failed:', err);
      });
    }
  };

  return (
    <Link
      to={`/video/${movie._id}`}
      onMouseEnter={handleMouseEnter}
      className="group relative w-[260px] sm:w-[300px] aspect-[16/9] flex-shrink-0 overflow-hidden rounded-none border border-white/10 bg-black/40 cursor-pointer"
    >
      <LazyImage
        src={movie.thumbnailUrl}
        alt={movie.title}
        className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-[1.04]"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="absolute bottom-0 p-3 sm:p-4 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
        <h3 className="text-white text-sm sm:text-base font-light line-clamp-1">{movie.title}</h3>
        <p className="text-white/70 text-xs sm:text-sm line-clamp-1">
          {movie.director}{year ? ` • ${year}` : ''}
        </p>
        {Array.isArray(movie.genre) && movie.genre.length > 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {movie.genre.slice(0, 2).map((g, i) => (
              <span key={i} className="text-[10px] sm:text-[11px] px-2 py-0.5 bg-white/10 text-white/80">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

export default MovieCard


