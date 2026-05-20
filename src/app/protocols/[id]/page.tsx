import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { FadeIn } from '@/components/ui/FadeIn';
import { ProtocolGallery } from '@/components/protocols/ProtocolGallery';
import { ProtocolPricing } from '@/components/protocols/ProtocolPricing';
import { ProtocolDetails } from '@/components/protocols/ProtocolDetails';
import { RelatedProtocols } from '@/components/protocols/RelatedProtocols';
import { ProtocolStickyBar } from '@/components/protocols/ProtocolStickyBar';
import { ProtocolPDPMobile } from '@/components/protocols/ProtocolPDPMobile';
import { PROTOCOLS, getProtocol, getOtherProtocols } from '@/lib/protocols';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return PROTOCOLS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const p = getProtocol(id);
  if (!p) return { title: 'Protocol | Eternal Longevity' };
  return {
    title: `${p.name} | Eternal Longevity`,
    description: p.shortDescription,
  };
}

export default async function ProtocolDetailPage({ params }: PageProps) {
  const { id } = await params;
  const protocol = getProtocol(id);
  if (!protocol) notFound();

  const others = getOtherProtocols(protocol.id);

  return (
    /* Dark theme. Matches the rest of the site. */
    <>
      <Header />

      {/* ===== MOBILE: sticky-gallery + slide-up panel (matches portal shop PDP) ===== */}
      <ProtocolPDPMobile protocol={protocol} />

      {/* ===== DESKTOP: original two-column layout ===== */}
      <main className="hidden md:block">
        {/* PDP HERO. Gallery left, info column right */}
        <section className="relative bg-background pt-28 pb-12 md:pt-36 md:pb-16 px-6">
          <div className="mx-auto max-w-7xl">
            {/* Breadcrumb (POUCH editorial pattern) */}
            <FadeIn>
              <p className="mb-6 md:mb-10 text-[11px] tracking-widest text-foreground/50">
                01 / SHOP / <span className="text-foreground/80">{protocol.name}</span>
              </p>
            </FadeIn>

            {/* Trust bar */}
            <FadeIn delay={100}>
              <div className="mb-8 md:mb-12 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[
                  { icon: '⚕', label: 'Physician-Reviewed' },
                  { icon: '✓', label: 'Licensed 503A Pharmacy' },
                  { icon: '◯', label: '99%+ Purity Tested' },
                  { icon: '⤴', label: 'Free Shipping' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-foreground/5 text-accent text-xs">
                      {item.icon}
                    </span>
                    <span className="text-[11px] md:text-xs tracking-wider text-foreground/70">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </FadeIn>

            <div className="grid gap-8 md:gap-12 lg:gap-16 lg:grid-cols-[1.1fr_1fr]">
              {/* LEFT. Gallery */}
              <FadeIn delay={200}>
                <ProtocolGallery
                  images={protocol.gallery}
                  swatch={protocol.swatch}
                  name={protocol.name}
                  category={protocol.category}
                  stack={protocol.stack}
                />
              </FadeIn>

              {/* RIGHT. Info column */}
              <FadeIn delay={300}>
                <div>
                  {/* Variant pills row */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="pill glass text-[10px] tracking-widest text-foreground/70 px-3 py-1.5">
                      {protocol.category}
                    </span>
                    <span className="pill glass text-[10px] tracking-widest text-foreground/70 px-3 py-1.5">
                      {protocol.cycleLength.toUpperCase()}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] tracking-wider text-foreground/60">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                      In Stock
                    </span>
                  </div>

                  {/* Title */}
                  <h1
                    className="mb-2 font-bold tracking-tight text-foreground"
                    style={{
                      fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}
                  >
                    {protocol.name}
                  </h1>
                  <p className="mb-4 text-base text-accent tracking-wider">
                    {protocol.tagline}
                  </p>

                  {/* Rating */}
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <svg
                          key={i}
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill={i <= 4 ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="text-accent"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-foreground/60">
                      (4.6) · 234 reviews
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mb-6 text-foreground/75 leading-relaxed">
                    {protocol.longDescription}
                  </p>

                  {/* Best for */}
                  <div className="mb-8 rounded-2xl border border-line bg-surface p-4 md:p-5">
                    <div className="mb-1.5 text-[10px] tracking-widest text-accent">
                      BEST FOR
                    </div>
                    <p className="text-sm text-foreground/85 leading-relaxed">
                      {protocol.bestFor}
                    </p>
                  </div>

                  {/* Pricing */}
                  <ProtocolPricing protocol={protocol} />
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* DETAILS / ACCORDION */}
        <section className="relative bg-background px-6 pb-24 md:pb-32">
          <div className="mx-auto max-w-7xl grid gap-12 lg:gap-20 lg:grid-cols-[1.1fr_1fr]">
            <FadeIn>
              <div>
                <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
                  02 / WHAT&apos;S INSIDE
                </p>
                <h2
                  className="mb-6 font-semibold tracking-tight text-foreground"
                  style={{
                    fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.05,
                  }}
                >
                  Engineered for outcomes, dosed for safety.
                </h2>
                <p className="text-foreground/65 leading-relaxed">
                  Each protocol pairs synergistic peptides with physician-supervised
                  dosing. Below is the typical structure. Your physician finalizes
                  doses based on your intake.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={120}>
              <ProtocolDetails protocol={protocol} />
            </FadeIn>
          </div>
        </section>

        {/* HOW IT WORKS BLOCK */}
        <section className="relative bg-surface px-6 py-24 md:py-32 overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 left-1/2 h-[40vh] w-[60vw] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[100px]"
          />
          <div className="relative mx-auto max-w-6xl">
            <FadeIn>
              <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
                03 / WHAT TO EXPECT
              </p>
            </FadeIn>
            <FadeIn delay={120}>
              <h2
                className="mb-16 max-w-3xl font-semibold tracking-tight text-foreground"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 4rem)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                From assessment to your door.
              </h2>
            </FadeIn>

            <ol className="grid gap-4 md:gap-6 md:grid-cols-4">
              {[
                { n: '01', title: 'Complete intake', body: 'Health history, goals, and consents. ~7 minutes.' },
                { n: '02', title: 'Clinical review', body: 'Your team drafts a protocol and routes it to a physician.' },
                { n: '03', title: 'Physician approval', body: 'Licensed physician reviews and e-signs the prescription.' },
                { n: '04', title: 'Compounded + shipped', body: '503A pharmacy ships to your door within 3–5 days.' },
              ].map((step, i) => (
                <FadeIn key={step.n} delay={200 + i * 100}>
                  <div className="rounded-2xl border border-line bg-background p-6">
                    <div className="mb-4 text-[10px] tracking-widest text-accent">
                      {step.n}
                    </div>
                    <div className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                      {step.title}
                    </div>
                    <p className="text-sm text-foreground/65 leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </ol>

            <FadeIn delay={700}>
              <div className="mt-12 flex justify-center">
                <Link
                  href="/start"
                  className="pill bg-accent text-black px-7 py-3 text-base font-semibold hover:bg-accent-soft transition-colors inline-flex items-center gap-2"
                >
                  Start Your Assessment
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* RELATED */}
        <RelatedProtocols protocols={others} />
      </main>
      <Footer />
      {/* Sticky bottom checkout bar (Eight Sleep pattern). Desktop only.
          On mobile, ProtocolPDPMobile provides its own floating CTA bar. */}
      <div className="hidden md:block">
        <ProtocolStickyBar protocol={protocol} />
      </div>
    </>
  );
}
