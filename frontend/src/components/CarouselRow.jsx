import React from 'react'
import MovieCard from './MovieCard'

const CarouselRow = ({ title, movies = [] }) => {
  if (!movies || movies.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between px-2 sm:px-0">
        <h2 className="text-xl sm:text-2xl font-light tracking-wide text-white/90">{title}</h2>
      </div>
      <div className="mt-4 overflow-x-auto hide-scrollbar">
        <div className="flex gap-4 sm:gap-6 px-2 sm:px-0">
          {movies.map((m) => (
            <MovieCard key={m._id} movie={m} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default CarouselRow


