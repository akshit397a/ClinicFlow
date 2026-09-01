import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

function envVars() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.');
  }
  return { url, anonKey };
}

/**
 * Server-side client bound to the signed-in user's session (cookies). Used for
 * reads, which flow through Row Level Security. Mutations must NOT use this
 * client -- they go through the admin client after application-layer
 * authorization (see lib/supabase/admin.ts and lib/appointments/actions.ts).
 */
export async function createServerSupabaseClient() {
  const { url, anonKey } = envVars();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component. Safe to ignore when the client was
          // created to read; the middleware refreshes sessions on requests.
        }
      },
    },
  });
}