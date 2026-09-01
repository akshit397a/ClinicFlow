'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { signInAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/Button';

const DEMO_ACCOUNTS = [
  { label: 'Front Desk', email: 'front_desk.one@clinic.test', role: 'front_desk' },
  { label: 'Dr. Alice', email: 'provider.alice@clinic.test', role: 'provider' },
  { label: 'Dr. Bob', email: 'provider.bob@clinic.test', role: 'provider' },
  { label: 'Dr. Carol', email: 'provider.carol@clinic.test', role: 'provider' },
];

const inputCls =
  'w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] placeholder:text-[#9ca3af] outline-none transition-all focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/10';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, {});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('password123');
  }

  return (
    <div className="w-full">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111111]">
          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111111]">ClinicFlow</h1>
        <p className="mt-1 text-sm text-[#6b7280]">Sign in to your clinic account</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_2px_8px_0_rgba(0,0,0,0.06)]">
        {/* Quick demo login */}
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af]">
          Quick demo login
        </p>
        <div className="mb-5 grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => fillDemo(acc.email)}
              className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition-all duration-100 cursor-pointer hover:border-[#111111] hover:bg-[#f9fafb] ${
                email === acc.email ? 'border-[#111111] bg-[#f9fafb]' : 'border-[#e5e7eb]'
              }`}
            >
              <span className="text-xs font-semibold text-[#111111]">{acc.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  acc.role === 'provider'
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {acc.role.replace('_', ' ')}
              </span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#f3f4f6]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-[#9ca3af]">or enter manually</span>
          </div>
        </div>

        {/* Form */}
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[#374151]">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@clinic.test"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-[#374151]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </div>

          {state.error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700">{state.error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" loading={pending} size="lg">
            Sign in →
          </Button>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-[#9ca3af]">
        Demo password:{' '}
        <code className="rounded bg-[#f3f4f6] px-1.5 py-0.5 font-mono text-[11px] text-[#374151]">
          password123
        </code>
      </p>
    </div>
  );
}