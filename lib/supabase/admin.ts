import { createClient } from '@supabase/supabase-js';

/**
 * Trusted server-side client using the service role key. It bypasses Row Level
 * Security and is used for ALL writes, but ONLY after application-layer
 * authorization (require-auth + require-role + permissions). Never expose this
 * client or its key to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}