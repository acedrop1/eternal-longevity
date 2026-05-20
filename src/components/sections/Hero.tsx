import Link from 'next/link';

/**
 * Dark cinematic hero with looping video background.
 *
 * Entrance animations are CSS-driven (anim-fade-up + delay utilities)
 * so they don't depend on framer-motion's hydration lifecycle.
 *
 * Background: /public/2.mp4 (autoplay, muted, loop, plays inline).
 * Layered with a dark vignette + a slow-drifting gold halo (Saki pattern)
 * so headline copy stays readable without burying the video.
 */
export function Hero() {
  return (
    <section className="sticky top-0 isolate z-0 min-h-[100svh] overflow-hidden bg-background">
      {/* Looping background video */}
      <video
        key="hero-video"
        className="absolute inset-0 h-full w-full object-cover"
        src="/2.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controls={false}
      />


      {/* Darken layer for readability. Kept light so the video shows through */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-black/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background"
      />

      {/* Drifting gold halo (Saki pattern) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[80vh] w-[80vh] -translate-x-1/2 rounded-full bg-accent/[0.05] blur-[120px] anim-halo"
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
        <p className="mb-6 text-[11px] tracking-widest text-accent anim-fade-up d-1">
          PHYSICIAN-SUPERVISED · LONGEVITY PROTOCOLS
        </p>

        <h1
          className="font-bold tracking-tight text-white anim-fade-up d-2"
          style={{
            fontSize: 'clamp(3rem, 9vw, 8.5rem)',
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            textShadow: '0 4px 40px rgba(0,0,0,0.5)',
          }}
        >
          ETERNAL
          <br />
          LONGEVITY
        </h1>

        <p
          className="mt-6 max-w-xl text-base text-white/85 anim-fade-up d-3"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
        >
          Performance, recovery, longevity. Engineered into every protocol,
          reviewed and signed by a licensed physician.
        </p>

        {/* Pill-pair CTA (Protocole pattern). Stacks on mobile, joined on desktop */}
        <div className="mt-10 flex items-center anim-fade-up d-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-px rounded-3xl sm:rounded-full p-2 sm:p-1.5"
            style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            <span className="pill text-xs sm:text-sm text-white/95 px-5 sm:px-6">
              NJ&apos;s first longevity clinic
            </span>
            <Link
              href="/start"
              className="pill bg-accent text-black px-6 sm:px-7 py-3 font-semibold hover:bg-accent-soft text-sm"
            >
              Start Your Assessment
            </Link>
          </div>
        </div>

        <p className="mt-6 text-xs tracking-wider text-white/70 anim-fade-in d-5">
          Reviewed by licensed physicians · 18+
        </p>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] tracking-widest text-white/70 anim-fade-in d-6">
        SCROLL
      </div>
    </section>
  );
}
