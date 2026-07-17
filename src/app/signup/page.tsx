import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell, AuthLabel, authInputClass } from '@/components/auth/AuthShell';
import { signupAction } from '@/lib/auth-actions';
import { supabaseConfigured } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Create account | Eternal Longevity',
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
      <AuthShell eyebrow="GET STARTED" title="Create your account.">
        <div className="rounded-3xl border border-line bg-surface/85 backdrop-blur p-6 md:p-8 text-center space-y-4">
          <p className="text-sm text-foreground/70 leading-relaxed">
            Account sign-up turns on once the backend is connected. For now you
            can explore the portal with a demo login.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-full bg-accent text-black font-semibold py-3.5 text-base hover:bg-accent-soft transition-colors"
          >
            Go to login →
          </Link>
          <Link
            href="/start"
            className="block w-full text-center text-sm text-foreground/55 hover:text-foreground transition-colors"
          >
            Start a new assessment →
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="GET STARTED"
      title="Create your account."
      footer={
        <>
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-foreground/85 hover:text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>
          .
        </>
      }
    >
      <form
        action={signupAction}
        className="rounded-3xl border border-line bg-surface/85 backdrop-blur p-6 md:p-8 space-y-5"
      >
        {error === 'invalid' && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Enter a valid email and a password of at least 8 characters.
          </div>
        )}
        {error === 'taken' && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            We couldn&apos;t create that account. The email may already be
            registered — try logging in instead.
          </div>
        )}

        <div>
          <AuthLabel htmlFor="signup-name">FULL NAME</AuthLabel>
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
          <AuthLabel htmlFor="signup-email">EMAIL</AuthLabel>
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
          <AuthLabel htmlFor="signup-password">PASSWORD</AuthLabel>
          <input
            id="signup-password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
            className={authInputClass}
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-accent text-black font-semibold py-3.5 text-base hover:bg-accent-soft transition-colors"
        >
          Create account →
        </button>

        <p className="text-center text-[11px] text-foreground/45 leading-relaxed">
          Creating an account doesn&apos;t place an order. Every protocol is
          compounded by a licensed 503A pharmacy and third-party tested before
          it ships.
        </p>
      </form>
    </AuthShell>
  );
}
