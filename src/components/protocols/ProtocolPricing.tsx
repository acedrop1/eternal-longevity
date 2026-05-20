import Link from 'next/link';
import type { Protocol } from '@/lib/protocols';

interface Props {
  protocol: Protocol;
}

/**
 * Membership / assessment card for the desktop protocol PDP.
 *
 * Pricing is members-only. Visitors don't see dollar amounts on the
 * marketing site. Instead this card lays out what's included and drives to
 * the assessment, where pricing is revealed inside the member portal after
 * physician review.
 */
export function ProtocolPricing({ protocol }: Props) {
  return (
    <div>
      {/* Members-only pricing notice */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[11px] tracking-wider text-foreground/70">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent"
          aria-hidden
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        MEMBERS-ONLY PRICING
      </div>

      {/* What's included card */}
      <div
        className="rounded-2xl border-2 border-accent p-5 md:p-6"
        style={{ background: 'rgba(213,168,80,0.06)' }}
      >
        <p className="mb-1 text-lg font-semibold tracking-tight text-foreground">
          The {protocol.name} membership includes
        </p>
        <p className="mb-4 text-xs text-foreground/55 leading-relaxed">
          Complete a short assessment to see your personalized pricing. You
          aren&apos;t charged until a physician approves your protocol.
        </p>
        <ul className="space-y-2 text-sm text-foreground/80">
          <li className="flex items-start gap-2.5">
            <Check />
            Physician review &amp; e-signed prescription
          </li>
          <li className="flex items-start gap-2.5">
            <Check />
            Compounded vials shipped on your cadence
          </li>
          <li className="flex items-start gap-2.5">
            <Check />
            Dosing kit + instructions included
          </li>
          <li className="flex items-start gap-2.5">
            <Check />
            Clinical liaison messaging
          </li>
          <li className="flex items-start gap-2.5">
            <Check />
            Provider re-authorization handled for you
          </li>
        </ul>
      </div>

      {/* CTA */}
      <Link
        href="/start"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent text-black px-6 py-4 text-base font-semibold hover:bg-accent-soft transition-colors"
      >
        Start Your Assessment
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
      <p className="mt-3 text-center text-[11px] text-foreground/45 leading-relaxed">
        Final eligibility at the discretion of the overseeing physician. You
        won&apos;t be charged until your protocol is approved.
      </p>
    </div>
  );
}

function Check() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 flex-shrink-0 text-accent"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
