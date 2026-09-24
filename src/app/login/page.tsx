import type { Metadata } from 'next';
import { SubmitButton } from '@/components/auth/SubmitButton';
import Link from 'next/link';
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
import { loginAction } from '@/lib/auth-actions';
import { supabaseConfigured } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Access your portal.',
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; notice?: string; timeout?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, notice, timeout } = await searchParams;

  return (
    <AuthShell
      eyebrow={supabaseConfigured ? 'Member portal' : 'Member · Doctor · Admin'}
      title="Welcome back."
      footer={
        <>
          Trouble signing in?{' '}
          <Link href="/contact" className={authLinkClass}>
            Contact our team
          </Link>
          .
        </>
      }
    >
      <form action={loginAction} className="space-y-6">
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

        <div>
          <AuthLabel htmlFor="login-email">Email</AuthLabel>
          <input
            id="login-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            className={authInputClass}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <AuthLabel htmlFor="login-password">Password</AuthLabel>
            <Link
              href={supabaseConfigured ? '/forgot-password' : '/contact'}
              className={`font-mono text-[13px] ${authLinkClass}`}
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
        {supabaseConfigured && (
          <Link
            href="/signup"
            className={authSecondaryClass}
          >
            Create an account
          </Link>
        )}

        <Link
          href="/start"
          className="block w-full text-center font-mono text-[13px] text-black/60 transition-colors hover:text-black"
        >
          Start a new assessment →
        </Link>
      </form>
    </AuthShell>
  );
}
