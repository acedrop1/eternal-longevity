import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { AuthShell } from '@/components/auth/AuthShell';
import { confirmRecoveryAction } from '@/lib/auth-actions';
import { safeNext } from '@/lib/safe-next';

export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { index: false },
};

/**
 * Where a recovery link lands (via /auth/confirm). The token is only spent
 * when the person presses the button, never by opening the link.
 */
export default async function ContinueRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; next?: string }>;
}) {
  const { token_hash: tokenHash, next: rawNext } = await searchParams;
  if (!tokenHash) redirect('/forgot-password?error=expired');
  const next = safeNext(rawNext);

  return (
    <AuthShell eyebrow="Account" title="Reset your password.">
      <form action={confirmRecoveryAction} className="space-y-6">
        <input type="hidden" name="token_hash" value={tokenHash} />
        {next && <input type="hidden" name="next" value={next} />}
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Continue to choose a new password for your account.
        </p>
        <SubmitButton pendingLabel="Checking your link…">Continue →</SubmitButton>
      </form>
    </AuthShell>
  );
}
