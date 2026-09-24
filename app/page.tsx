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
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-brand">
          🍿 Movie night, sorted
        </span>
        <h1 className="mt-4 text-5xl font-bold leading-[0.95] tracking-tight text-ink">
          Tonight <span className="italic text-brand">We Watch</span>
        </h1>
      </div>

      <div className="mb-10 rounded-2xl border border-line bg-surface p-5 text-[15px] leading-relaxed text-ash">
        <p>
          Two people, <span className="font-semibold text-ink">zero agreement</span> on what to watch? 😩 We&apos;ve all
          been there.
        </p>
        <p className="mt-3">
          Here&apos;s the deal: you both set your vibe 🎭, we find <span className="italic text-ink">30 titles you&apos;ll
          both love</span> ❤️, then you swipe 👉 👈. The moment you match, we show you <span className="font-semibold text-ink">exactly
          where to stream it in India</span> 📺 — no more endless scrolling. 🎬
        </p>
      </div>

      <div className="mb-5">
        <h2 className="text-lg font-bold text-ink">Set your vibe ✨</h2>
        <p className="mt-1 text-sm text-ash">
          Your partner <span className="italic font-medium text-ink">won&apos;t see</span> your answers until you both
          finish.
        </p>
      </div>

      <PreferenceForm
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Create session & invite partner"
        submittingLabel="Creating your session…"
      />
      {error && <p className="mt-4 font-medium text-brand">{error}</p>}
    </main>
  )
}
