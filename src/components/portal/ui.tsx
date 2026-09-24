import type { ReactNode } from 'react';
import type { NavItem } from '@/components/portal/PortalNav';
import { cn } from '@/lib/utils';

/**
 * Small shared pieces for the member portal, in the public site's language
 * (MessageForm, BuyBar, the shop): white ground, #F2F2F0 panels, black pill
 * buttons in mono, sharp 4px/2px corners, gold only as a small highlight.
 */

/** The member nav, one list so the pages can't drift apart. */
/** The admin nav, one list so the admin pages can't drift apart. */
export const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', href: '/portal/admin' },
  { label: 'Members', href: '/portal/admin/members' },
  { label: 'Applications', href: '/portal/admin/queue' },
  { label: 'Messages', href: '/portal/admin/messages' },
  { label: 'Billing', href: '/portal/admin/billing' },
  { label: 'Orders', href: '/portal/admin/fulfillment' },
  { label: 'Products', href: '/portal/admin/products' },
  { label: 'Compliance', href: '/portal/admin/compliance' },
  { label: 'Settings', href: '/portal/admin/settings' },
];

/** The prescriber's nav, one list so the doctor pages can't drift apart. */
export const DOCTOR_NAV: NavItem[] = [
  { label: 'Queue', href: '/portal/doctor' },
  { label: 'Orders', href: '/portal/doctor/fulfillment' },
  { label: 'Messages', href: '/portal/doctor/messages' },
  { label: 'My signed Rx', href: '/portal/doctor/history' },
  { label: 'Profile', href: '/portal/doctor/profile' },
];

export const MEMBER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/portal' },
  { label: 'Shop', href: '/portal/shop' },
  { label: 'Orders', href: '/portal/orders' },
  { label: 'Messages', href: '/portal/messages' },
  { label: 'Subscriptions', href: '/portal/subscriptions' },
  { label: 'Account', href: '/portal/account' },
];

export const panel = 'rounded-[4px] bg-[#F2F2F0]';
/** An inner row on a grey panel. */
export const inset = 'rounded-[2px] bg-white ring-1 ring-black/10';

const btn =
  'inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 font-mono text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 md:min-h-[40px]';
export const btnPrimary = cn(btn, 'bg-black text-white hover:bg-black/85');
export const btnSecondary = cn(btn, 'bg-white text-black ring-1 ring-black/15 hover:bg-black/[0.04]');
export const btnDanger = cn(btn, 'bg-white text-red-800 ring-1 ring-red-700/30 hover:bg-red-50');
/** Compact row action (Make default, Remove). */
export const btnSmall =
  'inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full px-3.5 font-mono text-[12px] ring-1 transition-colors disabled:opacity-40 md:min-h-[32px]';

export const field =
  'w-full rounded-[2px] bg-white px-4 py-3 text-[16px] text-black ring-1 ring-black/15 placeholder:text-black/35 transition-shadow focus:outline-none focus:ring-2 focus:ring-black';
export const fieldLabel = 'mb-2 block font-mono text-[13px] text-black/70';
export const errorBox =
  'rounded-[2px] bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-800 ring-1 ring-red-700/20';

const displayStyle = (size: string, lineHeight = 1.05) =>
  ({ fontSize: size, fontStretch: '75%', lineHeight }) as const;

export function PageHeader({ title, intro }: { title: ReactNode; intro?: ReactNode }) {
  return (
    <header>
      <h1 className="font-display font-normal text-black" style={displayStyle('clamp(2rem, 2vw + 1rem, 3rem)')}>
        {title}
      </h1>
      {intro && <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-black/70">{intro}</p>}
    </header>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn('font-display font-normal text-black', className)} style={displayStyle('1.5rem', 1.1)}>
      {children}
    </h2>
  );
}

/* Status chips: a dot and a label, so the meaning never rides on colour alone. */
export type Tone = 'neutral' | 'gold' | 'success' | 'warn' | 'info' | 'error' | 'muted';

const TONE: Record<Tone, { chip: string; dot: string }> = {
  neutral: { chip: 'bg-black/[0.05] text-black/80', dot: 'bg-black/45' },
  gold: { chip: 'bg-black/[0.05] text-black', dot: 'bg-[#D5A850]' },
  success: { chip: 'bg-emerald-50 text-emerald-900', dot: 'bg-emerald-600' },
  warn: { chip: 'bg-amber-50 text-amber-900', dot: 'bg-amber-500' },
  info: { chip: 'bg-sky-50 text-sky-900', dot: 'bg-sky-600' },
  error: { chip: 'bg-red-50 text-red-800', dot: 'bg-red-600' },
  muted: { chip: 'bg-black/[0.04] text-black/55', dot: 'bg-black/25' },
};

export function StatusChip({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] px-2 py-1 font-mono text-[12px] leading-none',
        t.chip,
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 flex-none rounded-full', t.dot)} />
      {children}
    </span>
  );
}

/** 'SHIPPED' -> 'Shipped'. Status labels in lib are upper case. */
export const sentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** One plain sentence and one action. */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className={cn(panel, 'px-6 py-10 text-center')}>
      <p className="mx-auto max-w-md text-[15px] leading-relaxed text-black/70">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
