'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Protocol } from '@/lib/protocols';

interface ProtocolPDPMobileProps {
  protocol: Protocol;
}

/**
 * Mobile-only protocol PDP — the SAME UI pattern as the portal shop PDP
 * (ProductPDPMobile): a full-bleed sticky gallery up top, an info panel that
 * slides up over it, an inline CTA block, and a floating bottom CTA bar that
 * fades in once the inline CTA scrolls away.
 *
 * Pricing is members-only — visitors never see dollar amounts on the
 * marketing site. The CTA is "Start Your Assessment" → /start; pricing is
 * revealed inside the member portal after physician review.
 *
 * The parent page renders the original desktop layout above the md
 * breakpoint and this component below it.
 */
export function ProtocolPDPMobile({ protocol }: ProtocolPDPMobileProps) {
  // ---------- Carousel ----------
  const slides = protocol.gallery.slice(0, 3);
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const id = setInterval(() => {
      setSlideIdx((i) => (i + 1) % slides.length);
    }, 4500);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const userInteract = useCallback(() => {
    setPaused(true);
    const t = setTimeout(() => setPaused(false), 8000);
    return () => clearTimeout(t);
  }, []);

  const touchStart = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    if (Math.abs(dx) > 40) {
      userInteract();
      setSlideIdx((i) => {
        if (dx < 0) return (i + 1) % slides.length;
        return (i - 1 + slides.length) % slides.length;
      });
    }
    touchStart.current = null;
  };

  // ---------- Floating CTA visibility ----------
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showFloater, setShowFloater] = useState(false);

  useEffect(() => {
    const node = ctaRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowFloater(!entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="md:hidden relative bg-background">
      {/* ===== 1) STICKY GALLERY ===== */}
      <div
        className="sticky top-0 z-0 w-full overflow-hidden bg-surface"
        style={{ height: '70svh', minHeight: 460 }}
      >
        <div
          className="relative h-full w-full"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="absolute inset-0 flex h-full transition-transform"
            style={{
              width: `${slides.length * 100}%`,
              transform: `translateX(-${(slideIdx * 100) / slides.length}%)`,
              transitionDuration: '600ms',
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {slides.map((src, i) => (
              <div
                key={src + i}
                className="relative h-full flex-shrink-0"
                style={{
                  width: `${100 / slides.length}%`,
                  background: protocol.swatch,
                }}
              >
                <Image
                  src={src}
                  alt={`${protocol.name} — view ${i + 1}`}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className="object-cover opacity-60"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-black/70"
                />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center text-white">
                  <span className="text-[10px] tracking-[0.3em] text-white/60 mb-2">
                    ETERNAL LONGEVITY
                  </span>
                  <span
                    className="text-3xl font-semibold tracking-tight"
                    style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
                  >
                    {protocol.name}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {slides.length > 1 && (
            <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => {
                    userInteract();
                    setSlideIdx(i);
                  }}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === slideIdx
                      ? 'w-6 bg-accent'
                      : 'w-1.5 bg-white/40 hover:bg-white/60',
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== 2) INFO PANEL (slides up over gallery) ===== */}
      <div
        className="relative z-10 bg-background"
        style={{
          marginTop: -28,
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -14px 40px -18px rgba(0,0,0,0.55)',
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 28,
          paddingBottom: 120,
        }}
      >
        {/* Drag pip */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-foreground/15" />

        {/* Eligibility chip */}
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-[11px] font-medium tracking-wider text-accent">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          PHYSICIAN-REVIEWED · COMPOUNDED IN A 503A PHARMACY
        </div>

        {/* Protocol name */}
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2.25rem, 9vw, 3.25rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          {protocol.name}
        </h1>

        {/* Tagline */}
        <p className="mt-2 text-base italic text-foreground/65">
          {protocol.tagline}
        </p>

        {/* Members-only pricing chip */}
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[11px] tracking-wider text-foreground/70">
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

        {/* ===== Membership-includes card ===== */}
        <div
          className="mt-6 rounded-2xl border-2 border-accent p-5"
          style={{ background: 'rgba(213,168,80,0.06)' }}
        >
          <p className="mb-1 text-base font-semibold tracking-tight text-foreground">
            The {protocol.name} membership includes
          </p>
          <p className="mb-4 text-xs text-foreground/55 leading-relaxed">
            Complete a short assessment to see your personalized pricing. You
            aren&apos;t charged until a physician approves your protocol.
          </p>
          <ul className="space-y-2 text-sm text-foreground/80">
            {[
              'Physician review & e-signed prescription',
              'Compounded vials shipped on your cadence',
              'Dosing kit + instructions included',
              'Clinical liaison messaging',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
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
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* ===== Inline CTA block ===== */}
        <div
          ref={ctaRef}
          className="cta-block mt-6 rounded-2xl bg-surface-raised p-4"
        >
          <Link
            href="/start"
            className="block w-full rounded-full bg-accent px-6 py-4 text-center text-base font-semibold tracking-wide text-black transition-colors hover:bg-accent-soft active:scale-[0.98]"
          >
            Start Your Assessment
          </Link>
          <p className="mt-3 text-center text-[11px] tracking-wider text-foreground/50">
            Physician-reviewed before dispensing · you&apos;re not charged
            until your protocol is approved
          </p>
        </div>

        {/* ===== Important Disclaimer ===== */}
        <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/[0.05] p-4">
          <p className="text-[13px] leading-relaxed text-foreground/85">
            <span className="font-semibold text-accent">Important. </span>
            Eternal Longevity protocols are dispensed under a physician
            prescription after intake review. Not a substitute for medical
            care; do not use if pregnant, nursing, or under 18.
          </p>
        </div>

        {/* ===== Overview ===== */}
        <Section title="Overview" eyebrow="01">
          <p className="text-foreground/70 leading-relaxed">
            {protocol.longDescription}
          </p>
        </Section>

        {/* ===== Best For ===== */}
        <Section title="Best for" eyebrow="02">
          <p className="text-foreground/70 leading-relaxed">
            {protocol.bestFor}
          </p>
        </Section>

        {/* ===== Benefits ===== */}
        <Section title="Benefits" eyebrow="03">
          <ul className="space-y-2.5">
            {protocol.benefits.map((b) => (
              <li key={b} className="flex items-start gap-3 text-foreground/75">
                <span
                  aria-hidden
                  className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent"
                />
                <span className="leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* ===== Peptides in this stack ===== */}
        <Section title="Peptides in this stack" eyebrow="04">
          <ul className="space-y-2.5">
            {protocol.stack.map((peptide) => (
              <li
                key={peptide}
                className="flex items-start gap-3 text-foreground/75"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-1 flex-shrink-0 text-accent"
                  aria-hidden
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="leading-relaxed">{peptide}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* ===== Specifications ===== */}
        <Section title="Specifications" eyebrow="05">
          <dl className="divide-y divide-line text-sm">
            <SpecRow label="Category" value={protocol.category} />
            <SpecRow label="Cycle length" value={protocol.cycleLength} />
            <SpecRow
              label="Peptides"
              value={`${protocol.stack.length} in stack`}
            />
            <SpecRow
              label="Storage"
              value="Refrigerated 2–8°C · use within compounding date"
            />
            <SpecRow label="Physician review" value="Required" />
          </dl>
        </Section>

        {/* ===== Shipping ===== */}
        <Section title="Shipping" eyebrow="06">
          <p className="text-foreground/70 leading-relaxed">
            Cold-chain shipped from our licensed 503A pharmacy in temperature-
            controlled packaging. Free shipping on every cycle. Tracking
            available in your portal once your physician signs off.
          </p>
        </Section>

        {/* ===== Questions ===== */}
        <Section title="Questions?" eyebrow="07">
          <div className="space-y-3 text-foreground/75">
            <a
              href="mailto:care@eternallongevity.com"
              className="flex items-center gap-3 hover:text-foreground transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
                aria-hidden
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>care@eternallongevity.com</span>
            </a>
            <a
              href="tel:+18555551234"
              className="flex items-center gap-3 hover:text-foreground transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
                aria-hidden
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>(855) 555-1234 · Mon–Fri 9a–6p ET</span>
            </a>
          </div>
        </Section>
      </div>

      {/* ===== 3) FLOATING BOTTOM CTA BAR ===== */}
      <div
        aria-hidden={!showFloater}
        className={cn(
          'fixed left-3 right-3 z-[95] transition-opacity duration-300 ease-out',
          showFloater
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
        style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-3 rounded-2xl bg-surface-raised border border-line p-3 shadow-2xl backdrop-blur-md">
          <div className="min-w-0 flex-shrink">
            <div className="text-[10px] tracking-wider text-foreground/50">
              {protocol.category}
            </div>
            <div className="truncate text-sm font-semibold text-foreground">
              {protocol.name}
            </div>
          </div>
          <Link
            href="/start"
            className="flex-1 rounded-full bg-accent px-6 py-3 text-center text-sm font-semibold text-black transition-colors hover:bg-accent-soft active:scale-[0.98]"
          >
            Start Your Assessment
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9 border-t border-line pt-7">
      <p className="mb-2 text-[10px] tracking-widest text-foreground/40">
        {eyebrow}
      </p>
      <h3 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3">
      <dt className="text-[12px] tracking-wider text-foreground/55">{label}</dt>
      <dd className="text-right text-foreground/85">{value}</dd>
    </div>
  );
}
