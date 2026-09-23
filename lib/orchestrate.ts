import { supabaseAdmin } from './supabase/server'
import { generateBrief } from './gemini'
import { buildTitlePool, fetchTitleDetails } from './tmdb'
import { mergeFilters, dedupeTitles, computeCombinedScores, titleKey } from './matching'
import { PreferencesInput, TitleCard } from './types'

async function loadPreferences(sessionId: string) {
  const db = supabaseAdmin()
  const { data: participants } = await db
    .from('participants')
    .select('*')
    .eq('session_id', sessionId)
    .order('joined_at')
  const { data: prefs } = await db.from('preferences').select('*').eq('session_id', sessionId)

  const byRole: Record<'A' | 'B', { participantId: string; preferences: PreferencesInput } | undefined> = {
    A: undefined,
    B: undefined,
  }
  for (const p of participants ?? []) {
    const row = (prefs ?? []).find((pr) => pr.participant_id === p.id)
    if (row) {
      byRole[p.role as 'A' | 'B'] = {
        participantId: p.id,
        preferences: {
          mood: row.mood,
          moodText: row.mood_text ?? '',
          languages: row.languages,
          contentType: row.content_type,
          minRating: row.min_rating,
          eras: row.eras,
        },
      }
    }
  }
  return byRole
}

async function loadCoupleLikedTitles(coupleId: string | null): Promise<string[]> {
  if (!coupleId) return []
  const db = supabaseAdmin()
  const { data: sessions } = await db.from('sessions').select('id').eq('couple_id', coupleId)
  const sessionIds = (sessions ?? []).map((s) => s.id)
  if (sessionIds.length === 0) return []

  const { data: swipes } = await db
    .from('swipes')
    .select('session_id, tmdb_id, media_type')
    .in('session_id', sessionIds)
    .eq('direction', 'like')
  const { data: pools } = await db.from('title_pools').select('session_id, titles').in('session_id', sessionIds)

  const lookup = new Map<string, string>()
  for (const pool of pools ?? []) {
    for (const t of (pool.titles as TitleCard[]) ?? []) {
      lookup.set(`${pool.session_id}:${titleKey(t)}`, t.title)
    }
  }

  const names = new Set<string>()
  for (const s of swipes ?? []) {
    const name = lookup.get(`${s.session_id}:${s.media_type}:${s.tmdb_id}`)
    if (name) names.add(name)
  }
  return Array.from(names).slice(0, 20)
}

async function enrichAndSavePool(
  sessionId: string,
  round: number,
  candidates: TitleCard[],
  minRating: number,
  brief: unknown
) {
  const db = supabaseAdmin()
  // Rating here is TMDB's own vote_average, used as a fast, quota-free proxy for the min-rating
  // filter and the swipe-deck cards. The real IMDb rating (and OTT links) only get fetched from
  // RapidAPI once, lazily, for whichever single title actually matches or gets picked — see
  // lib/streaming.ts for why (the OTT Details API's free tier caps at 120 requests/month).
  const withDetails = await Promise.all(
    candidates.map(async (t) => ({ ...t, ...(await fetchTitleDetails(t.mediaType, t.tmdbId)) }))
  )
  const finalPool = withDetails.filter((t) => (t.imdbRating ?? 0) >= minRating).slice(0, 30)

  await db
    .from('title_pools')
    .upsert({ session_id: sessionId, round, titles: finalPool, brief }, { onConflict: 'session_id,round' })

  return finalPool
}

export async function runRound1(sessionId: string) {
  const db = supabaseAdmin()
  const [{ data: session }, byRole] = await Promise.all([
    db.from('sessions').select('*').eq('id', sessionId).single(),
    loadPreferences(sessionId),
  ])
  if (!byRole.A || !byRole.B) return null

  const coupleLikes = await loadCoupleLikedTitles(session?.couple_id ?? null)
  const filters = mergeFilters(byRole.A.preferences, byRole.B.preferences)
  const brief = await generateBrief(
    [
      { role: 'A', preferences: byRole.A.preferences },
      { role: 'B', preferences: byRole.B.preferences },
    ],
    { pastLikes: coupleLikes.length > 0 ? coupleLikes : undefined }
  )

  const candidates = await buildTitlePool(filters, brief)
  const finalPool = await enrichAndSavePool(sessionId, 1, candidates, filters.minRating, brief)

  await db.from('sessions').update({ status: 'swiping_round_1', round: 1 }).eq('id', sessionId)
  return finalPool
}

export async function runRound2(sessionId: string) {
  const db = supabaseAdmin()
  const byRole = await loadPreferences(sessionId)
  if (!byRole.A || !byRole.B) return null

  const { data: round1Pool } = await db
    .from('title_pools')
    .select('*')
    .eq('session_id', sessionId)
    .eq('round', 1)
    .maybeSingle()
  const round1Titles: TitleCard[] = round1Pool?.titles ?? []
  const excludeKeys = new Set(round1Titles.map(titleKey))
  const nameByKey = new Map(round1Titles.map((t) => [titleKey(t), t.title]))

  const { data: likeSwipes } = await db
    .from('swipes')
    .select('*')
    .eq('session_id', sessionId)
    .eq('round', 1)
    .eq('direction', 'like')
  const likedTitleNames = Array.from(
    new Set(
      (likeSwipes ?? [])
        .map((s) => nameByKey.get(`${s.media_type}:${s.tmdb_id}`))
        .filter((n): n is string => !!n)
    )
  )

  const filters = mergeFilters(byRole.A.preferences, byRole.B.preferences)
  const brief = await generateBrief(
    [
      { role: 'A', preferences: byRole.A.preferences },
      { role: 'B', preferences: byRole.B.preferences },
    ],
    {
      pastLikes: likedTitleNames.length > 0 ? likedTitleNames : undefined,
      roundHint:
        "This is round 2 — round 1 didn't produce a mutual match. Lean into whichever genres/tones drew " +
        'right-swipes from either partner, while still keeping something for both.',
    }
  )

  const candidates = await buildTitlePool(filters, brief, excludeKeys)
  const finalPool = await enrichAndSavePool(sessionId, 2, candidates, filters.minRating, brief)

  await db.from('sessions').update({ status: 'swiping_round_2', round: 2 }).eq('id', sessionId)
  return finalPool
}

export async function runFinalize(sessionId: string) {
  const db = supabaseAdmin()
  const { data: pools } = await db.from('title_pools').select('*').eq('session_id', sessionId).in('round', [1, 2])
  const allTitles = dedupeTitles((pools ?? []).flatMap((p) => (p.titles as TitleCard[]) ?? []))

  const { data: swipes } = await db
    .from('swipes')
    .select('*')
    .eq('session_id', sessionId)
    .eq('direction', 'like')
    .in('round', [1, 2])

  const likesByParticipant: Record<string, Set<string>> = {}
  for (const s of swipes ?? []) {
    likesByParticipant[s.participant_id] ??= new Set()
    likesByParticipant[s.participant_id].add(`${s.media_type}:${s.tmdb_id}`)
  }

  const scored = computeCombinedScores(allTitles, likesByParticipant).slice(0, 5)
  await db
    .from('title_pools')
    .upsert(
      { session_id: sessionId, round: 3, titles: scored, brief: { note: 'final top 5 by combined swipe score' } },
      { onConflict: 'session_id,round' }
    )
  await db.from('sessions').update({ status: 'final_pick', round: 3 }).eq('id', sessionId)
  return scored
}
