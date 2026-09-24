import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { runRound1, runRound2, runFinalize } from '@/lib/orchestrate'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Manual safety net: if pool generation ever gets stuck in "generating" (e.g. a
 * serverless function timeout), either partner's client can call this to retry.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const db = supabaseAdmin()
  const { data: session } = await db.from('sessions').select('*').eq('id', params.id).maybeSingle()
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  if (session.status !== 'generating') {
    return NextResponse.json({ error: 'Nothing to retry' }, { status: 400 })
  }

  try {
    if (session.round === 0) {
      await runRound1(params.id)
    } else if (session.round === 1) {
      await runRound2(params.id)
    } else {
      await runFinalize(params.id)
    }
  } catch (e: any) {
    const rollbackStatus = session.round === 0 ? 'collecting_prefs' : `swiping_round_${session.round}`
    await db.from('sessions').update({ status: rollbackStatus }).eq('id', params.id)
    return NextResponse.json({ error: `Generation failed: ${e?.message ?? e}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
