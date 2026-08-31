import { redirect } from 'next/navigation';
import { getCurrentUser, type CurrentUser } from '@/lib/auth/get-current-user';

/**
 * Requires an authenticated session. Redirects to /login otherwise. Safe to use
 * in server components, route handlers, and server actions.
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}