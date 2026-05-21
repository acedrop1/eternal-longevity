import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell, AuthLabel, authInputClass } from '@/components/auth/AuthShell';
import { DemoCredentials } from '@/components/auth/DemoCredentials';
import { loginAction } from '@/lib/auth-actions';
import { supabaseConfigured } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Log in | Eternal Longevity',
  description: 'Access your portal.',
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; notice?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, notice } = await searchParams;

  return (
    <AuthShell
      eyebrow={supabaseConfigured ? 'MEMBER PORTAL' : 'MEMBER · DOCTOR · ADMIN'}
      title="Welcome back."
      footer={
        <>
          Trouble signing in?{' '}
          <Link
            href="/contact"
            className="text-foreground/85 hover:text-foreground underline-offset-4 hover:underline"
          >
            Contact our care team
          </Link>
          .
        </>
      }
    >
      <form
        action={loginAction}
        className="rounded-3xl border border-line bg-surface/85 backdrop-blur p-6 md:p-8 space-y-5"
      >
        {notice === 'check-email' && (
          <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
            Account created. Check your email for a confirmation link, then log
            in.
          </div>
        )}
        {error === 'invalid' && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {supabaseConfigured
              ? 'Invalid email or password.'
              : 'Invalid email or password. Tap a demo card below to fill the form.'}
          </div>
        )}
        {error === 'auth' && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            That sign-in link is invalid or has expired. Please try again.
          </div>
        )}

        <div>
          <AuthLabel htmlFor="login-email">EMAIL</AuthLabel>
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
          <div className="mb-1.5 flex items-center justify-between">
            <AuthLabel htmlFor="login-password">PASSWORD</AuthLabel>
            <Link
              href={supabaseConfigured ? '/forgot-password' : '/contact'}
              className="text-[11px] tracking-wider text-accent hover:text-accent-soft"
            >
              FORGOT?
            </Link>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            placeholder="Your password"
            autoComplete="current-password"
            required
            className={authInputClass}
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-accent text-black font-semibold py-3.5 text-base hover:bg-accent-soft transition-colors"
        >
          Log in →
        </button>

        {/* Demo mode: tap-to-fill credential cards. */}
        {!supabaseConfigured && <DemoCredentials />}

        {/* Live mode: a real sign-up link. */}
        {supabaseConfigured && (
          <Link
            href="/signup"
            className="block w-full rounded-full glass text-foreground/85 font-semibold py-3.5 text-base text-center hover:text-foreground transition-colors"
          >
            Create an account
          </Link>
        )}

        <Link
          href="/start"
          className="block w-full text-center text-sm text-foreground/55 hover:text-foreground transition-colors"
        >
          Start a new assessment →
        </Link>
      </form>
    </AuthShell>
  );
}
