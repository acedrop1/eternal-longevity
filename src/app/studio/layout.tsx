import type { Metadata, Viewport } from 'next';

// Private team tool: never indexed.
export const metadata: Metadata = {
  title: 'Studio',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'EL Studio', statusBarStyle: 'default' },
};

export const viewport: Viewport = { themeColor: '#F4F4F2' };

/** Apple's own type on Apple devices, Geist elsewhere. */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-dvh bg-milk text-ink antialiased"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", var(--font-geist), system-ui, sans-serif' }}
    >
      {children}
    </div>
  );
}
