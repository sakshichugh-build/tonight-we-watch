import { ContentType, Era, Language, MergedFilters, TitleCard } from './types'

function resolveList<T extends string>(a: T[], b: T[], exclusive: T): T[] {
  const aClean = a.filter((x) => x !== exclusive)
  const bClean = b.filter((x) => x !== exclusive)
  if (aClean.length === 0 && bClean.length === 0) return []
  if (aClean.length === 0) return bClean
  if (bClean.length === 0) return aClean
  const intersection = aClean.filter((x) => bClean.includes(x))
  return intersection.length > 0 ? intersection : Array.from(new Set([...aClean, ...bClean]))
}

/** Intersection of both partners' picks when it's non-empty, else the union, else no filter. */
export function mergeLanguages(a: Language[], b: Language[]): string[] {
  return resolveList(a, b, 'any')
}

export function mergeEras(a: Era[], b: Era[]): Era[] {
  return resolveList(a, b, 'any')
}

/** "Movies only" is an exclusion from either partner, not a preference to blend. */
export function mergeContentType(a: ContentType, b: ContentType): ContentType {
  return a === 'movies_only' || b === 'movies_only' ? 'movies_only' : 'include_series'
}

/** The stricter (higher) bound satisfies both partners. */
export function mergeMinRating(a: number, b: number): number {
  return Math.max(a, b)
}

export function mergeFilters(
  prefsA: { languages: Language[]; contentType: ContentType; minRating: number; eras: Era[] },
  prefsB: { languages: Language[]; contentType: ContentType; minRating: number; eras: Era[] }
): MergedFilters {
  return {
    languages: mergeLanguages(prefsA.languages, prefsB.languages),
    contentType: mergeContentType(prefsA.contentType, prefsB.contentType),
    minRating: mergeMinRating(prefsA.minRating, prefsB.minRating),
    eras: mergeEras(prefsA.eras, prefsB.eras),
  }
}

function seedFromString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h
}

function mulberry32(seed: number) {
  let state = seed
  return function random() {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic per-participant shuffle: stable across refresh, different between partners. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const rand = mulberry32(seedFromString(seed))
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function titleKey(t: { mediaType: string; tmdbId: number }): string {
  return `${t.mediaType}:${t.tmdbId}`
}

export function dedupeTitles(titles: TitleCard[], excludeKeys: Set<string> = new Set()): TitleCard[] {
  const seen = new Set<string>()
  const out: TitleCard[] = []
  for (const t of titles) {
    const key = titleKey(t)
    if (seen.has(key) || excludeKeys.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

export interface ScoredTitle extends TitleCard {
  score: number
}

/** Combined right-swipe score across both partners, tie-broken by IMDb rating. */
export function computeCombinedScores(
  pool: TitleCard[],
  likesByParticipant: Record<string, Set<string>>
): ScoredTitle[] {
  const participantIds = Object.keys(likesByParticipant)
  return pool
    .map((t) => {
      const key = titleKey(t)
      const score = participantIds.reduce((sum, pid) => sum + (likesByParticipant[pid].has(key) ? 1 : 0), 0)
      return { ...t, score }
    })
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score || (b.imdbRating ?? 0) - (a.imdbRating ?? 0))
}
