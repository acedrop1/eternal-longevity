'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { Wordmark } from './Wordmark';
import { MobileMenu } from './MobileMenu';
import { Search } from './Search';
import { ShopMenu } from './ShopMenu';
import { useListedCategories } from '@/components/lineup/Lineup';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Shop', href: '/shop' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'About', href: '/about' },
  { label: 'FAQ', href: '/faq' },
];

/**
 * Floating header: a rounded frosted bar, and on shopping pages a frosted
 * category strip under it (thumbnail + name), swipeable on phones. Over the
 * hero photo it runs clear glass with white type; once the page scrolls it
 * firms up to milky white so it reads over anything.
 */
export function Header({ categoryStrip = false, overlay = false }: { categoryStrip?: boolean; overlay?: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [shopOpen, setShopOpen] = useState(false);
  useEffect(() => {
    if (!shopOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShopOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shopOpen]);

  const onPhoto = overlay && !scrolled && !shopOpen;
  const glass = onPhoto
    ? 'bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-xl backdrop-saturate-150'
    : 'bg-white/70 text-ink shadow-[0_10px_40px_-16px_rgba(17,17,17,0.22)] ring-1 ring-white/70 backdrop-blur-2xl backdrop-saturate-150';

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-5 md:pt-4">
      <div className="relative mx-auto" onMouseLeave={() => setShopOpen(false)}>
        <div
          className={cn(
            'flex h-14 items-center justify-between rounded-inner px-3 transition-[background-color,box-shadow,color] duration-500 md:h-[60px] md:px-4',
            glass
          )}
        >
          <div className="flex items-center gap-2 md:gap-6">
            <div className="md:hidden">
              <MobileMenu links={NAV_LINKS} light={!onPhoto} />
            </div>
            {/* Deeper than butter (#FFEC9F) so the logo reads on the white bar. */}
            <Wordmark className={cn('text-[30px] md:text-[34px]', !onPhoto && 'text-[#F2D060]')} />
            <nav className="hidden items-center gap-1.5 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onMouseEnter={() => setShopOpen(link.href === '/shop')}
                  onFocus={() => setShopOpen(link.href === '/shop')}
                  onClick={() => setShopOpen(false)}
                  aria-expanded={link.href === '/shop' ? shopOpen : undefined}
                  className={cn(
                    'group flex items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5 text-[14px] font-semibold tracking-[-0.01em] transition-colors',
                    onPhoto ? 'bg-white/20 hover:bg-white/30' : 'bg-white/60 ring-1 ring-black/5 hover:bg-white'
                  )}
                >
                  {link.label}
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-butter text-ink transition-transform duration-300 group-hover:rotate-45">
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Search onPhoto={onPhoto} />
            {/* Phones get Log in from the menu, keeping room for search. */}
            <Link
              href="/login"
              aria-label="Log in"
              className={cn(
                'hidden h-10 w-10 place-items-center rounded-full transition-colors md:grid',
                onPhoto ? 'bg-white/20 hover:bg-white/30' : 'bg-white/70 ring-1 ring-black/5 hover:bg-white'
              )}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
            <Link
              href="/start"
              className="rounded-full bg-butter px-4 py-2.5 text-[13px] font-semibold text-ink shadow-[0_6px_20px_-8px_rgba(247,221,116,0.9)] transition-[background-color,transform] hover:-translate-y-px hover:bg-butter-deep md:px-5"
            >
              Get started
            </Link>
          </div>
        </div>

        {categoryStrip && <CategoryStrip glass={glass} onPhoto={onPhoto} />}
        <ShopMenu open={shopOpen} onClose={() => setShopOpen(false)} />
      </div>
    </header>
  );
}

/** Frosted category strip: Shop all + each category, current one highlighted. */
function CategoryStrip({ glass, onPhoto }: { glass: string; onPhoto: boolean }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  // On phones the strip scrolls sideways: bring the current category into view.
  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && navRef.current) navRef.current.scrollLeft = el.offsetLeft - 24;
  }, [pathname]);
  // Categories with something listed, plus the one being viewed.
  const cats = useListedCategories().filter((c) => c.items.length || pathname === `/treatments/${c.slug}`);
  const items = [
    { label: 'Shop all', href: '/shop', img: '/brand/family.jpg' },
    ...cats.map((c) => ({ label: c.name, href: `/treatments/${c.slug}`, img: c.image })),
  ];

  return (
    <div className={cn('mt-2 overflow-hidden rounded-inner transition-[background-color,box-shadow,color] duration-500', glass)}>
      <nav ref={navRef} aria-label="Categories" className="flex items-center gap-1 overflow-x-auto p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((c) => {
          const active = pathname === c.href;
          return (
            <Link
              key={c.href}
              href={c.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-thumb py-1 pl-1 pr-3.5 text-[13px] font-semibold tracking-[-0.01em] transition-colors',
                active ? (onPhoto ? 'bg-white/25 ring-1 ring-white/40' : 'bg-white ring-1 ring-ink/10') : onPhoto ? 'hover:bg-white/20' : 'hover:bg-white'
              )}
            >
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-thumb bg-milk">
                <Image src={c.img} alt="" fill sizes="32px" className="object-cover" />
              </span>
              <span className="whitespace-nowrap">{c.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
