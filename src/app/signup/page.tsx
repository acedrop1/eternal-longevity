import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { SubmitButton } from '@/components/auth/SubmitButton';
import Link from 'next/link';
import {
  AuthShell,
  AuthLabel,
  authInputClass,
  authErrorClass,
  authLinkClass,
} from '@/components/auth/AuthShell';
import { PasswordField } from '@/components/auth/PasswordField';
import { signupAction } from '@/lib/auth-actions';
import { supabaseConfigured } from '@/lib/env';

export const metadata: Metadata = {
  ...pageMeta('/signup', 'Create account', 'Create your Eternal Longevity account to start an assessment and track your care.'),
  robots: { index: false },
};

interface SignupPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error } = await searchParams;

  // Demo mode — accounts open once the backend is connected.
  if (!supabaseConfigured) {
    return (
      <AuthShell eyebrow="Get started" title="Create your account.">
        <div className="space-y-4 rounded-shell bg-milk p-6 md:p-8">
          <p className="text-[15px] leading-relaxed text-ink-soft">
            Account sign-up turns on once the backend is connected. For now you
            can explore the portal with a demo login.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-full bg-ink px-5 py-3.5 text-center text-[15px] font-semibold text-white transition-colors hover:bg-ink/85"
          >
            Go to login →
          </Link>
          <Link
            href="/start"
            className="block w-full py-2 text-center text-[14px] font-medium text-ink/60 transition-colors hover:text-ink"
          >
            Start a new assessment →
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className={authLinkClass}>
            Log in
          </Link>
          .
        </>
      }
    >
      <form action={signupAction} className="space-y-6">
        {error === 'invalid' && (
          <div role="alert" className={authErrorClass}>
            Enter a valid email and a password of at least 8 characters.
          </div>
        )}
        {error === 'throttled' && (
          <div role="alert" className={authErrorClass}>
            Too many attempts from this connection. Wait a few minutes and try
            again.
          </div>
        )}
        {error === 'taken' && (
          <div role="alert" className={authErrorClass}>
            We couldn&apos;t create that account. The email may already be
            registered — try logging in instead.
          </div>
        )}

        <div>
          <AuthLabel htmlFor="signup-name">Full name</AuthLabel>
          <input
            id="signup-name"
            name="name"
            type="text"
            placeholder="Alex Rivera"
            autoComplete="name"
            required
            className={authInputClass}
          />
        </div>

        <div>
          <AuthLabel htmlFor="signup-email">Email</AuthLabel>
          <input
            id="signup-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            className={authInputClass}
          />
        </div>

        <div>
          <AuthLabel htmlFor="signup-password">Password</AuthLabel>
          <PasswordField
            id="signup-password"
            name="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        <SubmitButton pendingLabel="Creating your account…">
          Create account →
        </SubmitButton>

        <p className="text-[13px] leading-relaxed text-ink/65">
          Creating an account doesn&apos;t place an order. Every protocol is
          compounded by a licensed 503A pharmacy against a prescription written
          for you.
        </p>
      </form>
    </AuthShell>
  );
}
