import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { runRound1 } from '@/lib/orchestrate'
import { PreferencesInput } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as PreferencesInput & { participantId: string }
  const db = supabaseAdmin()

  const { data: participant } = await db
    .from('participants')
    .select('*')
    .eq('id', body.participantId)
    .eq('session_id', params.id)
    .maybeSingle()
  if (!participant) {
    return NextResponse.json({ error: 'Invalid participant for this session' }, { status: 403 })
  }

  const { error } = await db.from('preferences').upsert(
    {
      session_id: params.id,
      participant_id: body.participantId,
      mood: body.mood,
      mood_text: body.moodText,
      languages: body.languages,
      content_type: body.contentType,
      min_rating: body.minRating,
      eras: body.eras,
    },
    { onConflict: 'session_id,participant_id' }
  )
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { count } = await db
    .from('preferences')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', params.id)

  if ((count ?? 0) >= 2) {
    // Compare-and-swap so a race between two near-simultaneous submits only triggers generation once.
    const { data: claim } = await db
      .from('sessions')
      .update({ status: 'generating' })
      .eq('id', params.id)
      .eq('status', 'collecting_prefs')
      .select()
    if (claim && claim.length > 0) {
      await runRound1(params.id)
    }
  }

  return NextResponse.json({ ok: true })
}
