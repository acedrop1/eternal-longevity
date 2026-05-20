import Image from 'next/image';
import { FadeIn } from '@/components/ui/FadeIn';

/**
 * POUCH "Sip vs Drip" pattern, adapted for peptide therapy.
 *
 * Editorial layout:
 *   - Left: section eyebrow, big serif-feel title, accent CTA pill, atmospheric photo placeholder.
 *   - Right: a comparison table comparing Eternal Longevity (physician-supervised) vs research peptides (self-sourced).
 *   - Background: atmospheric streaks (POUCH water-particle vibe, here as soft accent dashes).
 */

const FEATURES = [
  { label: 'Physician-Reviewed Protocol', ours: true, theirs: false },
  { label: 'Licensed 503A Pharmacy', ours: true, theirs: false },
  { label: 'Tested for Purity & Sterility', ours: true, theirs: 'Maybe' },
  { label: 'Personalized Dosing', ours: true, theirs: false },
  { label: 'Clinical Liaison Support', ours: true, theirs: false },
  { label: 'HIPAA-Compliant Records', ours: true, theirs: false },
  { label: 'Cold-Chain Shipping', ours: true, theirs: false },
];

export function Comparison() {
  return (
    <section className="relative overflow-hidden bg-background px-6 py-32 md:py-40">
      {/* Atmospheric streaks (POUCH water-streak vibe, gold dashes) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute top-[8%] left-[15%] h-px w-24 bg-accent/20 rotate-[20deg]" />
        <span className="absolute top-[22%] left-[40%] h-px w-32 bg-accent/15 rotate-[15deg]" />
        <span className="absolute top-[45%] left-[60%] h-px w-20 bg-accent/25 rotate-[25deg]" />
        <span className="absolute top-[65%] left-[20%] h-px w-28 bg-accent/15 rotate-[18deg]" />
        <span className="absolute top-[78%] left-[55%] h-px w-24 bg-accent/20 rotate-[12deg]" />
        <span className="absolute top-[15%] right-[10%] h-px w-16 bg-accent/15 rotate-[18deg]" />
        <span className="absolute top-[50%] right-[30%] h-px w-20 bg-accent/10 rotate-[22deg]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Eyebrow */}
        <FadeIn>
          <p className="text-[11px] tracking-widest text-foreground/50 mb-6">
            04 / PRESCRIPTION vs RESEARCH
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start">
          {/* Left column */}
          <FadeIn delay={120}>
            <h2
              className="font-semibold tracking-tight text-foreground mb-8"
              style={{
                fontSize: 'clamp(2.25rem, 5vw, 4.5rem)',
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
              }}
            >
              Prescribed Care.
              <br />
              <span className="text-accent">Real Protocols.</span>
            </h2>

            <p className="text-foreground/65 leading-relaxed max-w-md mb-8">
              The peptide market is full of unregulated research vials. Eternal Longevity is the opposite: physician-reviewed protocols, licensed compounding pharmacies, and a clinical team that knows your file.
            </p>

            <a
              href="/start"
              className="pill bg-accent text-black font-semibold text-base px-7 py-3 hover:bg-accent-soft transition-colors"
            >
              Start Your Assessment →
            </a>

            {/* Atmospheric lifestyle photo */}
            <div className="mt-12 relative aspect-square w-full max-w-[320px] rounded-2xl overflow-hidden border border-line">
              <Image
                src="/images/2.jpg"
                alt="Beach yoga at dusk"
                fill
                sizes="(max-width: 768px) 90vw, 320px"
                className="object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
              />
            </div>
          </FadeIn>

          {/* Right column. Comparison table */}
          <FadeIn delay={220}>
          <div
            className="relative rounded-3xl border border-line overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, rgba(213,168,80,0.06) 0%, rgba(0, 0, 0,0) 30%, rgba(0, 0, 0,0) 100%), rgba(20, 20, 20,0.6)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {/* Table header */}
            <div className="grid grid-cols-[1.5fr_0.7fr_0.7fr] md:grid-cols-[1.5fr_1fr_1fr] border-b border-line">
              <div className="p-5 text-[11px] tracking-widest text-foreground/50">
                CRITERIA
              </div>
              <div className="p-5 text-center">
                <div className="text-base md:text-lg font-semibold tracking-tight text-foreground">
                  Eternal
                </div>
                <div className="text-[10px] tracking-widest text-accent/80">PROTOCOL</div>
              </div>
              <div className="p-5 text-center">
                <div className="text-base md:text-lg font-semibold tracking-tight text-foreground/60">
                  Research
                </div>
                <div className="text-[10px] tracking-widest text-foreground/40">SELF-SOURCED</div>
              </div>
            </div>

            {/* Rows */}
            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                className={`grid grid-cols-[1.5fr_0.7fr_0.7fr] md:grid-cols-[1.5fr_1fr_1fr] ${
                  i < FEATURES.length - 1 ? 'border-b border-line' : ''
                }`}
              >
                <div className="p-3 md:p-5 text-[11px] md:text-sm tracking-wider text-foreground/80 leading-tight">
                  {f.label}
                </div>
                <div className="p-3 md:p-5 text-center">
                  <Cell value={f.ours} positive />
                </div>
                <div className="p-3 md:p-5 text-center">
                  <Cell value={f.theirs} />
                </div>
              </div>
            ))}

            {/* Footer brand mark */}
            <div className="p-5 flex justify-end border-t border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Eternal Longevity" className="h-5 w-auto opacity-70" />
            </div>
          </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function Cell({ value, positive }: { value: boolean | string; positive?: boolean }) {
  if (value === true) {
    return (
      <span
        className={`inline-flex items-center justify-center text-xs font-semibold tracking-widest ${
          positive ? 'text-accent' : 'text-foreground'
        }`}
      >
        YES
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center text-xs font-semibold tracking-widest text-foreground/30">
        NO
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center text-xs font-semibold tracking-widest text-foreground/50">
      {value}
    </span>
  );
}
