import { Header } from '@/components/nav/Header';
import { Hero } from '@/components/sections/Hero';
import { IntroPanel } from '@/components/sections/IntroPanel';
import { ProductRail } from '@/components/sections/ProductRail';
import { Pillars } from '@/components/sections/Pillars';
import { Science } from '@/components/sections/Science';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { ClinicalBoard } from '@/components/sections/ClinicalBoard';
import { Comparison } from '@/components/sections/Comparison';
import { FeatureSpotlight } from '@/components/sections/FeatureSpotlight';
import { Footer } from '@/components/sections/Footer';
import { SectionReveal } from '@/components/ui/SectionReveal';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* Sticky-Hero scope: Hero stays pinned ONLY while the user scrolls
            through the IntroPanel reveal. Once this container scrolls past,
            the Hero releases. No more video peeking through later sections. */}
        <div className="relative">
          <Hero />
          <IntroPanel />           {/* Rounded-top card: teal bar + press marquee + animated text */}
        </div>
        {/*
         * Bands, not a gradient. The page alternates between committed dark
         * and committed light rather than settling on one mid-tone: the dark
         * stretches are the cinematic ones, where the scroll does the work,
         * and the light stretches are the ones you actually read and buy from.
         * A product, a price and a contraindication all want a light ground;
         * a video and a sticky reveal do not.
         */}
        <div className="theme-light">
          <SectionReveal><ProductRail /></SectionReveal>
          <SectionReveal><Pillars /></SectionReveal>
        </div>

        <SectionReveal><Science /></SectionReveal>              {/* POUCH sticky-scroll science section */}

        <div className="theme-light">
          <SectionReveal><HowItWorks /></SectionReveal>
          <SectionReveal><ClinicalBoard /></SectionReveal>
        </div>
        {/* Testimonials intentionally omitted until real, permissioned member
            quotes exist. The component remains in components/sections for
            when they do — see its header comment. */}
        <div className="theme-light">
          <SectionReveal><Comparison /></SectionReveal>
        </div>
        <SectionReveal><FeatureSpotlight /></SectionReveal>     {/* Eight Sleep scroll-pinned spotlight */}
      </main>
      <Footer />
    </>
  );
}
