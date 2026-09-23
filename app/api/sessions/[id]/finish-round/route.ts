import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { runRound2, runFinalize } from '@/lib/orchestrate'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { participantId, round } = (await req.json()) as { participantId: string; round: number }
  const db = supabaseAdmin()

  await db
    .from('participants')
    .update({ finished_round: round })
    .eq('id', participantId)
    .eq('session_id', params.id)

  const { data: participants } = await db.from('participants').select('*').eq('session_id', params.id)
  const bothFinished =
    (participants ?? []).length === 2 && (participants ?? []).every((p) => (p.finished_round ?? 0) >= round)
  if (!bothFinished) {
    return NextResponse.json({ triggered: false })
  }

  const expectedStatus = round === 1 ? 'swiping_round_1' : 'swiping_round_2'
  // Compare-and-swap: if the session already left this round's status (e.g. a match just
  // landed), someone else resolved it first — don't double-generate the next round.
  const { data: claim } = await db
    .from('sessions')
    .update({ status: 'generating' })
    .eq('id', params.id)
    .eq('status', expectedStatus)
    .select()
  if (!claim || claim.length === 0) {
    return NextResponse.json({ triggered: false })
  }

  if (round === 1) {
    await runRound2(params.id)
  } else {
    await runFinalize(params.id)
  }

  return NextResponse.json({ triggered: true })
}
