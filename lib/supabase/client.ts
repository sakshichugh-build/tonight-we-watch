'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

/**
 * Anon-key browser client. Used ONLY to subscribe to realtime changes on
 * `sessions` and `participants` (the two non-sensitive tables anon can read) —
 * every other read/write goes through our API routes with the service-role key.
 */
export function supabaseBrowser(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}
