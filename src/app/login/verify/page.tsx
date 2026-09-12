import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell, AuthLabel, authInputClass } from '@/components/auth/AuthShell';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { getSession } from '@/lib/auth-server';
import { mfaRequiredFor } from '@/lib/mfa';
import { redirectForRole } from '@/lib/auth';
import { verifyMfaAction, resendMfaAction, mfaMessageFor } from '@/lib/mfa-actions';

export const metadata: Metadata = { title: 'Confirm it is you' };

interface PageProps {
  searchParams: Promise<{ error?: string; sent?: string }>;
}

/**
 * The second factor.
 *
 * Reachable only with a valid password session, so the code alone is useless
 * to anyone who has not already got that far.
 */
export default async function VerifyPage({ searchParams }: PageProps) {
  const user = await getSession();
  if (!user) redirect('/login');
  if (!mfaRequiredFor(user.role)) redirect(redirectForRole(user.role));

  const { error, sent } = await searchParams;
  const message = await mfaMessageFor(error);

  const masked = user.email.replace(/^(.).*(@.*)$/, (_m, a, b) => `${a}••••${b}`);

  return (
    <AuthShell eyebrow="ONE MORE STEP" title="Confirm it is you.">
      <p className="mb-6 text-sm leading-relaxed text-foreground/65">
        We emailed a six-digit code to{' '}
        <span className="text-foreground/90">{masked}</span>. It expires in ten
        minutes.
      </p>

      <form action={verifyMfaAction} className="space-y-5">
        {sent && (
          <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-foreground/75">
            A new code is on its way.
          </p>
        )}
        {message && (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {message}
          </p>
        )}

        <div>
          <AuthLabel htmlFor="mfa-code">SIX-DIGIT CODE</AuthLabel>
          <input
            id="mfa-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            placeholder="000000"
            className={`${authInputClass} text-center text-2xl tracking-[0.4em]`}
          />
        </div>

        <SubmitButton pendingLabel="Checking…">Continue →</SubmitButton>
      </form>

      <form action={resendMfaAction} className="mt-4 text-center">
        <button
          type="submit"
          className="text-sm text-foreground/55 transition-colors hover:text-foreground"
        >
          Didn&apos;t get it? Send another
        </button>
      </form>

      <p className="mt-8 text-center text-xs leading-relaxed text-foreground/45">
        Staff accounts reach other people&apos;s records, so they need a second
        factor. Members sign in with a password alone.
      </p>
    </AuthShell>
  );
}
