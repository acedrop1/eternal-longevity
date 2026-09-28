import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { SITE_DESCRIPTION } from '@/lib/site';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import {
  Beliefs,
  BestSellers,
  Campaign,
  ClosingBand,
  HomeFAQ,
  HomeHero,
  HowItWorks,
  PhysicianCard,
  ShopByGoal,
  Ticker,
  TrustRow,
} from '@/components/home/HomeSections';

export const metadata: Metadata = pageMeta('/', null, SITE_DESCRIPTION);

export default function Home() {
  return (
    <>
      <Header overlay categoryStrip />
      <main className="bg-white">
        <HomeHero />
        <TrustRow />
        <Ticker />
        <BestSellers />
        <ShopByGoal />
        <Beliefs />
        <Campaign />
        <HowItWorks />
        <PhysicianCard />
        <HomeFAQ />
        <ClosingBand />
      </main>
      <Footer />
    </>
  );
}
