import { FadeIn } from '@/components/ui/FadeIn';

/**
 * Numbered process steps with pill labels (Protocole's "1°/2°/3°/4°/5°" pattern).
 * Each step staggers in on scroll.
 */
const STEPS = [
  { n: '1°', title: 'Begin your assessment' },
  { n: '2°', title: 'Receive a recommended protocol' },
  { n: '3°', title: 'Quality review and purity testing' },
  { n: '4°', title: 'Compounded and shipped to your door' },
  { n: '5°', title: 'Reorder seamlessly through your portal' },
];

export function HowItWorks() {
  return (
    <section className="relative bg-surface px-6 py-32 md:py-40">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
            02 / HOW IT WORKS
          </p>
        </FadeIn>

        <FadeIn delay={120}>
          <h2
            className="mb-16 max-w-3xl text-4xl md:text-6xl font-semibold tracking-tight"
            style={{ letterSpacing: '-0.02em', lineHeight: 1 }}
          >
            Five steps. No friction.
          </h2>
        </FadeIn>

        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <FadeIn key={step.n} delay={250 + i * 100} y={16}>
              <li className="flex items-center gap-4 md:gap-6">
                <span className="pill glass text-foreground/80 font-semibold">
                  {step.n}
                </span>
                <span className="h-px flex-1 bg-line" />
                <span className="pill glass text-foreground text-sm md:text-lg px-4 md:px-6 py-3">
                  {step.title}
                </span>
              </li>
            </FadeIn>
          ))}
        </ol>
      </div>
    </section>
  );
}
