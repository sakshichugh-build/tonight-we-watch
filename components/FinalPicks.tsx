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
      <h2 className="mb-2 text-xl font-bold">No mutual match yet — here&apos;s your top 5</h2>
      <p className="mb-6 text-sm text-neutral-400">Based on what you both leaned toward across both rounds. Pick one together.</p>
      <div className="space-y-3">
        {titles.map((t) => (
          <div key={`${t.mediaType}:${t.tmdbId}`} className="flex items-center gap-3 rounded-lg bg-neutral-900 p-3">
            {t.posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.posterUrl} alt={t.title} className="h-24 w-16 rounded object-cover" />
            )}
            <div className="flex-1">
              <p className="font-semibold">
                {t.title} {t.year ? `(${t.year})` : ''}
              </p>
              <p className="text-sm text-neutral-400">
                ★ {t.imdbRating?.toFixed(1) ?? '–'} · {t.score}/2 liked
              </p>
            </div>
            <button onClick={() => pick(t)} className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black">
              We&apos;ll watch this
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
