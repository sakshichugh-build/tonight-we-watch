'use client'

import { motion, PanInfo } from 'framer-motion'
import { TitleCard } from '@/lib/types'

export default function SwipeCard({
  title,
  active,
  onSwipe,
}: {
  title: TitleCard
  active: boolean
  onSwipe: (direction: 'like' | 'pass') => void
}) {
  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 120) onSwipe('like')
    else if (info.offset.x < -120) onSwipe('pass')
  }

  return (
    <motion.div
      className="absolute inset-0 select-none overflow-hidden rounded-3xl border border-ash/30 bg-surface shadow-2xl shadow-black/60"
      drag={active ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.03 }}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {title.posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={title.posterUrl} alt={title.title} className="h-2/3 w-full object-cover" draggable={false} />
      ) : (
        <div className="flex h-2/3 w-full items-center justify-center bg-ink italic text-ash">No poster</div>
      )}
      <div className="p-4">
        <h2 className="text-lg font-semibold leading-tight">
          {title.title} {title.year ? <span className="font-normal italic text-ash">({title.year})</span> : ''}
        </h2>
        <div className="mt-1.5 flex gap-3 text-sm text-white/70">
          {title.imdbRating != null && <span className="font-medium text-brand">★ {title.imdbRating.toFixed(1)}</span>}
          {title.runtimeMinutes != null && <span>{title.runtimeMinutes} min</span>}
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-white/70">{title.overview}</p>
      </div>
    </motion.div>
  )
}
