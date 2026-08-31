import { requireAuth } from '@/lib/auth/require-auth';
import { signOutAction } from '@/lib/auth/actions';
import { SideNav } from '@/components/dashboard/SideNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">Clinic Scheduler</p>
        </div>

        <SideNav />

        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-sm font-medium text-slate-900">
            {user.profile.full_name}
          </p>
          <p className="text-xs capitalize text-slate-500">
            {user.profile.role.replace('_', ' ')}
          </p>
          <form action={signOutAction} className="mt-2">
            <button
              type="submit"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}