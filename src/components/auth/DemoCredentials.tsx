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
        <span className="h-px flex-1 bg-black/15" />
        <span className="font-mono text-[12px] text-black/55">Demo logins · tap to fill</span>
        <span className="h-px flex-1 bg-black/15" />
      </div>

      <div className="grid gap-2">
        {DEMO_USERS.map((u) => (
          <button
            key={u.role}
            type="button"
            onClick={() => fill(u.email, u.password)}
            className="group flex w-full items-start gap-3 rounded-[2px] bg-[#F2F2F0] px-4 py-3 text-left ring-1 ring-black/5 transition-shadow hover:ring-black/30"
          >
            <span className="mt-0.5 inline-flex h-6 shrink-0 items-center rounded-[2px] bg-black px-2 font-mono text-[12px] text-white">
              {ROLE_LABEL[u.role]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-all text-[14px] font-medium text-black">
                {u.email}
                <span className="ml-2 font-mono font-normal text-black/50">/ {u.password}</span>
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-black/60">{u.blurb}</span>
            </span>
            <span aria-hidden className="mt-1 text-black/40 transition-colors group-hover:text-black">
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
