import { Brief, Era, MediaType, MergedFilters, TitleCard } from './types'
import { dedupeTitles } from './matching'

const TMDB_BASE = 'https://api.themoviedb.org/3'

const LANGUAGE_CODES: Record<string, string> = {
  hindi: 'hi',
  english: 'en',
  tamil: 'ta',
  telugu: 'te',
  kannada: 'kn',
}

function tmdbHeaders() {
  return {
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

function eraDateRange(era: Era): { gte?: string; lte?: string } {
  switch (era) {
    case 'classic':
      return { lte: '1999-12-31' }
    case '2000_2020':
      return { gte: '2000-01-01', lte: '2020-12-31' }
    case 'recent':
      return { gte: '2021-01-01' }
    default:
      return {}
  }
}

async function fetchGenreMap(mediaType: MediaType): Promise<Map<number, string>> {
  const res = await fetch(`${TMDB_BASE}/genre/${mediaType}/list?language=en-US`, {
    headers: tmdbHeaders(),
    cache: 'force-cache',
  })
  if (!res.ok) return new Map()
  const data = await res.json()
  return new Map((data.genres ?? []).map((g: { id: number; name: string }) => [g.id, g.name]))
}

function resolveGenreIdsFromMap(genreMap: Map<number, string>, names: string[]): number[] {
  const lower = names.map((n) => n.toLowerCase())
  const ids: number[] = []
  for (const [id, name] of genreMap.entries()) {
    const lname = name.toLowerCase()
    if (lower.some((n) => lname.includes(n) || n.includes(lname))) ids.push(id)
  }
  return ids
}

async function resolveKeywordIds(keywords: string[]): Promise<number[]> {
  const ids: number[] = []
  for (const kw of keywords.slice(0, 6)) {
    try {
      const res = await fetch(`${TMDB_BASE}/search/keyword?query=${encodeURIComponent(kw)}`, {
        headers: tmdbHeaders(),
      })
      if (!res.ok) continue
      const data = await res.json()
      if (data.results?.[0]?.id) ids.push(data.results[0].id)
    } catch {
      // best-effort — a failed keyword lookup just means one less filter, not a hard failure
    }
  }
  return ids
}

function normalize(mediaType: MediaType, raw: any, genreMap: Map<number, string>): TitleCard {
  const title = mediaType === 'movie' ? raw.title : raw.name
  const dateStr = mediaType === 'movie' ? raw.release_date : raw.first_air_date
  const year = dateStr ? Number(String(dateStr).slice(0, 4)) : null
  const genreIds: number[] = raw.genre_ids ?? (raw.genres ?? []).map((g: any) => g.id) ?? []
  return {
    tmdbId: raw.id,
    mediaType,
    imdbId: null,
    title: title ?? 'Untitled',
    year: Number.isFinite(year) ? year : null,
    posterUrl: raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : null,
    imdbRating: typeof raw.vote_average === 'number' ? Math.round(raw.vote_average * 10) / 10 : null,
    runtimeMinutes: raw.runtime ?? (Array.isArray(raw.episode_run_time) ? raw.episode_run_time[0] : null) ?? null,
    overview: raw.overview ?? '',
    genres: genreIds.map((id) => genreMap.get(id) ?? '').filter(Boolean),
    ottPlatforms: [],
  }
}

interface DiscoverOpts {
  genreIds?: number[]
  keywordIds?: number[]
}

/** Run one discover query (2 pages) for a single language + era range. */
async function discoverOnce(
  mediaType: MediaType,
  filters: MergedFilters,
  lang: string | undefined,
  range: { gte?: string; lte?: string },
  opts: DiscoverOpts,
  genreMap: Map<number, string>
): Promise<TitleCard[]> {
  const dateField = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date'
  const today = new Date().toISOString().slice(0, 10)
  // Never recommend unreleased titles — this is a "watch tonight" app. Cap the upper
  // date bound at today (or the era's own end date, whichever is earlier).
  const upperBound = range.lte && range.lte < today ? range.lte : today
  const results: TitleCard[] = []
  for (let page = 1; page <= 2; page++) {
    const params = new URLSearchParams({
      sort_by: 'popularity.desc',
      page: String(page),
      include_adult: 'false',
      'vote_average.gte': String(filters.minRating),
      'vote_count.gte': '50',
    })
    if (lang) params.set('with_original_language', lang)
    if (opts.genreIds && opts.genreIds.length > 0) params.set('with_genres', opts.genreIds.join('|'))
    if (opts.keywordIds && opts.keywordIds.length > 0) params.set('with_keywords', opts.keywordIds.join('|'))
    if (range.gte) params.set(`${dateField}.gte`, range.gte)
    params.set(`${dateField}.lte`, upperBound)

    const res = await fetch(`${TMDB_BASE}/discover/${mediaType}?${params.toString()}`, { headers: tmdbHeaders() })
    if (!res.ok) break
    const data = await res.json()
    for (const raw of data.results ?? []) results.push(normalize(mediaType, raw, genreMap))
    if (!data.total_pages || page >= data.total_pages) break
  }
  return results
}

/**
 * Discover titles in layers so the pool is never starved by an over-specific brief:
 *   1. genres + keywords (best thematic match)   — never required, just tried first
 *   2. genres only (mood-aligned, broad)
 *   3. base filters only (language/era/rating)   — backfill so we always fill the deck
 * Each layer only runs if we still need more titles.
 */
async function discoverForMediaType(
  mediaType: MediaType,
  filters: MergedFilters,
  genreIds: number[],
  keywordIds: number[],
  genreMap: Map<number, string>,
  target: number
): Promise<TitleCard[]> {
  const languageCodes = filters.languages.map((l) => LANGUAGE_CODES[l]).filter(Boolean)
  const langCombos: (string | undefined)[] = languageCodes.length > 0 ? languageCodes : [undefined]
  const eraRanges = filters.eras.length > 0 ? filters.eras.map(eraDateRange) : [{}]

  const layers: DiscoverOpts[] = []
  if (genreIds.length > 0 && keywordIds.length > 0) layers.push({ genreIds, keywordIds })
  if (genreIds.length > 0) layers.push({ genreIds })
  layers.push({}) // base filters only — guaranteed backfill

  const collected: TitleCard[] = []
  const seen = new Set<string>()
  for (const layer of layers) {
    for (const lang of langCombos) {
      for (const range of eraRanges) {
        const batch = await discoverOnce(mediaType, filters, lang, range, layer, genreMap)
        for (const t of batch) {
          const key = `${t.mediaType}:${t.tmdbId}`
          if (seen.has(key)) continue
          seen.add(key)
          collected.push(t)
        }
      }
    }
    if (collected.length >= target) break
  }
  return collected
}

export async function buildTitlePool(
  filters: MergedFilters,
  brief: Brief,
  excludeKeys: Set<string> = new Set()
): Promise<TitleCard[]> {
  const mediaTypes: MediaType[] = filters.contentType === 'movies_only' ? ['movie'] : ['movie', 'tv']
  const target = mediaTypes.length > 1 ? 20 : 40

  const genreMaps = new Map<MediaType, Map<number, string>>()
  for (const mt of mediaTypes) genreMaps.set(mt, await fetchGenreMap(mt))
  const keywordIds = await resolveKeywordIds(brief.keywords)

  const perType = await Promise.all(
    mediaTypes.map((mt) => {
      const genreMap = genreMaps.get(mt)!
      const genreIds = resolveGenreIdsFromMap(genreMap, brief.genres)
      return discoverForMediaType(mt, filters, genreIds, keywordIds, genreMap, target)
    })
  )

  return dedupeTitles(perType.flat(), excludeKeys).slice(0, 40)
}

export async function fetchTitleDetails(mediaType: MediaType, tmdbId: number): Promise<Partial<TitleCard>> {
  try {
    const appendParam = mediaType === 'tv' ? '&append_to_response=external_ids' : ''
    const res = await fetch(`${TMDB_BASE}/${mediaType}/${tmdbId}?language=en-US${appendParam}`, {
      headers: tmdbHeaders(),
    })
    if (!res.ok) return {}
    const raw = await res.json()
    const imdbId = mediaType === 'movie' ? raw.imdb_id ?? null : raw.external_ids?.imdb_id ?? null
    return {
      runtimeMinutes: raw.runtime ?? raw.episode_run_time?.[0] ?? null,
      overview: raw.overview || undefined,
      imdbId,
    }
  } catch {
    return {}
  }
}
