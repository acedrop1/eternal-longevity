import type { Metadata } from 'next';
import { SubmitButton } from '@/components/auth/SubmitButton';
import Link from 'next/link';
import { AuthShell, AuthLabel, authErrorClass } from '@/components/auth/AuthShell';
import { PasswordField } from '@/components/auth/PasswordField';
import { updatePasswordAction } from '@/lib/auth-actions';
import { supabaseConfigured } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Set a new password',
};

interface ResetPageProps {
  searchParams: Promise<{ error?: string }>;
}

/**
 * Reached after clicking the reset link in an email. The /auth/callback route
 * has already exchanged the recovery code for a session, so the user is
 * authenticated here and can set a new password.
 */
export default async function ResetPasswordPage({
  searchParams,
}: ResetPageProps) {
  const { error } = await searchParams;

  if (!supabaseConfigured) {
    return (
      <AuthShell eyebrow="Account" title="Set a new password.">
        <div className="space-y-4 rounded-[4px] bg-[#F2F2F0] p-6 md:p-8">
          <p className="text-[15px] leading-relaxed text-black/70">
            Password reset turns on once the backend is connected.
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
    <AuthShell eyebrow="Account" title="Set a new password.">
      <form action={updatePasswordAction} className="space-y-6">
        {error === 'weak' && (
          <div role="alert" className={authErrorClass}>
            Password must be 8+ characters with an uppercase letter, a lowercase letter, and a special character.
          </div>
        )}
        {error === 'failed' && (
          <div role="alert" className={authErrorClass}>
            That reset link has expired. Request a new one from the login page.
          </div>
        )}

        <div>
          <AuthLabel htmlFor="new-password">New password</AuthLabel>
          <PasswordField
            id="new-password"
            name="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        <SubmitButton pendingLabel="Updating…">
          Update password →
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
