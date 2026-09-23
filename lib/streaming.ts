import { OttPlatform } from './types'

const HOST = process.env.RAPIDAPI_STREAMING_HOST || 'ott-details.p.rapidapi.com'
const COUNTRY_CODE = 'IN'

export interface OttEnrichment {
  imdbRating: number | null
  ottPlatforms: OttPlatform[]
}

/**
 * Wraps the RapidAPI "OTT Details" API (gox-ai). One call per title, looked up by IMDb ID
 * (not TMDB ID) via GET /gettitleDetails?imdbid=tt..., returning `imdbrating` and
 * `streamingAvailability.country.<CODE>[]` (`{ platform, url }`) in a single response.
 *
 * Deliberately called ONE title at a time, only for a match or a final pick — the Basic
 * RapidAPI plan for this API caps at 120 requests/month with a 1 req/sec rate limit, which
 * would be exhausted in 2-3 pool generations if we enriched every ~30-40 candidate per round.
 * If you're on a higher RapidAPI tier and want ratings/links on every swipe card instead,
 * this is the function to call per pool candidate in lib/orchestrate.ts.
 */
export async function fetchOttDetails(imdbId: string | null): Promise<OttEnrichment> {
  if (!imdbId || !process.env.RAPIDAPI_KEY) {
    return { imdbRating: null, ottPlatforms: [] }
  }
  try {
    const res = await fetch(`https://${HOST}/gettitleDetails?imdbid=${encodeURIComponent(imdbId)}`, {
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': HOST,
      },
    })
    if (!res.ok) return { imdbRating: null, ottPlatforms: [] }
    const data = await res.json()
    const options = data?.streamingAvailability?.country?.[COUNTRY_CODE] ?? []
    const ottPlatforms: OttPlatform[] = options
      .filter((o: any) => o?.platform && o?.url)
      .map((o: any) => ({ name: o.platform, link: o.url }))
    return {
      imdbRating: typeof data?.imdbrating === 'number' ? data.imdbrating : null,
      ottPlatforms,
    }
  } catch {
    return { imdbRating: null, ottPlatforms: [] }
  }
}
