'use client';

import { DEMO_USERS, type Role } from '@/lib/auth';
import { cn } from '@/lib/utils';

const ROLE_LABEL: Record<Role, string> = {
  member: 'MEMBER',
  doctor: 'DOCTOR',
  admin: 'ADMIN',
  pharmacy: 'PHARMACY',
};

const ROLE_ACCENT: Record<Role, string> = {
  member: 'text-accent',
  doctor: 'text-sky-300',
  admin: 'text-foreground/85',
  pharmacy: 'text-emerald-300',
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
        <span className="h-px flex-1 bg-line" />
        <span className="text-[10px] tracking-widest text-foreground/45">
          DEMO LOGINS · TAP TO FILL
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="grid gap-2">
        {DEMO_USERS.map((u) => (
          <button
            key={u.role}
            type="button"
            onClick={() => fill(u.email, u.password)}
            className={cn(
              'group flex w-full items-start gap-3 rounded-2xl border border-line bg-background/70 px-4 py-3 text-left transition-all',
              'hover:border-accent/40 hover:bg-background'
            )}
          >
            <span
              className={cn(
                'mt-0.5 inline-flex h-6 items-center rounded-full border border-line bg-surface px-2 text-[10px] tracking-widest font-semibold',
                ROLE_ACCENT[u.role]
              )}
            >
              {ROLE_LABEL[u.role]}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-foreground">
                {u.email}
                <span className="ml-2 text-foreground/45 font-normal">/ {u.password}</span>
              </span>
              <span className="block text-xs text-foreground/55 leading-snug mt-0.5">
                {u.blurb}
              </span>
            </span>
            <span
              aria-hidden
              className="mt-1 text-foreground/40 group-hover:text-accent transition-colors"
            >
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
