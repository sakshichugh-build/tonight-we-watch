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
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">It&apos;s a match!</p>
      {match.posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={match.posterUrl} alt={match.title} className="mx-auto mt-4 w-48 rounded-lg" />
      )}
      <h2 className="mt-4 text-2xl font-bold">
        {match.title} {match.year ? `(${match.year})` : ''}
      </h2>
      <div className="mt-1 flex justify-center gap-3 text-sm text-neutral-400">
        {match.imdbRating != null && <span>★ {match.imdbRating.toFixed(1)}</span>}
        {match.runtimeMinutes != null && <span>{match.runtimeMinutes} min</span>}
      </div>
      <p className="mx-auto mt-3 max-w-md text-neutral-300">{match.overview}</p>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-neutral-400">Watch it now on</h3>
        <div className="flex flex-wrap justify-center gap-2">
          {match.ottPlatforms.length === 0 && (
            <p className="text-sm text-neutral-500">No Indian streaming links found for this title yet.</p>
          )}
          {match.ottPlatforms.map((p) => (
            <a
              key={p.name}
              href={p.link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black"
            >
              {p.name}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-2 text-sm font-semibold text-neutral-400">Watched it? Rate it</h3>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => submitRating(n)}
              className={`text-2xl ${rating && n <= rating ? 'text-yellow-400' : 'text-neutral-600'}`}
              aria-label={`Rate ${n} stars`}
            >
              ★
            </button>
          ))}
        </div>
        {saved && <p className="mt-1 text-sm text-emerald-400">Saved, thanks!</p>}
      </div>
    </div>
  )
}
