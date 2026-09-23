'use client'

import { useState } from 'react'
import { MediaType, OttPlatform, TitleCard } from '@/lib/types'

type MatchDetails = Partial<TitleCard> & { ottPlatforms: OttPlatform[]; tmdbId: number; mediaType: MediaType }

export default function MatchReveal({
  sessionId,
  participantId,
  match,
}: {
  sessionId: string
  participantId: string
  match: MatchDetails
}) {
  const [rating, setRating] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)

  async function submitRating(value: number) {
    setRating(value)
    await fetch(`/api/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId, tmdbId: match.tmdbId, mediaType: match.mediaType, rating: value }),
    })
    setSaved(true)
  }

  return (
    <div className="text-center">
      <p className="text-sm font-bold uppercase tracking-[0.35em] text-ink">
        It&apos;s a <span className="italic">match</span>
      </p>
      {match.posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={match.posterUrl}
          alt={match.title}
          className="mx-auto mt-5 w-48 rounded-2xl border-2 border-white/40 shadow-xl shadow-black/30"
        />
      )}
      <h2 className="mt-5 text-2xl font-bold leading-tight">
        {match.title} {match.year ? <span className="font-normal italic text-white/70">({match.year})</span> : ''}
      </h2>
      <div className="mt-1.5 flex justify-center gap-3 text-sm text-white/80">
        {match.imdbRating != null && <span className="font-bold text-ink">★ {match.imdbRating.toFixed(1)}</span>}
        {match.runtimeMinutes != null && <span>{match.runtimeMinutes} min</span>}
      </div>
      <p className="mx-auto mt-3 max-w-md text-white/80">{match.overview}</p>

      <div className="mt-7">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/90">
          Watch it <span className="italic normal-case tracking-normal text-ink">now</span> on
        </h3>
        <div className="flex flex-wrap justify-center gap-2">
          {match.ottPlatforms.length === 0 && (
            <p className="text-sm italic text-white/70">No Indian streaming links found for this title yet.</p>
          )}
          {match.ottPlatforms.map((p) => (
            <a
              key={p.name}
              href={p.link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition-all hover:bg-black"
            >
              {p.name}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-9">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-white/90">
          Watched it? <span className="italic normal-case tracking-normal text-white/70">Rate it</span>
        </h3>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => submitRating(n)}
              className={`text-2xl transition-colors ${rating && n <= rating ? 'text-ink' : 'text-white/40'}`}
              aria-label={`Rate ${n} stars`}
            >
              ★
            </button>
          ))}
        </div>
        {saved && <p className="mt-2 text-sm italic text-ink">Saved, thanks!</p>}
      </div>
    </div>
  )
}
