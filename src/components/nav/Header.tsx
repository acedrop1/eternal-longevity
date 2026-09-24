'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';
import { AnnouncementBar } from './AnnouncementBar';
import { useCatalog } from '@/components/catalog/CatalogProvider';

const NAV_LINKS = [
  { label: 'Shop', href: '/shop' },
  { label: 'About', href: '/about' },
  { label: 'FAQ', href: '/faq' },
];

/**
 * Header (David pattern): rotating announcement bar, then a solid black bar.
 *
 * Desktop: logo + inline links on the left; Login + a white "Apply Now" pill
 * on the right (David's Cart pill).
 * Mobile: menu icon + logo on the left; account icon + the same pill on the
 * right. Pages that ask for it get a product strip underneath, at every size.
 *
 * The announcement bar folds away once the page scrolls; the category strip
 * stays, so the product shortcuts are always one tap away.
 */
export function Header({ categoryStrip = false }: { categoryStrip?: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    // Frosted: 65% black keeps white text above 7:1 even over a white section.
    <header className="fixed inset-x-0 top-0 z-50 bg-black/65 text-white backdrop-blur-2xl backdrop-saturate-150">
      <AnnouncementBar collapsed={scrolled} />

      <div className="border-b border-white/10">
        <div className="flex h-12 items-center justify-between px-4 md:h-14 md:px-6">
          <div className="flex items-center gap-2 md:gap-8">
            <div className="md:hidden">
              <MobileMenu links={NAV_LINKS} />
            </div>
            <Logo variant="monogram" />
            <nav className="hidden items-center gap-6 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[13px] text-white/90 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <Link
              href="/login"
              className="hidden text-[13px] text-white/90 transition-colors hover:text-white md:inline"
            >
              Login
            </Link>
            <Link
              href="/login"
              aria-label="Login"
              className="grid h-9 w-9 place-items-center text-white/90 hover:text-white md:hidden"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
            <Link
              href="/start"
              className="rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-black transition-colors hover:bg-white/85"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </div>

      {categoryStrip && <CategoryStrip />}
    </header>
  );
}

/** Product strip under the header (46px). Swipes on mobile; the scroll bar
 *  only shows when the items overflow. */
function CategoryStrip() {
  const { showcase } = useCatalog();
  const CATEGORIES = [
    // The gold cap close-up from the hero video, so "Shop all" reads as the
    // brand rather than one product.
    { label: 'Shop all', href: '/shop' as string | null, img: '/hero-loop-poster.jpg' },
    ...showcase.map((p) => ({ label: p.name, href: p.href, img: p.image })),
  ];
  const ref = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ left: 0, width: 1 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setBar({
        left: el.scrollLeft / el.scrollWidth,
        width: Math.min(1, el.clientWidth / el.scrollWidth),
      });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="h-[46px] overflow-hidden border-b border-white/10">
      <div
        ref={ref}
        className="flex h-[43px] items-center gap-5 overflow-x-auto px-4 md:gap-8 md:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {CATEGORIES.map((c) => {
          const inner = (
            <>
              <span className="relative h-7 w-7 overflow-hidden rounded-[2px]">
                <Image src={c.img} alt="" fill sizes="28px" className="object-cover" />
              </span>
              {c.label}
            </>
          );
          // Local-preview products have no live page, so they don't link.
          return c.href ? (
            <Link key={c.label} href={c.href} className="flex shrink-0 items-center gap-2 text-[13px] text-white/90 transition-colors hover:text-white">
              {inner}
            </Link>
          ) : (
            <span key={c.label} className="flex shrink-0 items-center gap-2 text-[13px] text-white/50">
              {inner}
            </span>
          );
        })}
      </div>
      <div className={`relative h-[3px] ${bar.width < 1 ? 'bg-white/15' : ''}`}>
        <span
          className={`absolute inset-y-0 ${bar.width < 1 ? 'bg-white/60' : ''}`}
          style={{ left: `${bar.left * 100}%`, width: `${bar.width * 100}%` }}
        />
      </div>
    </div>
  );
}
