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
import { requestPasswordResetAction } from '@/lib/auth-actions';
import { supabaseConfigured } from '@/lib/env';
import { loginHref, safeNext } from '@/lib/safe-next';

export const metadata: Metadata = {
  ...pageMeta('/forgot-password', 'Reset password', 'Request a link to reset the password on your Eternal Longevity account.'),
  robots: { index: false },
};

interface ForgotPageProps {
  searchParams: Promise<{ sent?: string; error?: string; next?: string }>;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPageProps) {
  const { sent, error, next: rawNext } = await searchParams;
  // Where they were headed before the password got in the way.
  const next = safeNext(rawNext);
  const backToLogin = loginHref(next);

  // Demo mode — no real accounts to reset.
  if (!supabaseConfigured) {
    return (
      <AuthShell eyebrow="Account" title="Reset your password.">
        <div className="space-y-4 rounded-shell bg-milk p-6 md:p-8">
          <p className="text-[15px] leading-relaxed text-ink-soft">
            Password reset turns on once the backend is connected. Until then,
            the portal uses demo logins — no password needed.
          </p>
          <Link
            href={backToLogin}
            className="block w-full rounded-full bg-ink px-5 py-3.5 text-center text-[15px] font-semibold text-white transition-colors hover:bg-ink/85"
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
          <Link href={backToLogin} className={authLinkClass}>
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
        <div role="status" className="space-y-4 rounded-shell bg-milk p-6 md:p-8">
          <p className="text-[15px] leading-relaxed text-ink">
            If an account exists for that email, a password-reset link is on its
            way. Check your inbox.
          </p>
          <Link
            href={backToLogin}
            className={`inline-block text-[14px] ${authLinkClass}`}
          >
            Back to login →
          </Link>
        </div>
      ) : (
        <form action={requestPasswordResetAction} className="space-y-6">
          {next && <input type="hidden" name="next" value={next} />}
          <p className="text-[15px] leading-relaxed text-ink-soft">
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
