import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { MediaType } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as {
    participantId: string
    tmdbId: number
    mediaType: MediaType
    rating: number
    notes?: string
  }
  const db = supabaseAdmin()

  const { error } = await db.from('ratings').upsert(
    {
      session_id: params.id,
      participant_id: body.participantId,
      tmdb_id: body.tmdbId,
      media_type: body.mediaType,
      rating: body.rating,
      notes: body.notes ?? null,
    },
    { onConflict: 'session_id,participant_id,tmdb_id,media_type' }
  )
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
