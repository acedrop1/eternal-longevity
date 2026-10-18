import Link from 'next/link';
import { SIGNUP_CONSENT } from '@/lib/followups';

const link = 'text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink';

/** SIGNUP_CONSENT.text with its two policies linked (same words, so the stored text is what was shown). */
export function SignupConsent({ className }: { className?: string }) {
  const [before, rest] = SIGNUP_CONSENT.text.split('Terms of Service');
  const [middle, after] = rest.split('Privacy Policy');
  return (
    <p className={className}>
      {before}
      <Link href="/legal/terms" target="_blank" className={link}>
        Terms of Service
      </Link>
      {middle}
      <Link href="/legal/privacy" target="_blank" className={link}>
        Privacy Policy
      </Link>
      {after}
    </p>
  );
}
