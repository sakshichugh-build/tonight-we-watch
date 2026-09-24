'use client'

import { ScoredTitle } from '@/lib/matching'

export default function FinalPicks({
  sessionId,
  titles,
  onPicked,
}: {
  sessionId: string
  titles: ScoredTitle[]
  onPicked: () => void
}) {
  async function pick(title: ScoredTitle) {
    await fetch(`/api/sessions/${sessionId}/final-pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId: title.tmdbId, mediaType: title.mediaType }),
    })
    onPicked()
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold leading-tight text-ink">
        No mutual match yet — here&apos;s your <span className="italic text-brand">top 5</span> 🎬
      </h2>
      <p className="mb-6 text-sm text-ash">
        Based on what you both leaned toward across both rounds.{' '}
        <span className="italic font-medium text-ink">Pick one together.</span>
      </p>
      <div className="space-y-3">
        {titles.map((t) => (
          <div
            key={`${t.mediaType}:${t.tmdbId}`}
            className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-sm shadow-ink/5"
          >
            {t.posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.posterUrl} alt={t.title} className="h-24 w-16 rounded-lg object-cover" />
            )}
            <div className="flex-1">
              <p className="font-semibold leading-tight text-ink">
                {t.title} {t.year ? <span className="font-normal italic text-ash">({t.year})</span> : ''}
              </p>
              <p className="mt-1 text-sm text-ash">
                <span className="font-semibold text-brand">★ {t.imdbRating?.toFixed(1) ?? '–'}</span> · {t.score}/2 liked
              </p>
            </div>
            <button
              onClick={() => pick(t)}
              className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all hover:brightness-105"
            >
              We&apos;ll watch this
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
