'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { SignupConsent } from '@/components/auth/SignupConsent';

/**
 * "Continue with Google" (members only; staff sign in with a password and a
 * code). Google's own sign-in popup (Google Identity Services) runs on our
 * domain, so Google's screen names etlongevity.com, not the database's
 * address; Supabase then signs the member in from Google's ID token.
 * /auth/finish signs staff back out, starts the session clocks and welcomes a
 * new account. Shown once NEXT_PUBLIC_GOOGLE_SIGNIN=1.
 */
export const googleSignInOn = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === '1';
/** Public: it is in every Google sign-in link. The secret stays in Supabase. */
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '675525222840-pil11i4v25l7199joptkia892ferkf5f.apps.googleusercontent.com';

interface Gsi {
  initialize(o: { client_id: string; callback: (r: { credential: string }) => void; nonce: string; ux_mode?: 'popup' }): void;
  renderButton(el: HTMLElement, o: Record<string, string | number>): void;
}
/** Google's sign-in library, once its script has loaded (window.google is also the Maps loader's). */
const gsi = () => (window as unknown as { google?: { accounts?: { id?: Gsi } } }).google?.accounts?.id;

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function GoogleButton({ next }: { next?: string }) {
  const slot = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!googleSignInOn || !ready || !slot.current || !gsi()) return;
    let cancelled = false;
    (async () => {
      // Google signs a hash of this nonce into its token; Supabase checks it against the raw value.
      const raw = b64url(crypto.getRandomValues(new Uint8Array(32)));
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
      const id = gsi();
      if (cancelled || !slot.current || !id) return;
      id.initialize({
        client_id: CLIENT_ID,
        nonce: hashed,
        ux_mode: 'popup',
        callback: async ({ credential }) => {
          setBusy(true);
          setError(null);
          const { error: err } = await createSupabaseBrowserClient().auth.signInWithIdToken({ provider: 'google', token: credential, nonce: raw });
          if (err) {
            setBusy(false);
            setError('Google sign-in didn’t go through. Try again, or use your email instead.');
            return;
          }
          window.location.href = `/auth/finish?next=${encodeURIComponent(next || '/portal')}`;
        },
      });
      id.renderButton(slot.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'center',
        width: Math.min(400, Math.max(240, slot.current.offsetWidth)),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, next]);

  if (!googleSignInOn) return null;
  return (
    <div className="space-y-2">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setReady(true)} />
      <div ref={slot} className="flex min-h-[44px] w-full justify-center" aria-busy={busy} />
      {busy && <p className="text-center text-[13px] text-ink/65">Signing you in…</p>}
      <p className="text-center text-[12px] text-ink/55">New here? Continuing with Google creates your account.</p>
      <SignupConsent className="text-center text-[12px] text-ink/55" />
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
