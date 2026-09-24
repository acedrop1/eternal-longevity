import { Header } from '@/components/nav/Header';
import { Hero } from '@/components/sections/Hero';
import { IntroPanel } from '@/components/sections/IntroPanel';
import { ProductRail } from '@/components/sections/ProductRail';
import { Process } from '@/components/sections/Process';
import { Physician } from '@/components/sections/Physician';
import { PriceChart } from '@/components/sections/PriceChart';
import { Reviews } from '@/components/sections/Reviews';
import { HomeFAQ } from '@/components/sections/HomeFAQ';
import { Footer } from '@/components/sections/Footer';

export default function Home() {
  return (
    <>
      <Header categoryStrip />
      <main>
        {/* Sticky-Hero scope: the video stays pinned while the rounded
            IntroPanel card and then the best sellers slide up over it. The
            card alone is shorter than a screen, so the rail sits in the same
            scope to finish covering the video before the Hero releases. */}
        <div className="relative">
          <Hero />
          <IntroPanel />
          <div className="relative z-10">
            <ProductRail />
          </div>
        </div>
        <Process />
        <Physician />
        <PriceChart />
        <Reviews />           {/* local preview only: renders nothing in production */}
        <HomeFAQ />
      </main>
      <div className="bg-white">
        <Footer />
      </div>
    </>
  );
}
