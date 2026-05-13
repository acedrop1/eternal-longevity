import { FadeIn } from '@/components/ui/FadeIn';
import { ProtocolCard } from './ProtocolCard';
import type { Protocol } from '@/lib/protocols';

interface Props {
  protocols: Protocol[];
}

export function RelatedProtocols({ protocols }: Props) {
  return (
    <section className="relative bg-background px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <FadeIn>
          <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
            04 / EXPLORE MORE
          </p>
        </FadeIn>
        <FadeIn delay={120}>
          <h2
            className="mb-12 font-semibold tracking-tight text-foreground"
            style={{
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            Other protocols.
          </h2>
        </FadeIn>
        <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {protocols.map((p, i) => (
            <ProtocolCard key={p.id} protocol={p} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}
