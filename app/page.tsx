'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PreferenceForm from '@/components/PreferenceForm'
import { PreferencesInput } from '@/lib/types'
import { loadCoupleSlug, saveIdentity } from '@/lib/session-identity'

export default function HomePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(prefs: PreferencesInput) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prefs, coupleSlug: loadCoupleSlug() }),
      })
      const raw = await res.text()
      const data = raw ? JSON.parse(raw) : {}
      if (!res.ok) throw new Error(data.error ?? `Could not create session (HTTP ${res.status})`)
      saveIdentity(data.sessionId, { participantId: data.participantId, role: 'A' })
      router.push(`/session/${data.sessionId}`)
    } catch (e: any) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-bold">Tonight We Watch</h1>
      <p className="mb-8 mt-2 text-neutral-400">
        Tell us what you&apos;re in the mood for. Your partner won&apos;t see your answers until you both finish.
      </p>
      <PreferenceForm
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Create session & invite partner"
        submittingLabel="Creating your session…"
      />
      {error && <p className="mt-4 text-red-400">{error}</p>}
    </main>
  )
}
