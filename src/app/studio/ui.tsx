'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Flag, MessageCircle, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BRAND_LABEL,
  KIND_LABEL,
  STATUS_LABEL,
  isFinished,
  todayET,
  type Brand,
  type Status,
  type StudioItem,
} from '@/lib/studio-types';

/* iOS-style building blocks, in the brand's butter and ink. */

export const BRAND_COLOR: Record<Brand, string> = {
  longevity: '#F7DD74',
  hair: '#CFC4F6',
  both: 'linear-gradient(135deg, #F7DD74 50%, #CFC4F6 50%)',
};

/** True on a computer-sized screen (the sidebar layout). */
export function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(min-width: 1024px)');
    const on = () => setWide(q.matches);
    on();
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return wide;
}

export function BrandDot({ brand, className }: { brand: Brand; className?: string }) {
  return (
    <span
      title={BRAND_LABEL[brand]}
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10', className)}
      style={{ background: BRAND_COLOR[brand] }}
    />
  );
}

const BRAND_TONE: Record<Brand, string> = {
  longevity: 'bg-butter text-ink',
  hair: 'bg-lilac text-ink',
  both: 'text-ink',
};

/** Which brand it's for, impossible to miss. */
export function BrandTag({ brand, className }: { brand: Brand; className?: string }) {
  return (
    <span
      className={cn('inline-flex h-[22px] shrink-0 items-center rounded-full px-2 text-[12px] font-bold normal-case tracking-normal', BRAND_TONE[brand], className)}
      style={brand === 'both' ? { background: 'linear-gradient(90deg, #FFEC9F, #CFC4F6)' } : undefined}
    >
      {brand === 'both' ? 'Collab · both brands' : BRAND_LABEL[brand]}
    </span>
  );
}

