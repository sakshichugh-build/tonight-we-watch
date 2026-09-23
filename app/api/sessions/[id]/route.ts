import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url)
  const participantId = url.searchParams.get('participantId')
  const db = supabaseAdmin()

  const { data: session } = await db.from('sessions').select('*').eq('id', params.id).maybeSingle()
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { data: participants } = await db.from('participants').select('*').eq('session_id', params.id)
  const me = (participants ?? []).find((p) => p.id === participantId) ?? null
  const partner = (participants ?? []).find((p) => p.id !== participantId) ?? null

  const { count: prefsCount } = await db
    .from('preferences')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', params.id)

  let myPreferencesSubmitted = false
  if (me) {
    const { data: myPrefs } = await db
      .from('preferences')
      .select('id')
      .eq('session_id', params.id)
      .eq('participant_id', me.id)
      .maybeSingle()
    myPreferencesSubmitted = !!myPrefs
  }

  let pool: any[] | null = null
  if (session.round > 0) {
    const { data: poolRow } = await db
      .from('title_pools')
      .select('*')
      .eq('session_id', params.id)
      .eq('round', session.round)
      .maybeSingle()
    pool = poolRow?.titles ?? null
  }

  let mySwipedKeys: string[] = []
  if (me && session.round > 0) {
    const { data: swipes } = await db
      .from('swipes')
      .select('tmdb_id, media_type')
      .eq('session_id', params.id)
      .eq('participant_id', me.id)
      .eq('round', session.round)
    mySwipedKeys = (swipes ?? []).map((s) => `${s.media_type}:${s.tmdb_id}`)
  }

  let match: any = null
  if (session.status === 'matched') {
    const { data: m } = await db
      .from('matches')
      .select('*')
      .eq('session_id', params.id)
      .order('matched_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (m) {
      const titleCard = (pool ?? []).find((t: any) => t.tmdbId === m.tmdb_id && t.mediaType === m.media_type)
      match = { ...titleCard, ottPlatforms: m.ott_platforms, imdbRating: m.imdb_rating ?? titleCard?.imdbRating ?? null }
    }
  }

  return NextResponse.json({
    session: { id: session.id, status: session.status, round: session.round },
    myRole: me?.role ?? null,
    partnerJoined: !!partner,
    myPreferencesSubmitted,
    preferencesSubmittedCount: prefsCount ?? 0,
    pool: session.status === 'final_pick' ? null : pool,
    finalPicks: session.status === 'final_pick' ? pool : null,
    mySwipedKeys,
    myFinishedRound: me?.finished_round ?? null,
    match,
  })
}
