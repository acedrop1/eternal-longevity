import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { StickyLeadCapture } from '@/components/lead-capture/StickyLeadCapture';
import { ProtocolCard } from '@/components/protocols/ProtocolCard';
import { FadeIn } from '@/components/ui/FadeIn';
import { LoopVideo } from '@/components/ui/LoopVideo';
import { PROTOCOLS } from '@/lib/protocols';

export const metadata = {
  title: 'Protocols | Eternal Longevity',
  description:
    'Premium peptide protocols for recovery, performance, longevity, and body composition.',
};

export default function ProtocolsListingPage() {
  return (
    <>
      <Header />
      <main>
        {/* HERO */}
        <section className="relative isolate overflow-hidden bg-background pt-32 pb-20 md:pt-40 md:pb-28 px-6">
          {/* Gold halo */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-1/3 left-1/2 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-accent/[0.10] blur-[120px]"
          />
          <div className="relative mx-auto max-w-5xl text-center">
            <FadeIn>
              <p className="mb-4 text-[11px] tracking-widest text-accent">
                01 / PROTOCOLS
              </p>
            </FadeIn>
            <FadeIn delay={120}>
              <h1
                className="font-bold tracking-tight text-foreground"
                style={{
                  fontSize: 'clamp(2.75rem, 7vw, 6rem)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.02em',
                }}
              >
                Built for outcomes.
                <br />
                Compounded to order.
              </h1>
            </FadeIn>
            <FadeIn delay={240}>
              <p className="mt-6 mx-auto max-w-xl text-base md:text-lg text-foreground/65 leading-relaxed">
                Four protocols, each a synergistic peptide stack. Compounded by
                licensed 503A pharmacies, third-party tested for purity,
                shipped to your door.
              </p>
            </FadeIn>
            <FadeIn delay={360}>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/start"
                  className="pill bg-accent text-black px-7 py-3 font-semibold hover:bg-accent-soft transition-colors"
                >
                  Start Your Assessment
                </Link>
                <Link
                  href="#protocols"
                  className="pill glass text-foreground/80 hover:text-foreground px-7 py-3"
                >
                  Browse Protocols
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* GRID */}
        <section id="protocols" className="relative bg-background px-6 pb-32 md:pb-40">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {PROTOCOLS.map((p, i) => (
                <ProtocolCard key={p.id} protocol={p} delay={i * 80} />
              ))}
            </div>
          </div>
        </section>

        {/* HOW PRICING WORKS BLOCK */}
        <section className="relative bg-surface px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <FadeIn>
              <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
                02 / HOW PRICING WORKS
              </p>
            </FadeIn>
            <FadeIn delay={120}>
              <h2
                className="mb-6 max-w-3xl font-semibold tracking-tight text-foreground"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 4rem)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                Flat monthly. Cancel anytime.
              </h2>
            </FadeIn>
            <FadeIn delay={240}>
              <p className="max-w-xl text-foreground/65 leading-relaxed mb-10">
                Each protocol bills as a flat monthly subscription that includes
                the compound, dosing instructions, shipping, and ongoing access to
                our support team. No initiation fee. Cancel from your member
                portal whenever.
              </p>
            </FadeIn>
            <FadeIn delay={360}>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { title: 'No initiation fee', body: 'Pay only when your protocol ships.' },
                  { title: 'Pause or cancel anytime', body: 'Manage everything from your member portal.' },
                  { title: '24/7 member support', body: 'Direct message our team for adjustments.' },
                ].map((item, i) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-line bg-background p-6"
                  >
                    <div className="mb-3 text-[10px] tracking-widest text-accent">
                      0{i + 1}
                    </div>
                    <div className="mb-1 font-semibold text-foreground">
                      {item.title}
                    </div>
                    <div className="text-sm text-foreground/65 leading-relaxed">
                      {item.body}
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* CTA STRIP. Ambient video bg */}
        <section className="relative bg-background px-6 py-24 md:py-32 overflow-hidden">
          <LoopVideo
            src="/videos/3.mp4"
            className="absolute inset-0 w-full h-full"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-background/75"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40vh] bg-accent/[0.06] blur-[100px]"
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <FadeIn>
              <h2
                className="mb-6 font-semibold tracking-tight text-foreground"
                style={{
                  fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                }}
              >
                Not sure which protocol is right for you?
              </h2>
            </FadeIn>
            <FadeIn delay={120}>
              <p className="mb-8 text-foreground/65 leading-relaxed">
                Take the 3-minute profile. We&apos;ll match you to the protocol
                that best fits your goals, then it&apos;s compounded and
                third-party tested before it ships.
              </p>
            </FadeIn>
            <FadeIn delay={240}>
              <Link
                href="/start"
                className="pill bg-accent text-black px-8 py-3.5 text-base font-semibold hover:bg-accent-soft transition-colors inline-flex items-center gap-2"
              >
                Start Your Assessment
                <span aria-hidden>→</span>
              </Link>
            </FadeIn>
          </div>
        </section>
      </main>
      <Footer />
      <StickyLeadCapture />
    </>
  );
}
