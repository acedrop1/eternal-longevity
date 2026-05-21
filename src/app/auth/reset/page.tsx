import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell, AuthLabel, authInputClass } from '@/components/auth/AuthShell';
import { updatePasswordAction } from '@/lib/auth-actions';
import { supabaseConfigured } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Set a new password | Eternal Longevity',
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
      <AuthShell eyebrow="ACCOUNT" title="Set a new password.">
        <div className="rounded-3xl border border-line bg-surface/85 backdrop-blur p-6 md:p-8 text-center space-y-4">
          <p className="text-sm text-foreground/70 leading-relaxed">
            Password reset turns on once the backend is connected.
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
    <AuthShell eyebrow="ACCOUNT" title="Set a new password.">
      <form
        action={updatePasswordAction}
        className="rounded-3xl border border-line bg-surface/85 backdrop-blur p-6 md:p-8 space-y-5"
      >
        {error === 'weak' && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Use a password of at least 8 characters.
          </div>
        )}
        {error === 'failed' && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            That reset link has expired. Request a new one from the login page.
          </div>
        )}

        <div>
          <AuthLabel htmlFor="new-password">NEW PASSWORD</AuthLabel>
          <input
            id="new-password"
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
          Update password →
        </button>
      </form>
    </AuthShell>
  );
}
