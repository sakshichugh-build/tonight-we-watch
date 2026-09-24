'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadIdentity, saveIdentity } from '@/lib/session-identity'

export default function JoinPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const existing = loadIdentity(params.id)
    if (existing) {
      router.replace(`/session/${params.id}`)
      return
    }
    fetch(`/api/sessions/${params.id}/join`, { method: 'POST' })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Could not join this session')
        saveIdentity(params.id, { participantId: data.participantId, role: data.role })
        router.replace(`/session/${params.id}`)
      })
      .catch((e: Error) => setError(e.message))
  }, [params.id, router])

  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      {error ? (
        <p className="font-medium text-brand">{error}</p>
      ) : (
        <p className="text-lg italic text-ash">Joining you in… 🍿</p>
      )}
    </main>
  )
}
