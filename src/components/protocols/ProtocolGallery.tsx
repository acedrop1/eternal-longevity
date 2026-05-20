'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Props {
  images: string[];
  swatch: string;
  name: string;
  category: string;
  stack: string[];
}

/**
 * POUCH-style PDP gallery: left column is a stack of thumbnails, right side
 * is the large hero image with the brand label overlaid (mimics product
 * packaging since we don't have real product photography yet).
 */
export function ProtocolGallery({ images, swatch, name, category, stack }: Props) {
  const [active, setActive] = useState(0);
  const heroImage = images[active] ?? images[0];

  return (
    <div className="grid grid-cols-[68px_1fr] md:grid-cols-[88px_1fr] gap-3 md:gap-4">
      {/* Thumbnails (vertical). Miniature versions of the hero treatment:
          swatch background + image overlay + brand monogram so each thumb
          reads as a tiny edition of the main packaging card. */}
      <div className="flex flex-col gap-2 md:gap-3">
        {images.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show image ${i + 1}`}
            style={{
              background: `linear-gradient(180deg, ${swatch} 0%, var(--bg, #000000) 100%)`,
            }}
            className={cn(
              'relative aspect-square overflow-hidden rounded-xl transition-all duration-300 ease-out-expo',
              i === active
                ? 'ring-2 ring-accent ring-offset-2 ring-offset-background'
                : 'ring-1 ring-line opacity-80 hover:opacity-100'
            )}
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="(max-width: 768px) 68px, 88px"
              className="object-cover opacity-40"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70"
            />
            {/* Tiny gold monogram so the thumb visibly matches the hero */}
            <span
              className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tracking-widest text-accent"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
            >
              EL
            </span>
          </button>
        ))}
      </div>

      {/* Hero. Packaging-style with brand label overlaid on lifestyle image */}
      <div
        className="relative aspect-[4/5] overflow-hidden rounded-[2.25rem] md:rounded-[2.75rem] border border-line"
        style={{
          background: `linear-gradient(180deg, ${swatch} 0%, var(--bg, #000000) 100%)`,
          boxShadow:
            '0 60px 120px -20px rgba(213,168,80,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <Image
          src={heroImage}
          alt={name}
          fill
          sizes="(max-width: 1024px) 90vw, 640px"
          priority
          className="object-cover opacity-40 transition-opacity duration-700 ease-out-expo"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/80"
        />
        <div className="relative flex h-full flex-col items-center justify-between p-6 md:p-8 text-center">
          <span className="text-[10px] tracking-widest text-white/70">
            ETERNAL LONGEVITY
          </span>
          <div style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
            <div className="mb-2 text-[10px] tracking-widest text-accent">
              {category}
            </div>
            <div
              className="font-bold tracking-tight text-white"
              style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', letterSpacing: '-0.02em' }}
            >
              {name}
            </div>
          </div>
          <div className="text-[10px] tracking-widest text-white/55">
            {stack.join(' / ')}
          </div>
        </div>
      </div>
    </div>
  );
}
