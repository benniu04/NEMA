import React, { useEffect } from 'react'
import { Play, X } from 'lucide-react'
import { Movie } from '../types'

interface UpNextOverlayProps {
  nextMovie: Movie
  secondsRemaining: number
  onPlayNext: () => void
  onCancel: () => void
  autoPlayEnabled: boolean
  onToggleAutoPlay: (enabled: boolean) => void
}

const UpNextOverlay: React.FC<UpNextOverlayProps> = ({
  nextMovie,
  secondsRemaining,
  onPlayNext,
  onCancel,
  autoPlayEnabled,
  onToggleAutoPlay,
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const imageUrl = nextMovie.thumbnailUrl || nextMovie.posterUrl
  const displaySeconds = Math.max(0, Math.ceil(secondsRemaining))

  return (
    <div className="absolute bottom-20 right-6 w-80 bg-black/90 backdrop-blur-md border border-white/20 shadow-2xl text-white animate-fade-in z-30">
      <button
        onClick={onCancel}
        className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded transition-colors"
        aria-label="Cancel up next"
      >
        <X className="w-4 h-4 text-white/70" />
      </button>

      <div className="p-4">
        <p className="text-xs uppercase tracking-widest text-amber-100/70 mb-3">
          {autoPlayEnabled ? `Up next in ${displaySeconds}s` : 'Up next'}
        </p>

        <div className="flex gap-3 mb-4">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={nextMovie.title}
              className="w-24 h-14 object-cover flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <h4 className="text-sm font-medium line-clamp-2">{nextMovie.title}</h4>
            {nextMovie.director && (
              <p className="text-xs text-white/60 mt-1 line-clamp-1">{nextMovie.director}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onPlayNext}
            className="flex items-center gap-2 px-3 py-1.5 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
          >
            <Play className="w-4 h-4 fill-current" />
            Play now
          </button>

          <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
            <input
              type="checkbox"
              checked={autoPlayEnabled}
              onChange={(e) => onToggleAutoPlay(e.target.checked)}
              className="accent-amber-400"
            />
            Auto-play
          </label>
        </div>
      </div>
    </div>
  )
}

export default UpNextOverlay
