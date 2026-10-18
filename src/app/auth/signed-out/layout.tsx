import type { Metadata } from 'next';

// The page itself is a client component (it clears this browser's saved answers), so its metadata lives here.
export const metadata: Metadata = { title: 'Signed out', robots: { index: false, follow: false } };

export default function SignedOutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
