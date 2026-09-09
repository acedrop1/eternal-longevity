import Link from 'next/link';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_HREF,
  SUPPORT_HOURS,
} from '@/lib/site';

const COL_LINKS = [
  {
    title: 'Platform',
    links: [
      { label: 'Shop', href: '/shop' },
      { label: 'Science', href: '/science' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Start assessment', href: '/start' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Log in', href: '/login' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Cookie Notice', href: '/legal/cookies' },
      { label: 'Informed Consent', href: '/legal/consent' },
      { label: 'Refund Policy', href: '/legal/refunds' },
      { label: 'Cancellation Policy', href: '/legal/cancellation' },
      { label: 'Shipping & Delivery', href: '/legal/shipping' },
      { label: 'Accessibility', href: '/legal/accessibility' },
    ],
  },
  {
    title: 'Medical & Safety',
    links: [
      { label: 'Medical Disclaimer', href: '/legal/medical-disclaimer' },
      { label: 'Prescription Policy', href: '/legal/prescription-policy' },
      { label: 'Patient Eligibility', href: '/legal/eligibility' },
      { label: 'Compounded Medication', href: '/legal/compounded-medication' },
      { label: 'Adverse Event Reporting', href: '/legal/adverse-events' },
      { label: 'Pharmacy Fulfillment', href: '/legal/pharmacy-fulfillment' },
      { label: 'State Availability', href: '/legal/state-availability' },
      { label: 'Compliance', href: '/compliance' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-background px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <div className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="Eternal Longevity"
                className="h-9 w-auto"
                draggable={false}
              />
            </div>
            <p className="max-w-xs text-sm text-foreground/55 leading-relaxed">
              Premium peptide protocols. For performance,
              recovery, and longevity.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="pill glass text-[10px] tracking-widest text-foreground/70 px-3 py-1.5">
                LICENSED 503A PHARMACY
              </span>
              <span className="pill glass text-[10px] tracking-widest text-foreground/70 px-3 py-1.5">
                NO TRACKERS · NO DATA SOLD
              </span>
            </div>

            {/* Legal name, postal address and a way to reach a human — the
                merchant details a cardholder (and an underwriter) looks for. */}
            <address className="mt-6 space-y-1 text-xs not-italic text-foreground/50 leading-relaxed">
              <p className="text-foreground/70">{BUSINESS_LEGAL_NAME}</p>
              <p>{BUSINESS_ADDRESS}</p>
              <p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="hover:text-foreground transition-colors"
                >
                  {SUPPORT_EMAIL}
                </a>
              </p>
              {SUPPORT_PHONE && (
                <p>
                  <a
                    href={SUPPORT_PHONE_HREF}
                    className="hover:text-foreground transition-colors"
                  >
                    {SUPPORT_PHONE}
                  </a>{' '}
                  · {SUPPORT_HOURS}
                </p>
              )}
            </address>
          </div>

          {COL_LINKS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-[11px] tracking-widest text-foreground/50">
                {col.title.toUpperCase()}
              </h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-foreground/70 hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-foreground/40">
            © {new Date().getFullYear()} {BUSINESS_LEGAL_NAME}. All rights reserved.
          </p>
          <p className="max-w-2xl text-[11px] text-foreground/35 leading-relaxed md:text-right">
            Prescriptions are written by a New Jersey&ndash;licensed physician
            following clinical review, and dispensed by an independently
            licensed, FDA-registered 503A compounding pharmacy. Eternal
            Longevity is not a pharmacy. Compounded medications are not
            FDA-approved. These statements have not been evaluated by the Food
            and Drug Administration; these products are not intended to
            diagnose, treat, cure, or prevent any disease. Not a substitute for
            primary care. Available to New Jersey residents only. 18+.
          </p>
        </div>
      </div>
    </footer>
  );
}
