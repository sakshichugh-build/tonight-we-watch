import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { fetchOttDetails } from '@/lib/streaming'
import { MediaType, SwipeDirection } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as {
    participantId: string
    tmdbId: number
    mediaType: MediaType
    direction: SwipeDirection
  }
  const db = supabaseAdmin()

  const { data: session } = await db.from('sessions').select('*').eq('id', params.id).maybeSingle()
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  const round = session.round

  await db.from('swipes').upsert(
    {
      session_id: params.id,
      participant_id: body.participantId,
      round,
      tmdb_id: body.tmdbId,
      media_type: body.mediaType,
      direction: body.direction,
    },
    { onConflict: 'session_id,participant_id,round,tmdb_id,media_type' }
  )

  if (body.direction !== 'like') {
    return NextResponse.json({ matched: false })
  }

  const { data: participants } = await db.from('participants').select('*').eq('session_id', params.id)
  const other = (participants ?? []).find((p) => p.id !== body.participantId)
  if (!other) {
    return NextResponse.json({ matched: false })
  }

  const { data: otherLike } = await db
    .from('swipes')
    .select('*')
    .eq('session_id', params.id)
    .eq('participant_id', other.id)
    .eq('round', round)
    .eq('tmdb_id', body.tmdbId)
    .eq('media_type', body.mediaType)
    .eq('direction', 'like')
    .maybeSingle()

  if (!otherLike) {
    return NextResponse.json({ matched: false })
  }

  const expectedStatus = round === 1 ? 'swiping_round_1' : 'swiping_round_2'
  await db.from('sessions').update({ status: 'matched' }).eq('id', params.id).eq('status', expectedStatus)

  const { data: pool } = await db
    .from('title_pools')
    .select('*')
    .eq('session_id', params.id)
    .eq('round', round)
    .maybeSingle()
  const titleCard = (pool?.titles ?? []).find(
    (t: any) => t.tmdbId === body.tmdbId && t.mediaType === body.mediaType
  )

  // Only ever call the OTT lookup for the ONE title that just matched (see lib/streaming.ts).
  const enrichment = await fetchOttDetails(titleCard?.imdbId ?? null)

  await db.from('matches').upsert(
    {
      session_id: params.id,
      tmdb_id: body.tmdbId,
      media_type: body.mediaType,
      round,
      ott_platforms: enrichment.ottPlatforms,
      imdb_rating: enrichment.imdbRating,
    },
    { onConflict: 'session_id,tmdb_id,media_type', ignoreDuplicates: true }
  )

  const title = titleCard
    ? { ...titleCard, ottPlatforms: enrichment.ottPlatforms, imdbRating: enrichment.imdbRating ?? titleCard.imdbRating }
    : null

  return NextResponse.json({ matched: true, title })
}
