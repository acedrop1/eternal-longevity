'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { SIGNUP_CONSENT } from '@/lib/followups';

/**
 * "Continue with Google" (members only; staff sign in with a password and a
 * code). Shown once Google is switched on in Supabase and
 * NEXT_PUBLIC_GOOGLE_SIGNIN=1 is set, so the button never appears half-wired.
 * The return trip is /auth/callback, which signs staff back out, starts the
 * session clocks and welcomes a new account.
 */
export const googleSignInOn = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === '1';

export function GoogleButton({ next }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!googleSignInOn) return null;

  const go = async () => {
    setBusy(true);
    setError(null);
    const back = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next || '/portal')}`;
    const { error: err } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: back },
    });
    if (err) {
      setBusy(false);
      setError('Google sign-in isn’t available right now. Use your email instead.');
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3.5 text-[15px] font-semibold text-ink ring-1 ring-ink/15 transition-colors hover:bg-milk disabled:opacity-60"
      >
        <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {busy ? 'Opening Google…' : 'Continue with Google'}
      </button>
      <p className="text-center text-[12px] text-ink/55">New here? Continuing with Google creates your account. {SIGNUP_CONSENT.text}</p>
      {error && (
        <p role="alert" className="text-center text-[13px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** "or" between Google and the email form. */
export function AuthDivider() {
  if (!googleSignInOn) return null;
  return (
    <div className="flex items-center gap-3 text-[12px] text-ink/50" aria-hidden>
      <span className="h-px flex-1 bg-ink/10" />
      or
      <span className="h-px flex-1 bg-ink/10" />
    </div>
  );
}
