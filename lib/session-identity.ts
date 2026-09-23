'use client'

export interface Identity {
  participantId: string
  role: 'A' | 'B'
}

function key(sessionId: string) {
  return `mm_session_${sessionId}`
}

export function saveIdentity(sessionId: string, identity: Identity) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key(sessionId), JSON.stringify(identity))
}

export function loadIdentity(sessionId: string): Identity | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key(sessionId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as Identity
  } catch {
    return null
  }
}

export function loadCoupleSlug(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('mm_couple_slug')
}

export function saveCoupleSlug(slug: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('mm_couple_slug', slug)
}
