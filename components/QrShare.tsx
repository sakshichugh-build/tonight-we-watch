'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

export default function QrShare({ sessionId }: { sessionId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const url = `${base}/session/${sessionId}/join`
    setLink(url)
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 260, margin: 2 }).catch(() => {})
    }
  }, [sessionId])

  async function copyLink() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'watch-tonight-invite.png', { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }
      // Feature-detect via typeof rather than truthiness: TS's DOM lib declares
      // share/canShare as always-present, so `if (nav.share)` is flagged as a
      // tautology even though not every runtime actually implements them.
      const canShare = typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })
      if (canShare) {
        try {
          await navigator.share({ files: [file], title: "Pick tonight's watch with me", text: link })
          return
        } catch {
          // user cancelled the share sheet — fall back to copying the link
        }
      }
      await copyLink()
    })
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} className="rounded-2xl border border-line bg-white p-3 shadow-lg shadow-ink/5" />
      <p className="max-w-xs break-all text-center text-sm text-ash">{link}</p>
      <div className="flex gap-3">
        <button
          onClick={handleShare}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all hover:brightness-105"
        >
          Share with partner
        </button>
        <button
          onClick={copyLink}
          className="rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-ink/40"
        >
          {copied ? <span className="italic text-brand">Copied!</span> : 'Copy link'}
        </button>
      </div>
      <p className="max-w-sm text-center text-sm text-ash">
        Have your partner <span className="italic font-medium text-ink">scan this QR</span>, or send them the link —
        either lands them in this <span className="italic font-medium text-ink">same session</span>.
      </p>
    </div>
  )
}
