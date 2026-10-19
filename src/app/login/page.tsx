import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { SubmitButton } from '@/components/auth/SubmitButton';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AuthShell,
  AuthLabel,
  authInputClass,
  authErrorClass,
  authNoticeClass,
  authLinkClass,
  authSecondaryClass,
} from '@/components/auth/AuthShell';
import { PasswordField } from '@/components/auth/PasswordField';
import { DemoCredentials } from '@/components/auth/DemoCredentials';
import { AuthDivider, GoogleButton } from '@/components/auth/GoogleButton';
import { loginAction } from '@/lib/auth-actions';
import { supabaseConfigured } from '@/lib/env';
import { getSession } from '@/lib/auth-server';
import { safeNext } from '@/lib/safe-next';
import { headers } from 'next/headers';
import { requestHost, staffPortalFor } from '@/lib/staff-host';

export const metadata: Metadata = {
  ...pageMeta('/login', 'Log in', 'Log in to your Eternal Longevity account to see your orders, messages and prescription status.'),
  robots: { index: false },
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; notice?: string; timeout?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, notice, timeout, next: rawNext } = await searchParams;

  /*
   * Already signed in: carry on rather than ask again. Not after an idle
   * sign-out, though — the browser timer can fire a few seconds before the
   * server's, and bouncing back in would undo the logoff.
   */
  const user = timeout ? null : await getSession();
  if (user) redirect(safeNext(rawNext, user.role) ?? user.redirectTo);
  const next = safeNext(rawNext);
  // admin. and doctor. addresses: a staff sign-in, no Google and no sign-up.
  const staff = staffPortalFor(requestHost(await headers()));

  return (
    <AuthShell
      staff={!!staff}
      eyebrow={staff === 'admin' ? 'Admin portal' : staff === 'doctor' ? 'Physician portal' : supabaseConfigured ? 'Member portal' : 'Member · Doctor · Admin'}
      title={staff ? 'Staff sign in.' : 'Welcome back.'}
      footer={
        <>
          {staff ? (
            'Password, then a code sent to your email.'
          ) : (
            <>
              Trouble signing in?{' '}
              <Link href="/contact" className={authLinkClass}>
                Contact our team
              </Link>
              .
            </>
          )}
        </>
      }
    >
      <form action={loginAction} className="space-y-6">
        {/* Where to land after sign-in; loginAction re-checks it for the role. */}
        {next && <input type="hidden" name="next" value={next} />}
        {notice === 'check-email' && (
          <div role="status" className={authNoticeClass}>
            Account created. Check your email for a confirmation link, then log
            in.
          </div>
        )}
        {error === 'invalid' && (
          <div role="alert" className={authErrorClass}>
            {supabaseConfigured
              ? 'Invalid email or password.'
              : 'Invalid email or password. Tap a demo card below to fill the form.'}
          </div>
        )}
        {/* Being logged out mid-task with no explanation reads as a bug. */}
        {timeout === 'idle' && (
          <div role="status" className={authNoticeClass}>
            You were signed out after a spell of inactivity. Sign in to pick up
            where you left off.
          </div>
        )}
        {timeout === 'expired' && (
          <div role="status" className={authNoticeClass}>
            Sessions end after 12 hours. Sign in again to continue.
          </div>
        )}
        {error === 'throttled' && (
          <div role="alert" className={authErrorClass}>
            Too many attempts from this connection. Wait a few minutes and try
            again.
          </div>
        )}
        {error === 'mfa_unavailable' && (
          <div role="alert" className={authErrorClass}>
            We could not email your sign-in code. Try again, or contact support
            if it keeps happening.
          </div>
        )}
        {error === 'auth' && (
          <div role="alert" className={authErrorClass}>
            That sign-in link is invalid or has expired. Please try again.
          </div>
        )}
        {error === 'use_password' && (
          <div role="alert" className={authErrorClass}>
            Staff accounts sign in with email, password and a code, not Google.
          </div>
        )}

        {supabaseConfigured && !staff && (
          <>
            <GoogleButton next={next ?? undefined} />
            <AuthDivider />
          </>
        )}

        <div>
          <AuthLabel htmlFor="login-email">Email</AuthLabel>
          <input
            id="login-email"
            name="email"
            type="email"
            placeholder={staff ? 'you@etlongevity.com' : 'you@example.com'}
            autoComplete="email"
            required
            className={authInputClass}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <AuthLabel htmlFor="login-password">Password</AuthLabel>
            <Link
              href={
                supabaseConfigured
                  ? `/forgot-password${next ? `?next=${encodeURIComponent(next)}` : ''}`
                  : '/contact'
              }
              className={`text-[13px] ${authLinkClass}`}
            >
              Forgot?
            </Link>
          </div>
          <PasswordField
            id="login-password"
            name="password"
            placeholder="Your password"
            autoComplete="current-password"
          />
        </div>

        <SubmitButton pendingLabel="Signing in…">
          Log in →
        </SubmitButton>

        {/* Demo mode: tap-to-fill credential cards. */}
        {!supabaseConfigured && <DemoCredentials />}

        {/* Live mode: a real sign-up link. */}
        {supabaseConfigured && !staff && (
          <Link
            href="/signup"
            className={authSecondaryClass}
          >
            Create an account
          </Link>
        )}

        {!staff && (
        <Link
          href="/signup"
          className="block w-full py-2 text-center text-[14px] font-medium text-ink/60 transition-colors hover:text-ink"
        >
          New here? Create an account →
        </Link>
        )}
      </form>
    </AuthShell>
  );
}
