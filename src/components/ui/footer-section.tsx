'use client';

import type { ComponentProps, ReactNode } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Instagram } from 'lucide-react';
import { LegitScriptSeal } from '@/components/ui/LegitScriptSeal';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_HREF,
  SUPPORT_HOURS,
} from '@/lib/site';

interface FooterLink {
  title: string;
  href: string;
}

interface FooterSection {
  label: string;
  links: FooterLink[];
}

// Exported: the legal sidebar (components/legal/LegalNav) reads the Legal and
// Medical & Safety groups from here, so the two lists can't drift.
export const footerLinks: FooterSection[] = [
  {
    label: 'Shop',
    links: [
      { title: 'Shop all', href: '/shop' },
      { title: 'FAQ', href: '/faq' },
      { title: 'Start assessment', href: '/start' },
      { title: 'About', href: '/about' },
      { title: 'Contact', href: '/contact' },
      { title: 'Log in', href: '/login' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { title: 'Terms of Service', href: '/legal/terms' },
      { title: 'Privacy Policy', href: '/legal/privacy' },
      { title: 'Cookie Notice', href: '/legal/cookies' },
      { title: 'Informed Consent', href: '/legal/consent' },
      { title: 'Refund Policy', href: '/legal/refunds' },
      { title: 'Cancellation Policy', href: '/legal/cancellation' },
      { title: 'Shipping & Delivery', href: '/legal/shipping' },
      { title: 'Accessibility', href: '/legal/accessibility' },
    ],
  },
  {
    label: 'Medical & Safety',
    links: [
      { title: 'Medical Disclaimer', href: '/legal/medical-disclaimer' },
      { title: 'Prescription Policy', href: '/legal/prescription-policy' },
      { title: 'Patient Eligibility', href: '/legal/eligibility' },
      { title: 'Compounded Medication', href: '/legal/compounded-medication' },
      { title: 'Adverse Event Reporting', href: '/legal/adverse-events' },
      { title: 'Pharmacy Fulfillment', href: '/legal/pharmacy-fulfillment' },
      { title: 'State Availability', href: '/legal/state-availability' },
      { title: 'Compliance', href: '/compliance' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative w-full overflow-hidden rounded-t-[4px] border-t border-white/10 bg-black bg-[radial-gradient(35%_128px_at_50%_0%,rgba(255,255,255,0.08),transparent)] px-6 py-12 text-white lg:py-16">
      <div className="absolute left-1/2 top-0 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur" />

      <div className="mx-auto max-w-6xl">
        <div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
          <AnimatedContainer className="space-y-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Eternal Longevity" className="h-9 w-auto" draggable={false} />

            {/* Legal name, postal address and a way to reach a human: the
                merchant details a cardholder (and an underwriter) looks for. */}
            <address className="space-y-1 text-sm not-italic leading-relaxed text-white/60">
              <p className="text-white/80">{BUSINESS_LEGAL_NAME}</p>
              <p>{BUSINESS_ADDRESS}</p>
              <p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="transition-colors hover:text-white">
                  {SUPPORT_EMAIL}
                </a>
              </p>
              {SUPPORT_PHONE && (
                <p>
                  <a href={SUPPORT_PHONE_HREF} className="transition-colors hover:text-white">
                    {SUPPORT_PHONE}
                  </a>{' '}
                  · {SUPPORT_HOURS}
                </p>
              )}
            </address>

            <a
              href="https://instagram.com/etlongevity"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
            >
              <Instagram className="size-4" />
              Instagram
            </a>

            {/* LegitScript certification, verifiable on legitscript.com. */}
            <LegitScriptSeal className="block w-fit" />
          </AnimatedContainer>

          <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-3 xl:col-span-2 xl:mt-0">
            {footerLinks.map((section, index) => (
              <AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
                <div className="mb-10 md:mb-0">
                  <h3 className="font-mono text-xs text-white/80">{section.label}</h3>
                  <ul className="mt-4 space-y-2 text-sm text-white/60">
                    {section.links.map((link) => (
                      <li key={link.title}>
                        <Link href={link.href} className="inline-flex items-center transition-colors duration-300 hover:text-white">
                          {link.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedContainer>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 md:flex-row md:items-start md:justify-between">
          <p className="shrink-0 text-xs text-white/50">
            © {new Date().getFullYear()} {BUSINESS_LEGAL_NAME}. All rights reserved.
          </p>
          <p className="max-w-2xl text-[11px] leading-relaxed text-white/45 md:text-right">
            Prescriptions are written by a licensed physician following clinical review, and dispensed
            by an independently licensed 503A compounding pharmacy. Eternal Longevity is not a pharmacy. Compounded
            medications are not FDA-approved. These statements have not been evaluated by the Food and Drug
            Administration; these products are not intended to diagnose, treat, cure, or prevent any disease. Not a
            substitute for primary care. Available to residents of New Jersey, New York, Pennsylvania and Michigan only. 18+.
          </p>
        </div>
      </div>
    </footer>
  );
}

type ViewAnimationProps = {
  delay?: number;
  className?: ComponentProps<typeof motion.div>['className'];
  children: ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ filter: 'blur(4px)', y: -8, opacity: 0 }}
      whileInView={{ filter: 'blur(0px)', y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
