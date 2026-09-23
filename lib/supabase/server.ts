import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client for use only inside API route handlers / server modules.
 * Bypasses RLS — never import this into a client component.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    const missing = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !key && 'SUPABASE_SERVICE_ROLE_KEY']
      .filter(Boolean)
      .join(', ')
    throw new Error(`Missing Supabase env var(s): ${missing}`)
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