const STATUS_TONE: Record<Status, string> = {
  todo: 'bg-black/[0.05] text-ink/60',
  doing: 'bg-sky/60 text-ink',
  review: 'bg-butter text-ink',
  changes: 'bg-peach/70 text-ink',
  approved: 'bg-emerald-100 text-emerald-800',
  scheduled: 'bg-lilac/60 text-ink',
  posted: 'bg-ink text-white',
  done: 'bg-ink text-white',
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={cn('inline-flex h-[22px] shrink-0 items-center rounded-full px-2 text-[12px] font-semibold normal-case tracking-normal', STATUS_TONE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function LargeTitle({ eyebrow, title, sub, children }: { eyebrow?: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <header className="px-5 pb-4 pt-2 lg:px-0 lg:pb-6 lg:pt-8">
      {eyebrow && <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-ink/40">{eyebrow}</p>}
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.025em] lg:text-[40px]">{title}</h1>
        {children}
      </div>
      {sub && <p className="mt-1.5 max-w-[60ch] text-[15px] leading-relaxed text-ink-soft">{sub}</p>}
    </header>
  );
}

/** Groups flow into two columns on a computer. */
export function Columns({ children }: { children: ReactNode }) {
  return <div className="lg:columns-2 lg:gap-6">{children}</div>;
}

export function Group({ title, count, children, footer }: { title?: string; count?: number; children: ReactNode; footer?: string }) {
  return (
    <section className="break-inside-avoid px-4 pb-6 lg:px-0">
      {title && (
        <h2 className="flex items-center gap-2 px-4 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-ink/45">
          {title}
          {count !== undefined && <span className="text-ink/30">{count}</span>}
        </h2>
      )}
      <div className="overflow-hidden rounded-[14px] bg-white shadow-[0_1px_0_rgba(17,17,17,0.04)]">{children}</div>
      {footer && <p className="px-4 pt-1.5 text-[13px] text-ink/40">{footer}</p>}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-5 text-center text-[15px] text-ink/40">{children}</p>;
}

/** "Today", "Tomorrow", "Yesterday", "Friday", "Nov 8". */
export function dayLabel(d: string, today = todayET()): string {
  const diff = Math.round((Date.parse(d) - Date.parse(today)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const date = new Date(`${d}T12:00:00`);
  return date.toLocaleDateString('en-US', diff > 1 && diff < 7 ? { weekday: 'long' } : { month: 'short', day: 'numeric' });
}

/** A day heading people can't misread: "Today · Wed, Oct 28", "Tomorrow · Thu, Oct 29", "Friday · Oct 30". */
export function dayTitle(d: string, today = todayET()): string {
  const date = new Date(`${d}T12:00:00`);
  const md = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const wd = date.toLocaleDateString('en-US', { weekday: 'long' });
  const diff = Math.round((Date.parse(d) - Date.parse(today)) / 86_400_000);
  if (diff === 0) return `Today · ${wd.slice(0, 3)}, ${md}`;
  if (diff === 1) return `Tomorrow · ${wd.slice(0, 3)}, ${md}`;
  return `${wd} · ${md}`;
}

/** Open work as Late, then one group per due day, then undated. */
export function byDay(open: StudioItem[], today = todayET(), until?: string): { title: string; items: StudioItem[] }[] {
  const dated = open.filter((i) => i.due && i.due >= today && (!until || i.due <= until));
  const days = [...new Set(dated.map((i) => i.due!))].sort();
  return [
    { title: 'Late', items: open.filter((i) => i.due && i.due < today) },
    ...days.map((d) => ({ title: dayTitle(d, today), items: dated.filter((i) => i.due === d) })),
    ...(until ? [] : [{ title: 'No date yet', items: open.filter((i) => !i.due) }]),
  ];
}

/** "Thu, Oct 29". */
export const longDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export function CheckCircle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={on ? `Mark “${label}” not done` : `Mark “${label}” done`}
      aria-pressed={on}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="-m-2 grid h-11 w-11 shrink-0 place-items-center"
    >
      <span
        className={cn(
          'grid h-[24px] w-[24px] place-items-center rounded-full transition-all',
          on ? 'bg-butter-deep text-ink' : 'ring-[1.5px] ring-ink/25 hover:ring-ink/50',
        )}
      >
        {on && <Check className="h-[15px] w-[15px]" strokeWidth={3} />}
      </span>
    </button>
  );
}

/** One item in a list: check, what it is, the first line of what to do, then due, who and status. */
export function ItemRow({
  item,
  onOpen,
  onToggle,
  showStatus = true,
}: {
  item: StudioItem;
  onOpen: () => void;
  onToggle?: () => void;
  showStatus?: boolean;
}) {
  const today = todayET();
  const done = isFinished(item.status);
  const late = !!item.due && item.due < today && !done;
  const thumb = item.files.find((f) => f.url && f.type.startsWith('image/'));
  const brief = item.notes.split('\n').find((l) => l.trim())?.trim();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
      className="group relative flex min-h-[64px] w-full cursor-pointer items-start gap-3 py-3 pl-5 pr-4 text-left transition-colors hover:bg-black/[0.015] active:bg-black/[0.03] [&+&]:border-t [&+&]:border-black/[0.06]"
    >
      <span aria-hidden className="absolute inset-y-2 left-1.5 w-[4px] rounded-full" style={{ background: BRAND_COLOR[item.brand] }} />
      {onToggle && (
        <span className="pt-0.5">
          <CheckCircle on={done} onToggle={onToggle} label={item.title} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn('line-clamp-2 text-[16px] font-medium leading-snug', done && 'text-ink/35 line-through')}>
          {item.flagged && !done && <Flag className="mr-1 inline h-3.5 w-3.5 -translate-y-px fill-orange-500 text-orange-500" />}
          {item.title}
        </p>
        {brief && !done && <p className="mt-0.5 line-clamp-1 text-[14px] leading-snug text-ink/55">{brief}</p>}
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-ink/45">
          <BrandTag brand={item.brand} />
          <span>{KIND_LABEL[item.kind]}</span>
          {item.due && (
            <span className={cn(late && 'font-semibold text-red-600')}>
              {late ? 'Late · ' : 'Due '}
              {dayLabel(item.due, today)}
            </span>
          )}
          {item.assignee && <span>for {item.assignee}</span>}
          {done && item.completedBy && <span className="font-semibold text-ink/60">✓ done by {item.completedBy}</span>}
          {(item.files.length > 0 || item.links.length > 0) && <span className="inline-flex items-center gap-0.5"><Paperclip className="h-3.5 w-3.5" />{item.files.length + item.links.length}</span>}
          {item.comments.length > 0 && <span className="inline-flex items-center gap-0.5"><MessageCircle className="h-3.5 w-3.5" />{item.comments.length}</span>}
          {showStatus && item.status !== 'todo' && !done && <StatusPill status={item.status} />}
        </p>
      </div>
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb.url} alt="" className="h-12 w-12 shrink-0 rounded-[8px] object-cover" />
      )}
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink/25" />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('flex rounded-[10px] bg-black/[0.06] p-[3px]', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-[32px] flex-1 rounded-[8px] px-2 text-[13px] font-semibold transition-all',
            o.value === value ? 'bg-white text-ink shadow-[0_2px_6px_rgba(17,17,17,0.12)]' : 'text-ink/55 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; dot?: Brand }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-colors',
            o.value === value ? 'bg-ink text-white' : 'bg-white text-ink/70 ring-1 ring-black/[0.06] hover:text-ink',
          )}
        >
          {o.dot && <BrandDot brand={o.dot} className="h-2 w-2" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Text with its links made tappable. */
export function Linkified({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return (
    <p className={cn('whitespace-pre-wrap break-words', className)}>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-ink underline decoration-butter-deep decoration-2 underline-offset-2">
            {p.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48)}
          </a>
        ) : (
          p
        ),
      )}
    </p>
  );
}

/** Slides up from the bottom on a phone; a panel from the right on a computer. */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const wide = useWide();
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const hidden = wide ? { x: '100%' } : { y: '100%' };
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-stretch lg:justify-end" role="dialog" aria-modal="true" aria-label={label}>
          <motion.div
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative flex max-h-[calc(100dvh-env(safe-area-inset-top)-12px)] w-full flex-col overflow-hidden rounded-t-[22px] bg-milk shadow-[0_-12px_40px_-12px_rgba(17,17,17,0.35)] sm:max-w-[600px] lg:h-full lg:max-h-none lg:max-w-[600px] lg:rounded-none lg:rounded-l-[22px]"
            initial={hidden}
            animate={{ x: 0, y: 0 }}
            exit={hidden}
            transition={{ type: 'spring', damping: 34, stiffness: 380 }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function SheetBar({ left, title, right }: { left?: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="relative flex h-[56px] shrink-0 items-center justify-between border-b border-black/[0.06] bg-milk/90 px-2 backdrop-blur-xl">
      <div className="min-w-[72px]">{left}</div>
      <p className="pointer-events-none absolute inset-x-0 text-center text-[17px] font-semibold">{title}</p>
      <div className="flex min-w-[72px] justify-end">{right}</div>
    </div>
  );
}

export function BarButton({ children, onClick, bold, disabled }: { children: ReactNode; onClick: () => void; bold?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn('relative z-10 min-h-[44px] rounded-full px-3 text-[17px] text-ink hover:bg-black/[0.04] disabled:opacity-30', bold && 'font-semibold')}
    >
      {children}
    </button>
  );
}
