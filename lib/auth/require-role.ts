import { redirect } from 'next/navigation';
import type { UserRole } from '@/lib/db/types';
import { requireAuth } from '@/lib/auth/require-auth';
import type { CurrentUser } from '@/lib/auth/get-current-user';

/**
 * Requires an authenticated session AND one of the given roles. Redirects
 * otherwise. Used by pages; mutations perform their own role/permission checks
 * and return errors instead of redirecting.
 */
export async function requireRole(roles: UserRole[]): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!roles.includes(user.profile.role)) redirect('/');
  return user;
}