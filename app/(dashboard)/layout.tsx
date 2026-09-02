import { requireAuth } from '@/lib/auth/require-auth';
import { signOutAction } from '@/lib/auth/actions';
import { SideNav } from '@/components/dashboard/SideNav';

export const dynamic = 'force-dynamic';

function getRoleColor(role: string) {
  if (role === 'provider') return 'bg-violet-100 text-violet-700';
  return 'bg-blue-100 text-blue-700';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const initials = getInitials(user.profile.full_name);
  const roleLabel = user.profile.role.replace('_', ' ');

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-[#e5e7eb] bg-white fixed inset-y-0 left-0 z-20">
        {/* Logo / Brand */}
        <div className="px-5 py-4 border-b border-[#f3f4f6]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#111111] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[#111111] leading-none">ClinicFlow</p>
              <p className="text-[10px] text-[#9ca3af] mt-0.5 leading-none">Scheduling Suite</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <SideNav role={user.profile.role} />

        {/* User Footer */}
        <div className="border-t border-[#f3f4f6] p-3 mt-auto">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-[#f9fafb] transition-colors">
            <div className="w-8 h-8 rounded-full bg-[#111111] text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-[#111111] leading-tight">
                {user.profile.full_name}
              </p>
              <span className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${getRoleColor(user.profile.role)}`}>
                {roleLabel}
              </span>
            </div>
          </div>
          <form action={signOutAction} className="mt-1">
            <button
              type="submit"
              className="w-full flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-[#6b7280] hover:bg-[#fee2e2] hover:text-[#dc2626] transition-all duration-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content — offset by sidebar width */}
      <main className="flex-1 ml-60 min-h-screen">
        <div className="p-8 max-w-screen-xl">
          {children}
        </div>
      </main>
    </div>
  );
}