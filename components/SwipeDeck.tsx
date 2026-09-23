'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import SwipeCard from './SwipeCard'
import { TitleCard } from '@/lib/types'
import { seededShuffle, titleKey } from '@/lib/matching'

export default function SwipeDeck({
  sessionId,
  participantId,
  round,
  pool,
  alreadySwipedKeys,
  onMatched,
  onFinished,
}: {
  sessionId: string
  participantId: string
  round: number
  pool: TitleCard[]
  alreadySwipedKeys: string[]
  onMatched: () => void
  onFinished: () => void
}) {
  const ordered = useMemo(() => seededShuffle(pool, participantId), [pool, participantId])
  const swipedSet = useMemo(() => new Set(alreadySwipedKeys), [alreadySwipedKeys])
  const remaining = useMemo(() => ordered.filter((t) => !swipedSet.has(titleKey(t))), [ordered, swipedSet])

  const [index, setIndex] = useState(0)
  const [pending, setPending] = useState(false)

  async function handleSwipe(title: TitleCard, direction: 'like' | 'pass') {
    if (pending) return
    setPending(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/swipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, tmdbId: title.tmdbId, mediaType: title.mediaType, direction }),
      })
      const data = await res.json()
      const nextIndex = index + 1
      setIndex(nextIndex)

      if (data.matched) {
        onMatched()
        return
      }
      if (nextIndex >= remaining.length) {
        await fetch(`/api/sessions/${sessionId}/finish-round`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId, round }),
        })
        onFinished()
      }
    } finally {
      setPending(false)
    }
  }

  if (ordered.length === 0) {
    return <p className="text-neutral-400">No titles matched your combined filters this round.</p>
  }

  if (index >= remaining.length) {
    return <p className="text-neutral-400">You&apos;ve swiped through all {ordered.length} titles.</p>
  }

  const visible = remaining.slice(index, index + 3)

  return (
    <div>
      <div className="relative mx-auto h-[520px] w-full max-w-sm">
        <AnimatePresence>
          {visible
            .slice()
            .reverse()
            .map((title, i) => (
              <SwipeCard
                key={titleKey(title)}
                title={title}
                active={i === visible.length - 1}
                onSwipe={(direction) => handleSwipe(title, direction)}
              />
            ))}
        </AnimatePresence>
      </div>
      <div className="mt-4 flex items-center justify-center gap-6">
        <button
          onClick={() => handleSwipe(remaining[index], 'pass')}
          disabled={pending}
          className="rounded-full border border-neutral-700 px-6 py-2 text-sm"
        >
          Pass
        </button>
        <span className="text-sm text-neutral-500">{remaining.length - index} left</span>
        <button
          onClick={() => handleSwipe(remaining[index], 'like')}
          disabled={pending}
          className="rounded-full bg-white px-6 py-2 text-sm font-medium text-black"
        >
          Like
        </button>
      </div>
    </div>
  )
}
