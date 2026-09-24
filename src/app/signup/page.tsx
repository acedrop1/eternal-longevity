import type { Metadata } from 'next';
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
  title: 'Create account',
  description: 'Create your Eternal Longevity account.',
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
        <div className="space-y-4 rounded-[4px] bg-[#F2F2F0] p-6 md:p-8">
          <p className="text-[15px] leading-relaxed text-black/70">
            Account sign-up turns on once the backend is connected. For now you
            can explore the portal with a demo login.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-full bg-black px-5 py-3.5 text-center font-mono text-[14px] text-white transition-colors hover:bg-black/85"
          >
            Go to login →
          </Link>
          <Link
            href="/start"
            className="block w-full text-center font-mono text-[13px] text-black/60 transition-colors hover:text-black"
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

        <p className="text-[13px] leading-relaxed text-black/55">
          Creating an account doesn&apos;t place an order. Every protocol is
          compounded by a licensed 503A pharmacy against a prescription written
          for you.
        </p>
      </form>
    </AuthShell>
  );
}
