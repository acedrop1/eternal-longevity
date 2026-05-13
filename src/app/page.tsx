import { Header } from '@/components/nav/Header';
import { Hero } from '@/components/sections/Hero';
import { IntroPanel } from '@/components/sections/IntroPanel';
import { FeaturedProtocol } from '@/components/sections/FeaturedProtocol';
import { Pillars } from '@/components/sections/Pillars';
import { Science } from '@/components/sections/Science';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { Testimonials } from '@/components/sections/Testimonials';
import { Comparison } from '@/components/sections/Comparison';
import { FeatureSpotlight } from '@/components/sections/FeatureSpotlight';
import { Footer } from '@/components/sections/Footer';
import { StickyLeadCapture } from '@/components/lead-capture/StickyLeadCapture';
import { SectionReveal } from '@/components/ui/SectionReveal';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* Sticky-Hero scope: Hero stays pinned ONLY while the user scrolls
            through the IntroPanel reveal. Once this container scrolls past,
            the Hero releases — no more video peeking through later sections. */}
        <div className="relative">
          <Hero />
          <IntroPanel />           {/* Rounded-top card: teal bar + press marquee + animated text */}
        </div>
        {/* Wrap each subsequent section in SectionReveal so it fades + rises into view */}
        <SectionReveal><FeaturedProtocol /></SectionReveal>     {/* Saki Tea Maker Pro drag carousel */}
        <SectionReveal><Pillars /></SectionReveal>              {/* Premium expandable rows */}
        <SectionReveal><Science /></SectionReveal>              {/* POUCH sticky-scroll science section */}
        <SectionReveal><HowItWorks /></SectionReveal>
        <SectionReveal><Testimonials /></SectionReveal>         {/* Eight Sleep "trusted reviews" masonry */}
        <SectionReveal><Comparison /></SectionReveal>           {/* POUCH Sip vs Drip comparison table */}
        <SectionReveal><FeatureSpotlight /></SectionReveal>     {/* Eight Sleep scroll-pinned spotlight */}
      </main>
      <Footer />
      <StickyLeadCapture />
    </>
  );
}
