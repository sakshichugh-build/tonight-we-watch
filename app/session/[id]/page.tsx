'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadIdentity, Identity } from '@/lib/session-identity'
import { supabaseBrowser } from '@/lib/supabase/client'
import PreferenceForm from '@/components/PreferenceForm'
import QrShare from '@/components/QrShare'
import SwipeDeck from '@/components/SwipeDeck'
import MatchReveal from '@/components/MatchReveal'
import FinalPicks from '@/components/FinalPicks'
import { PreferencesInput } from '@/lib/types'

interface SessionState {
  session: { id: string; status: string; round: number }
  myRole: 'A' | 'B' | null
  partnerJoined: boolean
  myPreferencesSubmitted: boolean
  pool: any[] | null
  finalPicks: any[] | null
  mySwipedKeys: string[]
  myFinishedRound: number | null
  match: any | null
}

export default function SessionHub({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [state, setState] = useState<SessionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [prefsSubmitting, setPrefsSubmitting] = useState(false)
  const [showRetry, setShowRetry] = useState(false)

  useEffect(() => {
    const id = loadIdentity(params.id)
    if (!id) {
      router.replace(`/session/${params.id}/join`)
      return
    }
    setIdentity(id)
  }, [params.id, router])

  const refresh = useCallback(async () => {
    const id = loadIdentity(params.id)
    if (!id) return
    const res = await fetch(`/api/sessions/${params.id}?participantId=${id.participantId}`)
    if (res.ok) setState(await res.json())
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    if (!identity) return
    refresh()
    const channel = supabaseBrowser()
      .channel(`session-${params.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${params.id}` }, refresh)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${params.id}` },
        refresh
      )
      .subscribe()
    return () => {
      supabaseBrowser().removeChannel(channel)
    }
  }, [identity, params.id, refresh])

  useEffect(() => {
    setShowRetry(false)
    if (state?.session.status !== 'generating') return
    const timer = setTimeout(() => setShowRetry(true), 15000)
    return () => clearTimeout(timer)
  }, [state?.session.status])

  if (!identity || loading || !state) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="italic text-ash">Loading…</p>
      </main>
    )
  }

  const { session, myPreferencesSubmitted, partnerJoined, pool, mySwipedKeys, match, finalPicks, myFinishedRound } = state

  async function submitPrefs(prefs: PreferencesInput) {
    setPrefsSubmitting(true)
    try {
      const res = await fetch(`/api/sessions/${params.id}/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: identity!.participantId, ...prefs }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not submit preferences')
      await refresh()
    } finally {
      setPrefsSubmitting(false)
    }
  }

  async function retryGenerate() {
    await fetch(`/api/sessions/${params.id}/retry`, { method: 'POST' })
    refresh()
  }

  if (session.status === 'waiting_for_partner' || session.status === 'collecting_prefs') {
    // Partner B (or anyone) who hasn't filled the form yet, and their partner has already joined.
    if (!myPreferencesSubmitted && partnerJoined) {
      return (
        <main className="mx-auto max-w-xl px-4 py-10">
          <h1 className="mb-4 text-2xl font-bold leading-tight">
            Your turn — what are you <span className="italic text-brand">in the mood</span> for?
          </h1>
          <PreferenceForm
            onSubmit={submitPrefs}
            submitting={prefsSubmitting}
            submitLabel="Submit my preferences"
            submittingLabel="Finding titles you'll both love… this can take up to 20s"
          />
        </main>
      )
    }
    // No partner has joined yet — always show the invite so they can actually get in.
    // (Partner A lands here right after creating the session, since their prefs are
    // already saved; without this they'd be stuck on a dead "waiting" screen.)
    if (!partnerJoined) {
      return (
        <main className="mx-auto max-w-xl px-4 py-12">
          <p className="mb-1 text-center text-xs font-medium uppercase tracking-[0.25em] text-brand">Step 2</p>
          <h1 className="mb-6 text-center text-2xl font-bold leading-tight">
            Invite your <span className="italic text-brand">partner</span>
          </h1>
          <QrShare sessionId={params.id} />
        </main>
      )
    }
    // Partner joined and I've submitted — just waiting on them to finish their form.
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-lg text-ash">
          Waiting for your partner to <span className="italic text-brand">finish their preferences…</span>
        </p>
      </main>
    )
  }

  if (session.status === 'generating') {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-lg text-ash">
          Finding titles you&apos;ll <span className="italic text-brand">both love…</span>
        </p>
        {showRetry && (
          <button onClick={retryGenerate} className="mt-4 text-sm italic text-ash underline hover:text-ink">
            Taking a while — tap to retry
          </button>
        )}
      </main>
    )
  }

  if (session.status === 'swiping_round_1' || session.status === 'swiping_round_2') {
    const alreadyFinished = !!myFinishedRound && myFinishedRound >= session.round
    if (alreadyFinished) {
      return (
        <main className="mx-auto max-w-xl px-4 py-20 text-center">
          <p className="text-lg text-ash">
            Waiting for your partner to <span className="italic text-brand">finish swiping…</span>
          </p>
        </main>
      )
    }
    return (
      <main className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-5 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold">
            Round <span className="italic text-brand">{session.round}</span>
          </h1>
          <span className="text-xs uppercase tracking-[0.2em] text-ash">swipe right to like</span>
        </div>
        <SwipeDeck
          sessionId={params.id}
          participantId={identity.participantId}
          round={session.round}
          pool={pool ?? []}
          alreadySwipedKeys={mySwipedKeys}
          onMatched={refresh}
          onFinished={refresh}
        />
      </main>
    )
  }

  if (session.status === 'matched' && match) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <MatchReveal sessionId={params.id} participantId={identity.participantId} match={match} />
      </main>
    )
  }

  if (session.status === 'final_pick') {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <FinalPicks sessionId={params.id} titles={finalPicks ?? []} onPicked={refresh} />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-lg text-ash">
        All done — <span className="italic text-brand">enjoy your watch!</span>
      </p>
    </main>
  )
}
