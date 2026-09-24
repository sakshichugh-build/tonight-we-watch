'use client'

import { FormEvent, useState } from 'react'
import { ContentType, Era, Language, MinRating, Mood, PreferencesInput } from '@/lib/types'

const MOODS: { value: Mood; label: string }[] = [
  { value: 'light_fun', label: 'Light & fun' },
  { value: 'intense_gripping', label: 'Intense & gripping' },
  { value: 'scary', label: 'Scary' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'other', label: 'Other' },
]

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'hindi', label: 'Hindi' },
  { value: 'english', label: 'English' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'kannada', label: 'Kannada' },
  { value: 'any', label: 'Any' },
]

const ERAS: { value: Era; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'classic', label: 'Classic (pre-2000)' },
  { value: '2000_2020', label: '2000–2020' },
  { value: 'recent', label: 'Recent (2021–2026)' },
]

const RATINGS: MinRating[] = [6, 7, 8, 9]

function toggleExclusive<T extends string>(current: T[], value: T, exclusiveValue: T): T[] {
  if (value === exclusiveValue) {
    return current.includes(value) ? [] : [exclusiveValue]
  }
  const withoutExclusive = current.filter((v) => v !== exclusiveValue)
  return withoutExclusive.includes(value)
    ? withoutExclusive.filter((v) => v !== value)
    : [...withoutExclusive, value]
}

function pillClass(active: boolean) {
  return `rounded-full border px-3.5 py-2 text-sm transition-all ${
    active
      ? 'border-brand bg-brand font-medium text-white shadow-sm shadow-brand/30'
      : 'border-line bg-white text-ink hover:border-ink/40'
  }`
}

export default function PreferenceForm({
  onSubmit,
  submitting,
  submitLabel,
  submittingLabel = 'Saving…',
}: {
  onSubmit: (prefs: PreferencesInput) => void
  submitting: boolean
  submitLabel: string
  submittingLabel?: string
}) {
  const [mood, setMood] = useState<Mood[]>([])
  const [moodText, setMoodText] = useState('')
  const [languages, setLanguages] = useState<Language[]>([])
  const [contentType, setContentType] = useState<ContentType | null>(null)
  const [minRating, setMinRating] = useState<MinRating | null>(null)
  const [eras, setEras] = useState<Era[]>([])

  const canSubmit =
    mood.length > 0 && languages.length > 0 && contentType !== null && minRating !== null && eras.length > 0

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || submitting) return
    onSubmit({ mood, moodText, languages, contentType: contentType!, minRating: minRating!, eras })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink">Mood <span className="italic normal-case tracking-normal text-ash">(pick any that fit)</span></legend>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              type="button"
              key={m.value}
              onClick={() => setMood((prev) => (prev.includes(m.value) ? prev.filter((x) => x !== m.value) : [...prev, m.value]))}
              className={pillClass(mood.includes(m.value))}
            >
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink">
          Describe the mood <span className="italic normal-case tracking-normal text-ash">(optional)</span>
        </legend>
        <textarea
          value={moodText}
          onChange={(e) => setMoodText(e.target.value)}
          rows={3}
          placeholder="e.g. something with a slow burn mystery and a satisfying twist"
          className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-ink placeholder:italic placeholder:text-ash/70 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink">Language</legend>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              type="button"
              key={l.value}
              onClick={() => setLanguages((prev) => toggleExclusive(prev, l.value, 'any'))}
              className={pillClass(languages.includes(l.value))}
            >
              {l.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink">Content type</legend>
        <div className="flex gap-2">
          {(['movies_only', 'include_series'] as ContentType[]).map((ct) => (
            <button type="button" key={ct} onClick={() => setContentType(ct)} className={pillClass(contentType === ct)}>
              {ct === 'movies_only' ? 'Movies only' : 'Include series'}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink">Minimum IMDb rating</legend>
        <div className="flex flex-wrap items-center gap-2">
          {RATINGS.map((r) => (
            <button type="button" key={r} onClick={() => setMinRating(r)} className={pillClass(minRating === r)}>
              {r}+{r === 9 && <span className="ml-1.5 text-xs italic opacity-80">very few titles</span>}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink">Era</legend>
        <div className="flex flex-wrap gap-2">
          {ERAS.map((e) => (
            <button
              type="button"
              key={e.value}
              onClick={() => setEras((prev) => toggleExclusive(prev, e.value, 'any'))}
              className={pillClass(eras.includes(e.value))}
            >
              {e.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="w-full rounded-full bg-brand py-4 font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:bg-line disabled:text-ash/60 disabled:shadow-none"
      >
        {submitting ? <span className="italic">{submittingLabel}</span> : submitLabel}
      </button>
    </form>
  )
}
