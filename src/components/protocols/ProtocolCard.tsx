'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FadeIn } from '@/components/ui/FadeIn';
import type { Protocol } from '@/lib/protocols';

interface Props {
  protocol: Protocol;
  delay?: number;
}

export function ProtocolCard({ protocol, delay = 0 }: Props) {
  return (
    <FadeIn delay={delay}>
      <Link
        href={`/protocols/${protocol.id}`}
        className="group relative block overflow-hidden rounded-[2rem] border border-line bg-surface transition-all duration-500 ease-out-expo hover:-translate-y-1 hover:border-accent/30"
        style={{
          background: `linear-gradient(180deg, ${protocol.swatch} 0%, var(--bg, #002C28) 100%)`,
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.5)',
        }}
      >
        {/* Photo header */}
        <div className="relative aspect-[4/5] overflow-hidden">
          <Image
            src={protocol.image}
            alt={protocol.name}
            fill
            sizes="(max-width: 768px) 90vw, 25vw"
            className="object-cover opacity-50 transition-all duration-[1.6s] ease-out-expo group-hover:scale-105 group-hover:opacity-70"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80"
          />
          {/* Content overlay */}
          <div className="relative flex h-full flex-col items-center justify-between p-6 text-center">
            <span className="text-[10px] tracking-widest text-white/70">
              ETERNAL LONGEVITY
            </span>
            <div style={{ textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>
              <div className="mb-2 text-[10px] tracking-widest text-accent">
                {protocol.tagline.toUpperCase()}
              </div>
              <div
                className="font-bold tracking-tight text-white"
                style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', letterSpacing: '-0.02em' }}
              >
                {protocol.name}
              </div>
            </div>
            <div className="text-[9px] tracking-widest text-white/55">
              {protocol.stack.slice(0, 3).join(' / ')}
              {protocol.stack.length > 3 && ' ...'}
            </div>
          </div>
        </div>

        {/* Bottom row — copy + arrow */}
        <div className="relative p-6 md:p-7">
          <p className="text-sm text-foreground/70 leading-relaxed mb-4">
            {protocol.shortDescription}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] tracking-widest text-foreground/40">FROM</div>
              <div className="text-base font-semibold text-foreground">
                ${protocol.pricing.monthly}/mo
              </div>
            </div>
            <span className="inline-flex items-center gap-2 text-[11px] tracking-widest text-accent transition-transform duration-300 ease-out-expo group-hover:translate-x-1">
              EXPLORE
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </FadeIn>
  );
}
