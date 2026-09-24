'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { StandardsMarquee } from './StandardsMarquee';

/**
 * Homepage hero: the brand video, full-bleed, with the headline, one line of
 * copy and two typewriter pill buttons, plus a slow ticker along the bottom.
 * The section stays sticky so IntroPanel still rises over it on scroll.
 */

// The clip reads best a little slower than it was rendered.
const PLAYBACK_RATE = 0.7;

// Standing facts for the ticker. Each is already stated elsewhere on the site.
const TICKER = [
  'New Jersey only',
  'Prescription required',
  '18+',
  'Free shipping on every cycle',
  'Compounded by a licensed 503A pharmacy',
];

export function Hero() {
  const [reduced, setReduced] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // playbackRate isn't an attribute, so set it on the element (and again once
  // metadata loads: some browsers reset it when the source loads).
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = PLAYBACK_RATE;
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const enter = (step: number) => ({ className: 'anim-fade-up', style: { animationDelay: `${0.4 + step * 0.1}s` } });

  return (
    <section className="sticky top-0 isolate z-0 min-h-[100svh] overflow-hidden bg-black">
      {/* hero-loop.mp4 is the clip played forward then in reverse, baked into
          one file, so the loop turns around instead of cutting. No audio track. */}
      <video
        ref={videoRef}
        onLoadedMetadata={(e) => (e.currentTarget.playbackRate = PLAYBACK_RATE)}
        className="absolute inset-0 h-full w-full object-cover"
        src="/hero-loop.mp4"
        poster="/hero-loop-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controls={false}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/45" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-background" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 hidden h-[80vh] w-[80vh] -translate-x-1/2 rounded-full bg-accent/[0.05] blur-[120px] anim-halo md:block"
      />

      {/* Copy. Top padding clears the fixed header: bar + header + product
          strip, 126px on mobile and 134px on desktop. */}
      <div className="relative z-10 flex min-h-[100svh] flex-col justify-center px-5 pb-40 pt-[126px] md:px-[54px] md:pb-44 md:pt-[134px]">
        <h1
          className={`font-bold tracking-tight text-white ${enter(0).className}`}
          style={{
            ...enter(0).style,
            fontSize: 'clamp(3rem, 6.5vw, 6.5rem)',
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            textShadow: '0 4px 40px rgba(0,0,0,0.5)',
          }}
        >
          ETERNAL
          <br />
          LONGEVITY
        </h1>
        {/* The two trust facts sit at full white against softer copy. */}
        <p className={`mt-5 max-w-md text-[15px] leading-relaxed text-white/70 md:text-[16px] ${enter(1).className}`} style={enter(1).style}>
          Prescribed by a <span className="text-white">New Jersey physician</span>. Compounded by a licensed{' '}
          <span className="text-white">503A pharmacy</span>.
        </p>

        {/* Frosted glass pill holding both CTAs (the original hero's container). */}
        <div className={`mt-7 flex ${enter(2).className}`} style={enter(2).style}>
          <div
            className="flex items-center gap-1 rounded-full p-1.5"
            style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            <Link
              href="/start"
              className="rounded-full bg-accent px-5 py-3 text-center text-sm font-semibold text-black transition-colors hover:bg-accent-soft sm:px-7"
            >
              Start Your Assessment
            </Link>
            <Link
              href="/shop"
              className="rounded-full px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:px-7"
            >
              Shop all
            </Link>
          </div>
        </div>
      </div>

      {/* Quality-standards strip, sitting on the video just above the ticker */}
      <div className="absolute inset-x-0 bottom-8 z-20">
        <StandardsMarquee />
      </div>

      <Ticker reduced={reduced} />
    </section>
  );
}

/** Slow ticker along the bottom edge, with a pause control (David pattern). */
function Ticker({ reduced }: { reduced: boolean }) {
  const [paused, setPaused] = useState(false);
  const stopped = paused || reduced;
  const row = TICKER.map((t) => (
    <span key={t} className="flex shrink-0 items-center gap-2 pr-2">
      <span aria-hidden>•</span>
      {t}
    </span>
  ));

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex h-8 items-center overflow-hidden bg-black text-[12px] text-white/90">
      <div
        aria-hidden
        className="flex whitespace-nowrap will-change-transform"
        style={{ animation: 'marquee 60s linear infinite', animationPlayState: stopped ? 'paused' : 'running' }}
      >
        {/* Two identical halves so the -50% loop is seamless */}
        {[0, 1].map((half) => (
          <div key={half} className="flex">
            {[0, 1, 2].map((rep) => (
              <div key={rep} className="flex">{row}</div>
            ))}
          </div>
        ))}
      </div>
      <p className="sr-only">{TICKER.join(' · ')}</p>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={stopped ? 'Play ticker' : 'Pause ticker'}
        className="absolute right-2 grid h-5 w-5 place-items-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
      >
        <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
          {stopped ? <path d="M2 1l7 4-7 4z" /> : <path d="M2 1h2v8H2zM6 1h2v8H6z" />}
        </svg>
      </button>
    </div>
  );
}
