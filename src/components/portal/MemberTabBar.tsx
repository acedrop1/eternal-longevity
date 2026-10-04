'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const icon = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  treatments: (
    <>
      <rect x="6" y="7" width="12" height="14" rx="2.5" />
      <path d="M7.5 3h9v4h-9zM6 12h12" />
    </>
  ),
  messages: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z" />,
  account: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

/*
 * Treatments opens the plans page: what a member is on and when it next
 * refills. Orders sit under it (and are linked from it), so an order's page
 * keeps this tab lit.
 */
const TABS = [
  { label: 'Home', href: '/portal', icon: icon.home, match: (p: string) => p === '/portal' },
  {
    label: 'Treatments',
    href: '/portal/subscriptions',
    icon: icon.treatments,
    match: (p: string) => p.startsWith('/portal/subscriptions') || p.startsWith('/portal/orders'),
  },
  { label: 'Messages', href: '/portal/messages', icon: icon.messages, match: (p: string) => p.startsWith('/portal/messages') },
  { label: 'Account', href: '/portal/account', icon: icon.account, match: (p: string) => p.startsWith('/portal/account') },
];

/**
 * Members' phone navigation: a fixed bar of four tabs, under md only. Hidden
 * on the visit page, whose own sticky Continue bar sits at the bottom.
 */
export function MemberTabBar({ messagesDot = false }: { messagesDot?: boolean }) {
  const pathname = usePathname() ?? '';
  if (pathname.startsWith('/portal/visit')) return null;
  return (
    <nav
      aria-label="Portal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/90 backdrop-blur-2xl backdrop-saturate-150 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
        {TABS.map((t) => {
          const on = t.match(pathname);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'flex h-full min-h-[44px] flex-col items-center justify-center gap-1 text-[12px] font-semibold tracking-[-0.01em] transition-colors',
                  on ? 'text-ink' : 'text-ink/60 hover:text-ink',
                )}
              >
                <span className="relative">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill={on ? 'rgb(255 236 159)' : 'none'}
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {t.icon}
                  </svg>
                  {t.label === 'Messages' && messagesDot && (
                    <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white" />
                  )}
                </span>
                {t.label}
                {t.label === 'Messages' && messagesDot && <span className="sr-only">(reply waiting)</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
