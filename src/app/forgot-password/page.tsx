import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell, AuthLabel, authInputClass } from '@/components/auth/AuthShell';
import { requestPasswordResetAction } from '@/lib/auth-actions';
import { supabaseConfigured } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Reset password | Eternal Longevity',
};

interface ForgotPageProps {
  searchParams: Promise<{ sent?: string }>;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPageProps) {
  const { sent } = await searchParams;

  // Demo mode — no real accounts to reset.
  if (!supabaseConfigured) {
    return (
      <AuthShell eyebrow="ACCOUNT" title="Reset your password.">
        <div className="rounded-3xl border border-line bg-surface/85 backdrop-blur p-6 md:p-8 text-center space-y-4">
          <p className="text-sm text-foreground/70 leading-relaxed">
            Password reset turns on once the backend is connected. Until then,
            the portal uses demo logins — no password needed.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-full bg-accent text-black font-semibold py-3.5 text-base hover:bg-accent-soft transition-colors"
          >
            Back to login →
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="ACCOUNT"
      title="Reset your password."
      footer={
        <>
          Remembered it?{' '}
          <Link
            href="/login"
            className="text-foreground/85 hover:text-foreground underline-offset-4 hover:underline"
          >
            Back to login
          </Link>
          .
        </>
      }
    >
      {sent === '1' ? (
        <div className="rounded-3xl border border-accent/30 bg-accent/10 p-6 md:p-8 text-center space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            If an account exists for that email, a password-reset link is on its
            way. Check your inbox.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm text-accent hover:text-accent-soft"
          >
            Back to login →
          </Link>
        </div>
      ) : (
        <form
          action={requestPasswordResetAction}
          className="rounded-3xl border border-line bg-surface/85 backdrop-blur p-6 md:p-8 space-y-5"
        >
          <p className="text-sm text-foreground/65 leading-relaxed">
            Enter your account email and we&apos;ll send a link to set a new
            password.
          </p>
          <div>
            <AuthLabel htmlFor="reset-email">EMAIL</AuthLabel>
            <input
              id="reset-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              className={authInputClass}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-accent text-black font-semibold py-3.5 text-base hover:bg-accent-soft transition-colors"
          >
            Send reset link →
          </button>
        </form>
      )}
    </AuthShell>
  );
}
