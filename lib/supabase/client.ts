import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side client. The anon key is public by design; RLS (SELECT-only
 * policies) limits what a signed-in user can read directly, and no write
 * policies exist, so the anon key cannot be used to mutate data.
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.');
  }
  return createBrowserClient(url, anonKey);
}