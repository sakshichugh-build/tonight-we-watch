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
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-brand">
        🎉 It&apos;s a <span className="italic">match</span>
      </p>
      {match.posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={match.posterUrl}
          alt={match.title}
          className="mx-auto mt-5 w-48 rounded-2xl border border-line shadow-xl shadow-ink/10"
        />
      )}
      <h2 className="mt-5 text-2xl font-bold leading-tight text-ink">
        {match.title} {match.year ? <span className="font-normal italic text-ash">({match.year})</span> : ''}
      </h2>
      <div className="mt-1.5 flex justify-center gap-3 text-sm text-ash">
        {match.imdbRating != null && <span className="font-semibold text-brand">★ {match.imdbRating.toFixed(1)}</span>}
        {match.runtimeMinutes != null && <span>{match.runtimeMinutes} min</span>}
      </div>
      <p className="mx-auto mt-3 max-w-md text-ash">{match.overview}</p>

      <div className="mt-7">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink">
          📺 Watch it <span className="italic normal-case tracking-normal text-brand">now</span> on
        </h3>
        <div className="flex flex-wrap justify-center gap-2">
          {match.ottPlatforms.length === 0 && (
            <p className="text-sm italic text-ash">No Indian streaming links found for this title yet.</p>
          )}
          {match.ottPlatforms.map((p) => (
            <a
              key={p.name}
              href={p.link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all hover:brightness-105"
            >
              {p.name}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-9">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink">
          Watched it? <span className="italic normal-case tracking-normal text-ash">Rate it</span>
        </h3>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => submitRating(n)}
              className={`text-2xl transition-colors ${rating && n <= rating ? 'text-brand' : 'text-line'}`}
              aria-label={`Rate ${n} stars`}
            >
              ★
            </button>
          ))}
        </div>
        {saved && <p className="mt-2 text-sm italic text-brand">Saved, thanks! 🍿</p>}
      </div>
    </div>
  )
}
