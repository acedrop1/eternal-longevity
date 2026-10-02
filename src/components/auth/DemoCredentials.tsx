'use client';

import { DEMO_USERS, type Role } from '@/lib/auth';

const ROLE_LABEL: Record<Role, string> = {
  member: 'Member',
  doctor: 'Doctor',
  admin: 'Admin',
  pharmacy: 'Pharmacy',
};

/**
 * Tap a card to fill the login form with that role's demo credentials.
 * Pure UI helper — no auth logic here.
 */
export function DemoCredentials() {
  const fill = (email: string, password: string) => {
    const e = document.getElementById('login-email') as HTMLInputElement | null;
    const p = document.getElementById('login-password') as HTMLInputElement | null;
    if (e) e.value = email;
    if (p) p.value = password;
    e?.dispatchEvent(new Event('input', { bubbles: true }));
    p?.dispatchEvent(new Event('input', { bubbles: true }));
    e?.focus();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-ink/10" />
        <span className="text-[12px] font-medium text-ink/65">Demo logins · tap to fill</span>
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      <div className="grid gap-2">
        {DEMO_USERS.map((u) => (
          <button
            key={u.role}
            type="button"
            onClick={() => fill(u.email, u.password)}
            className="group flex w-full items-start gap-3 rounded-inner bg-milk px-4 py-3.5 text-left transition-colors hover:bg-milk-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
          >
            <span className="mt-0.5 inline-flex h-6 shrink-0 items-center rounded-full bg-ink px-2.5 text-[12px] font-semibold text-white">
              {ROLE_LABEL[u.role]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-all text-[14px] font-semibold text-ink">
                {u.email}
                <span className="ml-2 font-normal text-ink/60">/ {u.password}</span>
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{u.blurb}</span>
            </span>
            <span aria-hidden className="mt-1 text-ink/55 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-ink">
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
