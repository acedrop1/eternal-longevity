import { PageSkeleton } from '@/components/ui/PageSkeleton';

/**
 * PageSkeleton is theme-neutral and inherits its ground, so on a public page
 * that now runs light it would otherwise flash the body's black first.
 */
export default function Loading() {
  return (
    <main className="theme-light min-h-screen bg-background pt-24">
      <PageSkeleton />
    </main>
  );
}
