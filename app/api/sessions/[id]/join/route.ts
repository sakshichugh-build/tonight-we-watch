import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const db = supabaseAdmin()

  const { data: session } = await db.from('sessions').select('*').eq('id', params.id).maybeSingle()
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { data: participants } = await db.from('participants').select('*').eq('session_id', params.id)
  const existingB = (participants ?? []).find((p) => p.role === 'B')
  if (existingB) {
    return NextResponse.json({ participantId: existingB.id, role: 'B' })
  }
  if ((participants ?? []).length >= 2) {
    return NextResponse.json({ error: 'This session already has two partners' }, { status: 409 })
  }

  const { data: participant, error } = await db
    .from('participants')
    .insert({ session_id: params.id, role: 'B' })
    .select()
    .single()
  if (error || !participant) {
    return NextResponse.json({ error: error?.message ?? 'Could not join session' }, { status: 500 })
  }

  if (session.status === 'waiting_for_partner') {
    await db.from('sessions').update({ status: 'collecting_prefs' }).eq('id', params.id)
  }

  return NextResponse.json({ participantId: participant.id, role: 'B' })
}
