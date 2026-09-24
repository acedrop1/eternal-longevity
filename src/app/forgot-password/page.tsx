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
import { requestPasswordResetAction } from '@/lib/auth-actions';
import { supabaseConfigured } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Reset password',
};

interface ForgotPageProps {
  searchParams: Promise<{ sent?: string; error?: string }>;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPageProps) {
  const { sent, error } = await searchParams;

  // Demo mode — no real accounts to reset.
  if (!supabaseConfigured) {
    return (
      <AuthShell eyebrow="Account" title="Reset your password.">
        <div className="space-y-4 rounded-[4px] bg-[#F2F2F0] p-6 md:p-8">
          <p className="text-[15px] leading-relaxed text-black/70">
            Password reset turns on once the backend is connected. Until then,
            the portal uses demo logins — no password needed.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-full bg-black px-5 py-3.5 text-center font-mono text-[14px] text-white transition-colors hover:bg-black/85"
          >
            Back to login →
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Account"
      title="Reset your password."
      footer={
        <>
          Remembered it?{' '}
          <Link href="/login" className={authLinkClass}>
            Back to login
          </Link>
          .
        </>
      }
    >
      {error === 'expired' && (
        <div role="alert" className={`mb-6 ${authErrorClass}`}>
          That reset link has expired or was already used. Enter your email and
          we&apos;ll send a fresh one.
        </div>
      )}
      {sent === '1' ? (
        <div role="status" className="space-y-4 rounded-[4px] bg-[#F2F2F0] p-6 md:p-8">
          <p className="text-[15px] leading-relaxed text-black">
            If an account exists for that email, a password-reset link is on its
            way. Check your inbox.
          </p>
          <Link
            href="/login"
            className={`inline-block font-mono text-[13px] ${authLinkClass}`}
          >
            Back to login →
          </Link>
        </div>
      ) : (
        <form action={requestPasswordResetAction} className="space-y-6">
          <p className="text-[15px] leading-relaxed text-black/70">
            Enter your account email and we&apos;ll send a link to set a new
            password.
          </p>
          <div>
            <AuthLabel htmlFor="reset-email">Email</AuthLabel>
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
          <SubmitButton pendingLabel="Sending…">
            Send reset link →
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
