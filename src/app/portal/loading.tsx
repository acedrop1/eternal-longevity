import { PageSkeleton } from '@/components/ui/PageSkeleton';

export default function Loading() {
  return (
    <main className="theme-light min-h-screen bg-background">
      <PageSkeleton />
    </main>
  );
}
