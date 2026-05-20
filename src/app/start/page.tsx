import type { Metadata } from 'next';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { IntakeWizard } from '@/components/intake/IntakeWizard';
import { LoopVideo } from '@/components/ui/LoopVideo';

export const metadata: Metadata = {
  title: 'Start Your Assessment | Eternal Longevity',
  description:
    'Begin your physician-supervised peptide protocol with a 3-minute health assessment.',
};

export default function StartPage() {
  return (
    <>
      <Header />
      <main className="relative bg-background min-h-screen overflow-hidden">
        {/* Ambient hero video. Dimmed, anchored at the top, fades into bg */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] md:h-[70vh] -z-10">
          <LoopVideo src="/videos/4.mp4" className="absolute inset-0 w-full h-full" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background"
          />
        </div>

        {/* Subtle gold halo top */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/4 left-1/2 h-[40vh] w-[60vh] -translate-x-1/2 rounded-full bg-accent/[0.10] blur-[100px]"
        />

        <IntakeWizard />
      </main>
      <Footer />
    </>
  );
}
