import Link from 'next/link';
import { cn } from '@/lib/utils';

// The brand logo ("eternal" over "longevity", from Eternal Longevity Branding/logo)
// used as a mask, so it takes the colour it sits on: ink on light, white over photos.
const MASK = 'url(/brand/logo.svg) center / contain no-repeat';

/** Sized by font-size (className text-[..]), like the text wordmark it replaced. */
export function Wordmark({ className, href = '/' }: { className?: string; href?: string | null }) {
  const mark = (
    <span
      role="img"
      aria-label="Eternal Longevity"
      className={cn('inline-block aspect-[797.56/263.9] h-[1.35em] select-none bg-current', className)}
      style={{ mask: MASK, WebkitMask: MASK }}
    />
  );
  return href ? (
    <Link href={href} aria-label="Eternal Longevity home" className="inline-flex items-center">
      {mark}
    </Link>
  ) : (
    mark
  );
}
