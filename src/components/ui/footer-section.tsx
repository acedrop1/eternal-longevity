'use client';

import type { ComponentProps, ReactNode } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Instagram } from 'lucide-react';
import { LegitScriptSeal } from '@/components/ui/LegitScriptSeal';
import { Wordmark } from '@/components/nav/Wordmark';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_HREF,
  SUPPORT_HOURS,
  SERVICE_AREA,
  FDA_DISCLAIMER,
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
    <footer className="bg-white px-5 pb-8 pt-6 text-ink md:px-10">
      <div
        className="mx-auto rounded-shell bg-milk px-6 py-12 md:px-12 md:py-16"
        style={{
          backgroundImage:
            'radial-gradient(35% 60% at 8% 10%, rgba(255,236,159,0.35), transparent 70%), radial-gradient(30% 55% at 95% 90%, rgba(207,196,246,0.4), transparent 70%)',
        }}
      >
        <div className="grid w-full gap-10 xl:grid-cols-3 xl:gap-8">
          <AnimatedContainer className="space-y-5">
            <Wordmark className="text-[44px]" />
            {/* Legal name, postal address and a way to reach a human: the
                merchant details a cardholder (and an underwriter) looks for. */}
            <address className="space-y-1 text-[14px] not-italic leading-relaxed text-ink-soft">
              <p className="font-medium text-ink">{BUSINESS_LEGAL_NAME}</p>
              <p>{BUSINESS_ADDRESS}</p>
              <p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="transition-colors hover:text-ink">
                  {SUPPORT_EMAIL}
                </a>
              </p>
              {SUPPORT_PHONE && (
                <p>
                  <a href={SUPPORT_PHONE_HREF} className="transition-colors hover:text-ink">
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
              className="inline-flex items-center gap-1.5 text-[14px] text-ink-soft transition-colors hover:text-ink"
            >
              <Instagram className="size-4" />
              Instagram
            </a>
            {/* LegitScript certification, verifiable on legitscript.com. */}
            <LegitScriptSeal className="block w-fit" />
          </AnimatedContainer>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-3 xl:col-span-2">
            {footerLinks.map((section, index) => (
              <AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-ink">{section.label}</h3>
                <ul className="mt-4 space-y-2.5 text-[14px] text-ink-soft">
                  {section.links.map((link) => (
                    <li key={link.title}>
                      <Link href={link.href} className="inline-flex items-center transition-colors duration-300 hover:text-ink">
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </AnimatedContainer>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-black/10 pt-6 md:flex-row md:items-start md:justify-between">
          <p className="shrink-0 text-[12px] text-ink-soft">
            © {new Date().getFullYear()} {BUSINESS_LEGAL_NAME}. All rights reserved.
          </p>
          <p className="max-w-2xl text-[11.5px] leading-relaxed text-ink-soft md:text-right">
            Prescriptions are written by a licensed physician following clinical review, and dispensed
            by an independently licensed 503A compounding pharmacy. Eternal Longevity is not a pharmacy. Rx
            only. Compounded medications are not FDA-approved; the FDA does not verify their safety, effectiveness or
            quality. {FDA_DISCLAIMER} Not a substitute for primary care. Available to residents of {SERVICE_AREA} only. 18+.
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
