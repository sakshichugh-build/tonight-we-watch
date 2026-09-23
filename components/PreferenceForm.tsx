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
  return `rounded-full border px-3 py-1.5 text-sm transition-colors ${
    active ? 'border-white bg-white text-black' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
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
        <legend className="mb-2 font-semibold">Mood (pick any that fit)</legend>
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
        <legend className="mb-2 font-semibold">Describe what you&apos;re in the mood for tonight (optional)</legend>
        <textarea
          value={moodText}
          onChange={(e) => setMoodText(e.target.value)}
          rows={3}
          placeholder="e.g. something with a slow burn mystery and a satisfying twist"
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 p-3 text-sm placeholder:text-neutral-600 focus:border-neutral-400 focus:outline-none"
        />
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Language</legend>
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
        <legend className="mb-2 font-semibold">Content type</legend>
        <div className="flex gap-2">
          {(['movies_only', 'include_series'] as ContentType[]).map((ct) => (
            <button type="button" key={ct} onClick={() => setContentType(ct)} className={pillClass(contentType === ct)}>
              {ct === 'movies_only' ? 'Movies only' : 'Include series'}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Minimum IMDb rating</legend>
        <div className="flex flex-wrap gap-2">
          {RATINGS.map((r) => (
            <button type="button" key={r} onClick={() => setMinRating(r)} className={pillClass(minRating === r)}>
              {r}+{r === 9 && <span className="ml-1.5 text-xs text-amber-400">very few titles</span>}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Era</legend>
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
        className="w-full rounded-md bg-white py-3 font-semibold text-black transition-opacity disabled:opacity-40"
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </form>
  )
}
