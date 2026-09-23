import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { PreferencesInput } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    return await createSession(req)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unexpected server error' }, { status: 500 })
  }
}

async function createSession(req: Request) {
  const body = (await req.json()) as PreferencesInput & { coupleSlug?: string | null }
  const db = supabaseAdmin()

  let coupleId: string | null = null
  if (body.coupleSlug) {
    const { data: existing } = await db.from('couples').select('id').eq('slug', body.coupleSlug).maybeSingle()
    if (existing) {
      coupleId = existing.id
    } else {
      const { data: created } = await db.from('couples').insert({ slug: body.coupleSlug }).select().single()
      coupleId = created?.id ?? null
    }
  }

  const { data: session, error: sessionErr } = await db
    .from('sessions')
    .insert({ status: 'waiting_for_partner', round: 0, couple_id: coupleId })
    .select()
    .single()
  if (sessionErr || !session) {
    return NextResponse.json({ error: sessionErr?.message ?? 'Could not create session' }, { status: 500 })
  }

  const { data: participant, error: partErr } = await db
    .from('participants')
    .insert({ session_id: session.id, role: 'A' })
    .select()
    .single()
  if (partErr || !participant) {
    return NextResponse.json({ error: partErr?.message ?? 'Could not create participant' }, { status: 500 })
  }

  const { error: prefErr } = await db.from('preferences').insert({
    session_id: session.id,
    participant_id: participant.id,
    mood: body.mood,
    mood_text: body.moodText,
    languages: body.languages,
    content_type: body.contentType,
    min_rating: body.minRating,
    eras: body.eras,
  })
  if (prefErr) {
    return NextResponse.json({ error: prefErr.message }, { status: 500 })
  }

  return NextResponse.json({ sessionId: session.id, participantId: participant.id, role: 'A' })
}
