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
      if (nav.share && nav.canShare?.({ files: [file] })) {
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
      <canvas ref={canvasRef} className="rounded-lg bg-white p-3" />
      <p className="max-w-xs break-all text-center text-sm text-neutral-400">{link}</p>
      <div className="flex gap-3">
        <button onClick={handleShare} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black">
          Share with partner
        </button>
        <button onClick={copyLink} className="rounded-md border border-neutral-700 px-4 py-2 text-sm">
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
      <p className="text-center text-sm text-neutral-500">
        Have your partner scan this QR code, or send them the link — either lands them in this same session.
      </p>
    </div>
  )
}
