import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets. Pages and route handlers that
     * need a session call requireAuth() themselves; middleware only keeps the
     * session cookie fresh (Supabase access tokens expire after 1 hour).
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};