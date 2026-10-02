import type { ReactNode } from 'react';
import type { NavItem } from '@/components/portal/PortalNav';
import { cn } from '@/lib/utils';

/**
 * Small shared pieces for the portal, in the public site's language: white
 * ground, milk panels (rounded-shell), white inner rows (rounded-inner), ink
 * pill buttons, butter only for the one main call to action.
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
  { label: 'Check-ins', href: '/portal/admin/checkins' },
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
  { label: 'Shop', href: '/shop' },
  { label: 'Orders', href: '/portal/orders' },
  { label: 'Messages', href: '/portal/messages' },
  { label: 'Subscriptions', href: '/portal/subscriptions' },
  { label: 'Account', href: '/portal/account' },
];

export const panel = 'rounded-shell bg-milk';
/** An inner row on a milk panel. */
export const inset = 'rounded-inner bg-white ring-1 ring-ink/5';

const btn =
  'inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 md:min-h-[40px]';
export const btnPrimary = cn(btn, 'bg-ink text-white hover:bg-ink/85');
export const btnSecondary = cn(btn, 'bg-white text-ink ring-1 ring-ink/10 hover:bg-milk');
export const btnDanger = cn(btn, 'bg-white text-red-700 ring-1 ring-red-600/25 hover:bg-red-50');
/** The one main call to action on a screen: butter. */
export const btnCta = cn(btn, 'bg-butter text-ink hover:bg-butter-deep');
/** Compact row action (Make default, Remove). */
export const btnSmall =
  'inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium ring-1 transition-colors disabled:opacity-40 md:min-h-[32px]';

export const field =
  'w-full rounded-inner bg-white px-4 py-3 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/40 transition-shadow focus:outline-none focus:ring-2 focus:ring-ink/30';
export const fieldLabel = 'mb-2 block text-[13px] font-medium text-ink/70';
export const errorBox =
  'rounded-inner bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-800 ring-1 ring-red-600/15';

export function PageHeader({ title, intro }: { title: ReactNode; intro?: ReactNode }) {
  return (
    <header>
      <h1 className="text-[32px] font-semibold leading-[1] tracking-[-0.04em] text-ink [text-wrap:balance] md:text-[44px]">
        {title}
      </h1>
      {intro && <p className="mt-3 max-w-[68ch] text-[16px] leading-relaxed text-ink-soft">{intro}</p>}
    </header>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[26px]', className)}>
      {children}
    </h2>
  );
}

/* Status chips: a dot and a label, so the meaning never rides on colour alone. */
export type Tone = 'neutral' | 'gold' | 'success' | 'warn' | 'info' | 'error' | 'muted';

const TONE: Record<Tone, { chip: string; dot: string }> = {
  neutral: { chip: 'bg-ink/[0.05] text-ink/80', dot: 'bg-ink/45' },
  gold: { chip: 'bg-butter-soft text-ink ring-1 ring-inset ring-butter-deep/60', dot: 'bg-amber-400' },
  success: { chip: 'bg-emerald-50 text-emerald-900', dot: 'bg-emerald-600' },
  warn: { chip: 'bg-amber-50 text-amber-900', dot: 'bg-amber-500' },
  info: { chip: 'bg-sky-50 text-sky-900', dot: 'bg-sky-600' },
  error: { chip: 'bg-red-50 text-red-800', dot: 'bg-red-600' },
  muted: { chip: 'bg-ink/[0.04] text-ink/55', dot: 'bg-ink/25' },
};

export function StatusChip({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium leading-none',
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
      <p className="mx-auto max-w-md text-[15px] leading-relaxed text-ink-soft">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
