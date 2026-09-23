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
        <p>Loading…</p>
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
    if (!myPreferencesSubmitted) {
      if (!partnerJoined) {
        return (
          <main className="mx-auto max-w-xl px-4 py-10">
            <h1 className="mb-4 text-2xl font-bold">Invite your partner</h1>
            <QrShare sessionId={params.id} />
          </main>
        )
      }
      return (
        <main className="mx-auto max-w-xl px-4 py-10">
          <h1 className="mb-4 text-2xl font-bold">Your turn — what are you in the mood for?</h1>
          <PreferenceForm
            onSubmit={submitPrefs}
            submitting={prefsSubmitting}
            submitLabel="Submit my preferences"
            submittingLabel="Finding titles you'll both love… this can take up to 20s"
          />
        </main>
      )
    }
    return (
      <main className="mx-auto max-w-xl px-4 py-10 text-center">
        <p>Waiting for your partner to finish their preferences…</p>
      </main>
    )
  }

  if (session.status === 'generating') {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 text-center">
        <p>Finding titles you&apos;ll both love…</p>
        {showRetry && (
          <button onClick={retryGenerate} className="mt-4 text-sm text-neutral-400 underline">
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
        <main className="mx-auto max-w-xl px-4 py-10 text-center">
          <p>Waiting for your partner to finish swiping…</p>
        </main>
      )
    }
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="mb-4 text-xl font-semibold">Round {session.round}</h1>
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
    <main className="mx-auto max-w-xl px-4 py-10 text-center">
      <p>All done — enjoy your watch!</p>
    </main>
  )
}
