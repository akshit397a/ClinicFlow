'use client';

import { useActionState } from 'react';
import { signInAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/fields';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, {});

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Clinic Scheduler</h1>
      <p className="mt-1 text-sm text-slate-500">Sign in with your clinic account.</p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@clinic.test"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </div>

        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <Button type="submit" className="w-full" loading={pending}>
          Sign in
        </Button>
      </form>

      <p className="mt-4 text-xs text-slate-400">
        Demo accounts (password: <code>password123</code>):
        <br />
        front_desk.one@clinic.test &middot; provider.alice@clinic.test
      </p>
    </div>
  );
}