'use client';

import { useState, useEffect, useActionState } from 'react';
import { signInAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/Button';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, {});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  // Restore remembered credentials on initial client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('clinicflow_remember_email');
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {
      // Ignore localStorage read errors in restricted contexts
    }
  }, []);

  function handleRememberToggle(checked: boolean) {
    setRememberMe(checked);
    if (!checked) {
      try {
        localStorage.removeItem('clinicflow_remember_email');
      } catch {}
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111111] shadow-sm transition-transform duration-200 hover:scale-105">
          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111111]">ClinicFlow</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Sign in to your clinical management portal
        </p>
      </div>

      {/* Login Card */}
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-7 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)]">
        <form
          action={formAction}
          onSubmit={() => {
            if (rememberMe && email) {
              try {
                localStorage.setItem('clinicflow_remember_email', email);
              } catch {}
            }
          }}
          className="space-y-4"
        >
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-[#374151]">
              Work Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#9ca3af]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@clinic.test"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white pl-9.5 pr-3 py-2 text-sm text-[#111111] placeholder:text-[#9ca3af] outline-none transition-all focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/10"
              />
            </div>
          </div>

          {/* Password Field with Show/Hide Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-[#374151]">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotNotice(!showForgotNotice)}
                className="text-xs text-[#6b7280] hover:text-[#111111] hover:underline cursor-pointer transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#9ca3af]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white pl-9.5 pr-10 py-2 text-sm text-[#111111] placeholder:text-[#9ca3af] outline-none transition-all focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#9ca3af] hover:text-[#374151] cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password Notification Notice */}
          {showForgotNotice && (
            <div className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e5e7eb] text-xs text-[#6b7280] animate-in fade-in-0 duration-150">
              Please contact your clinic IT administrator or head receptionist to reset staff credentials.
            </div>
          )}

          {/* Remember Credentials Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-[#374151] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => handleRememberToggle(e.target.checked)}
                className="h-4 w-4 rounded border-[#d1d5db] text-[#111111] accent-[#111111] focus:ring-[#111111]"
              />
              <span>Remember my email on this device</span>
            </label>
          </div>

          {/* Form Error Banner */}
          {state.error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700">{state.error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full mt-2" loading={pending} size="lg">
            Sign In to ClinicFlow →
          </Button>
        </form>
      </div>

      {/* Security Footnote */}
      <p className="mt-5 text-center text-xs text-[#9ca3af]">
        Role-based access control (RBAC) enforced on all endpoints
      </p>
    </div>
  );
}