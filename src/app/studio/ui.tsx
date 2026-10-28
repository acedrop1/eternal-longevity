'use client';

import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BRAND_LABEL,
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

export function BrandDot({ brand, className }: { brand: Brand; className?: string }) {
  return (
    <span
      title={BRAND_LABEL[brand]}
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10', className)}
      style={{ background: BRAND_COLOR[brand] }}
    />
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
    <span className={cn('inline-flex h-[22px] items-center rounded-full px-2 text-[12px] font-semibold', STATUS_TONE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function LargeTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="px-5 pb-3 pt-2">
      {eyebrow && <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-ink/40">{eyebrow}</p>}
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.025em]">{title}</h1>
        {children}
      </div>
    </header>
  );
}

export function Group({ title, count, children, footer }: { title?: string; count?: number; children: ReactNode; footer?: string }) {
  return (
    <section className="px-4 pb-6">
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

/** "Oct 28", "Today", "Tomorrow", "Yesterday". */
export function dayLabel(d: string, today = todayET()): string {
  const diff = Math.round((Date.parse(d) - Date.parse(today)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const date = new Date(`${d}T12:00:00`);
  return date.toLocaleDateString('en-US', diff > 1 && diff < 7 ? { weekday: 'long' } : { month: 'short', day: 'numeric' });
}

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
          on ? 'bg-butter-deep text-ink' : 'ring-[1.5px] ring-ink/25',
        )}
      >
        {on && <Check className="h-[15px] w-[15px]" strokeWidth={3} />}
      </span>
    </button>
  );
}

/** One item in a list: check, title, the facts that matter, chevron. */
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
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
      className="group flex min-h-[60px] w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-black/[0.03] [&+&]:border-t [&+&]:border-black/[0.06]"
    >
      {onToggle && <CheckCircle on={done} onToggle={onToggle} label={item.title} />}
      <div className="min-w-0 flex-1">
        <p className={cn('line-clamp-2 text-[16px] leading-snug', done && 'text-ink/35 line-through')}>
          {item.flagged && !done && <Flag className="mr-1 inline h-3.5 w-3.5 -translate-y-px fill-orange-500 text-orange-500" />}
          {item.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink/45">
          <BrandDot brand={item.brand} />
          {item.due && <span className={cn(late && 'font-semibold text-red-600')}>{dayLabel(item.due, today)}</span>}
          {item.assignee && <span>{item.assignee}</span>}
          {(item.files.length > 0 || item.links.length > 0) && <span>{item.files.length + item.links.length} attached</span>}
          {item.comments.length > 0 && <span>{item.comments.length} {item.comments.length === 1 ? 'note' : 'notes'}</span>}
          {showStatus && item.status !== 'todo' && !done && <StatusPill status={item.status} />}
        </p>
      </div>
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb.url} alt="" className="h-11 w-11 shrink-0 rounded-[8px] object-cover" />
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-ink/25" />
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
            o.value === value ? 'bg-white text-ink shadow-[0_2px_6px_rgba(17,17,17,0.12)]' : 'text-ink/55',
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
    <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-colors',
            o.value === value ? 'bg-ink text-white' : 'bg-white text-ink/70 ring-1 ring-black/[0.06]',
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

/** A card that slides up from the bottom (full height on a phone, centred on a computer). */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={label}>
          <motion.div
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative flex max-h-[calc(100dvh-env(safe-area-inset-top)-12px)] w-full flex-col overflow-hidden rounded-t-[22px] bg-milk shadow-[0_-12px_40px_-12px_rgba(17,17,17,0.35)] sm:max-h-[88dvh] sm:max-w-[560px] sm:rounded-[22px]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
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
      className={cn('relative z-10 min-h-[44px] rounded-full px-3 text-[17px] text-ink disabled:opacity-30', bold && 'font-semibold')}
    >
      {children}
    </button>
  );
}
