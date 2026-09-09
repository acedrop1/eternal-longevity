'use client';

import { useState } from 'react';
import { authInputClass } from '@/components/auth/AuthShell';
import { cn } from '@/lib/utils';

/**
 * Password input with a show/hide toggle.
 *
 * Typing a password blind on a phone keyboard is the most common reason a
 * correct password gets rejected. The toggle is a plain button rather than a
 * checkbox so it never gets swept into form submission, and it carries an
 * aria-pressed state so a screen reader announces whether the password is
 * currently visible — which matters, because revealing it has a real-world
 * consequence if someone is standing behind you.
 */
export function PasswordField({
  id,
  name,
  placeholder = 'Your password',
  autoComplete = 'current-password',
  required = true,
  minLength,
  className,
}: {
  id: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  /** Mirrors the server rule; the browser blocks a short password first. */
  minLength?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={shown ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className={cn(authInputClass, 'pr-12', className)}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-foreground/50 transition-colors hover:bg-foreground/10 hover:text-foreground"
      >
        {shown ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
