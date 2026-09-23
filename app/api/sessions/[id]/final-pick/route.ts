import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { fetchOttDetails } from '@/lib/streaming'
import { MediaType } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { tmdbId, mediaType } = (await req.json()) as { tmdbId: number; mediaType: MediaType }
  const db = supabaseAdmin()

  const { data: pool } = await db
    .from('title_pools')
    .select('*')
    .eq('session_id', params.id)
    .eq('round', 3)
    .maybeSingle()
  const title = (pool?.titles ?? []).find((t: any) => t.tmdbId === tmdbId && t.mediaType === mediaType)

  const enrichment = await fetchOttDetails(title?.imdbId ?? null)

  await db.from('matches').upsert(
    {
      session_id: params.id,
      tmdb_id: tmdbId,
      media_type: mediaType,
      round: null,
      ott_platforms: enrichment.ottPlatforms,
      imdb_rating: enrichment.imdbRating,
    },
    { onConflict: 'session_id,tmdb_id,media_type', ignoreDuplicates: true }
  )
  await db.from('sessions').update({ status: 'matched' }).eq('id', params.id)

  return NextResponse.json({ ok: true })
}
