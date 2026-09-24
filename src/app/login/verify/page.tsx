import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  AuthShell,
  AuthLabel,
  authInputClass,
  authErrorClass,
  authNoticeClass,
} from '@/components/auth/AuthShell';
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
    <AuthShell eyebrow="One more step" title="Confirm it is you.">
      <p className="mb-6 text-[15px] leading-relaxed text-black/70">
        We emailed a six-digit code to{' '}
        <span className="text-black">{masked}</span>. It expires in ten
        minutes.
      </p>

      <form action={verifyMfaAction} className="space-y-6">
        {sent && (
          <p role="status" className={authNoticeClass}>
            A new code is on its way.
          </p>
        )}
        {message && (
          <p role="alert" className={authErrorClass}>
            {message}
          </p>
        )}

        <div>
          <AuthLabel htmlFor="mfa-code">Six-digit code</AuthLabel>
          <input
            id="mfa-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            placeholder="000000"
            className={`${authInputClass} text-center font-mono text-2xl tracking-[0.4em]`}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-[15px] text-black/80">
          <input
            type="checkbox"
            name="remember"
            value="1"
            className="mt-1 h-4 w-4 shrink-0 accent-black"
          />
          <span>
            Remember this device for 30 days
            <span className="mt-0.5 block text-[13px] text-black/55">
              Skips the code on this browser. Your password is still required
              every time.
            </span>
          </span>
        </label>

        <SubmitButton pendingLabel="Checking…">Continue →</SubmitButton>
      </form>

      <form action={resendMfaAction} className="mt-5">
        <button
          type="submit"
          className="font-mono text-[13px] text-black/70 underline decoration-black/50 underline-offset-[3px] transition-colors hover:text-black hover:decoration-black"
        >
          Didn&apos;t get it? Send another
        </button>
      </form>

      <p className="mt-8 text-[13px] leading-relaxed text-black/55">
        Staff accounts reach other people&apos;s records, so they need a second
        factor. Members sign in with a password alone.
      </p>
    </AuthShell>
  );
}
