import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tonight We Watch',
  description: "Find something you both actually want to watch, tonight — and exactly where to stream it in India.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans text-white antialiased">{children}</body>
    </html>
  )
}
