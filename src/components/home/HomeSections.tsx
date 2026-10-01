import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, FlaskConical, Plus, ShieldCheck, Sparkle, Stethoscope, Truck } from 'lucide-react';
import { getLiveProducts, type CatalogProduct } from '@/lib/catalog';
import { FAQS, withPrices } from '@/lib/faq';
import { LIST_DRAFTS, countLabel, fromPrice, listedCategories, listedItems } from '@/lib/lineup';
import { CategoryTile } from '@/components/lineup/Lineup';
import { cn } from '@/lib/utils';
import { SERVICE_AREA_SHORT } from '@/lib/site';

/* -------------------------------------------------------------------------- */
/*  Shared bits                                                                */
/* -------------------------------------------------------------------------- */

/** Frosted glass, the brand's surface. Needs colour or imagery behind it. */
export const GLASS =
  'bg-white/50 ring-1 ring-white/70 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_24px_60px_-34px_rgba(17,17,17,0.35),inset_0_1px_0_rgba(255,255,255,0.8)]';
export const GLASS_DARK = 'bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-xl backdrop-saturate-150';

type AuraMix = 'sunrise' | 'dusk' | 'bloom';
const AURAS: Record<AuraMix, string> = {
  sunrise:
    'radial-gradient(38% 55% at 12% 25%, rgba(255,236,159,0.55), transparent 70%), radial-gradient(32% 50% at 88% 20%, rgba(207,196,246,0.55), transparent 70%), radial-gradient(40% 55% at 60% 95%, rgba(255,201,168,0.45), transparent 70%)',
  dusk:
    'radial-gradient(40% 60% at 85% 15%, rgba(255,201,168,0.55), transparent 70%), radial-gradient(35% 55% at 10% 80%, rgba(191,224,245,0.6), transparent 70%), radial-gradient(30% 45% at 45% 40%, rgba(255,236,159,0.35), transparent 70%)',
  bloom:
    'radial-gradient(45% 60% at 20% 30%, rgba(207,196,246,0.6), transparent 70%), radial-gradient(40% 55% at 80% 70%, rgba(255,236,159,0.6), transparent 70%), radial-gradient(30% 45% at 55% 10%, rgba(255,201,168,0.5), transparent 70%)',
};

/** Soft pastel glows behind a section, for the glass to catch. */
export function Aura({ mix = 'sunrise', className }: { mix?: AuraMix; className?: string }) {
  return <div aria-hidden className={cn('pointer-events-none absolute inset-0', className)} style={{ background: AURAS[mix] }} />;
}

export function ArrowDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/80 text-ink ring-1 ring-white backdrop-blur-md transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110',
        className
      )}
    >
      <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden />
    </span>
  );
}

function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-white/55 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.03em] text-ink ring-1 ring-white/70 backdrop-blur-xl',
        className
      )}
    >
      {children}
    </span>
  );
}

/** A tilted sticker: the brand's wink. */
export function Sticker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-butter px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.04em] text-ink shadow-[0_10px_24px_-12px_rgba(17,17,17,0.45)]',
        className
      )}
    >
      <Sparkle className="h-3 w-3 fill-ink" strokeWidth={0} aria-hidden />
      {children}
    </span>
  );
}

/** A word lifted onto a butter swipe. */
export function Swipe({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('relative inline-block', className)}>
      <span aria-hidden className="absolute inset-x-[-0.08em] bottom-[0.06em] top-[0.52em] -z-0 -rotate-1 rounded-[0.2em] bg-butter" />
      <span className="relative">{children}</span>
    </span>
  );
}

const perMonth = (p: CatalogProduct) => fromPrice(p.pricing);

/** The lineup categories as listed publicly (see LIST_DRAFTS), empty ones included. */
const listed = async () => listedCategories((await getLiveProducts()).map((p) => p.id));

/* -------------------------------------------------------------------------- */
/*  Hero                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * One full-bleed photo with the copy over it. Desktop: copy bottom-left on the soft windows.
 * Phones: headline at the top, the buttons at the bottom over the products, so the screen is balanced.
 */
export async function HomeHero() {
  const goals = (await listed()).filter((c) => c.items.length);
  return (
    <section className="bg-white px-3 pt-3 md:px-5 md:pt-4">
      <div className="relative mx-auto h-[calc(100svh-24px)] min-h-[640px] overflow-hidden rounded-shell bg-milk md:h-[calc(100svh-32px)] md:min-h-[680px]">
        {/* SoHo loft, morning: our vials on the island, her at the fridge, out of focus. */}
        <Image src="/brand/hero-home-mobile.jpg" alt="Kitchen counter with Eternal Longevity vials, for illustration" fill priority sizes="100vw" className="object-cover object-[52%_100%] md:hidden" />
        <Image src="/brand/hero-home.jpg" alt="Kitchen counter with Eternal Longevity vials, for illustration" fill priority sizes="100vw" className="hidden object-cover md:block" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b from-black/60 via-black/30 to-transparent md:hidden" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/60 via-black/25 to-transparent md:hidden" />
        <div aria-hidden className="absolute inset-0 hidden bg-gradient-to-r from-black/55 via-black/20 to-transparent md:block" />

        {/* Branded vials are a render, like the product shots: say so on the photo. */}
        <span className="absolute bottom-2.5 right-3 z-10 rounded-full bg-white/75 px-2.5 py-0.5 text-[10px] font-medium text-ink/70 backdrop-blur-md md:bottom-4 md:right-4 md:px-3 md:py-1 md:text-[11px]">
          Image for illustration
        </span>
        <div className="absolute inset-0 flex flex-col justify-between px-5 pb-10 pt-32 md:justify-end md:px-10 md:pb-12 md:pt-0">
          <div className="max-w-[660px] text-white">
            <span className={cn('mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium md:mb-5', GLASS_DARK)}>
              <span aria-hidden className="h-2 w-2 rounded-full bg-butter" />
              <span className="md:hidden">Licensed physician · {SERVICE_AREA_SHORT}</span>
              <span className="hidden md:inline">Prescribed by a licensed physician · {SERVICE_AREA_SHORT}</span>
            </span>
            <h1 className="text-[50px] font-semibold leading-[0.92] tracking-[-0.05em] md:text-[96px]">
              Longevity,
              <br />
              <span className="inline-block -rotate-2 rounded-inner bg-white/20 px-3 pb-2 pt-0.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] ring-1 ring-white/35 backdrop-blur-xl backdrop-saturate-150 md:rounded-shell md:px-4">
                prescribed.
              </span>
            </h1>
            <p className="mt-6 hidden max-w-[440px] text-[18px] leading-relaxed text-white/90 md:block">
              Longevity, sexual health, hormones, hair and skin. Prescribed by a licensed physician, made to order and shipped to your door.
            </p>
          </div>

          <div className="max-w-[660px] text-white md:mt-8">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/start"
                className="group flex items-center gap-2 rounded-full bg-butter py-2 pl-6 pr-2 text-[15px] font-semibold text-ink transition-transform hover:-translate-y-0.5"
              >
                Start your assessment
                <ArrowDot className="bg-ink text-white ring-0" />
              </Link>
            </div>

            {/* Goal picker: straight into a category, Hims-style. */}
            {/* Goal picker: straight into a category, Hims-style. */}
            <p className="mt-6 text-[13px] font-medium text-white/85 md:mt-7">What are you here for?</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {goals.map((c) => (
                <Link
                  key={c.slug}
                  href={`/treatments/${c.slug}`}
                  className={cn('group flex items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5 text-[14px] font-semibold tracking-[-0.01em] transition-colors hover:bg-white/30', GLASS_DARK)}
                >
                  {c.name}
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-butter text-ink transition-transform duration-300 group-hover:rotate-45">
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Trust row + ticker                                                         */
/* -------------------------------------------------------------------------- */

const TRUST = [
  { icon: Stethoscope, title: 'Licensed physician', body: 'Every prescription decided by Dr. Elder.' },
  { icon: FlaskConical, title: '503A pharmacy', body: 'Made to order, just for you.' },
  { icon: ShieldCheck, title: 'LegitScript certified', body: 'Independently verified.' },
  { icon: Truck, title: 'Fast, tracked shipping', body: 'Cold-chain where it needs it.' },
];

function TrustTile({ icon: Icon, title, body, className, dupe }: (typeof TRUST)[number] & { className?: string; dupe?: boolean }) {
  return (
    <div aria-hidden={dupe || undefined} className={cn('flex items-center gap-3 rounded-inner p-3 md:p-4', GLASS, className)}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-inner bg-white text-ink shadow-sm">
        <Icon className="h-[19px] w-[19px]" strokeWidth={1.8} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="whitespace-nowrap text-[14px] font-semibold tracking-[-0.01em] text-ink md:text-[15px]">{title}</p>
        <p className="mt-0.5 hidden text-[13px] leading-snug text-ink-soft md:block">{body}</p>
      </div>
    </div>
  );
}

/** Phones: one row drifting right (the ticker below drifts left). Desktop: four across. */
export function TrustRow() {
  return (
    <section className="relative overflow-hidden bg-white py-6 md:px-5 md:py-8">
      <Aura mix="sunrise" className="opacity-80" />
      <div className="relative flex w-max animate-[marquee_40s_linear_infinite] [animation-direction:reverse] motion-reduce:animate-none md:hidden">
        {[...TRUST, ...TRUST].map((t, i) => (
          <TrustTile key={i} {...t} dupe={i >= TRUST.length} className="mr-2 shrink-0 pr-5" />
        ))}
      </div>
      <div className="relative mx-auto hidden grid-cols-4 gap-3 md:grid">
        {TRUST.map((t) => (
          <TrustTile key={t.title} {...t} />
        ))}
      </div>
    </section>
  );
}

const TICKER = [
  'Prescribed by a licensed physician',
  'Made to order by a 503A pharmacy',
  'Nothing charged unless approved',
  'Shipped from a licensed pharmacy',
  'Decided by a physician, never a bot',
];

/** Quiet editorial strip between hairlines, rhode-style: small caps, slow drift, no ornament. */
export function Ticker() {
  const run = [...TICKER, ...TICKER];
  return (
    <div className="overflow-hidden border-y border-ink/10 bg-white py-4 md:py-5">
      <div className="flex w-max animate-[marquee_60s_linear_infinite] items-center motion-reduce:animate-none">
        {run.map((t, i) => (
          <span key={i} className="flex items-center whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.22em] text-ink/60 md:text-[12px]">
            {t}
            <span aria-hidden className="mx-10 h-1 w-1 rounded-full bg-ink/25 md:mx-14" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Best sellers                                                               */
/* -------------------------------------------------------------------------- */

export async function BestSellers() {
  const ORDER = ['nad-plus', 'glutathione', 'pt-141'];
  const products = (await getLiveProducts())
    .sort((a, b) => (ORDER.indexOf(a.id) + 1 || 99) - (ORDER.indexOf(b.id) + 1 || 99))
    .slice(0, 4);
  if (!products.length) return null;

  return (
    <section className="relative overflow-hidden bg-white px-5 py-16 md:px-10 md:py-24">
      <Aura mix="dusk" className="opacity-60" />
      <div className="relative mx-auto">
        <div className="mb-8 flex items-end justify-between gap-6 md:mb-12">
          <div>
            <Sticker className="mb-4 rotate-[-3deg]">Rx only · made for you</Sticker>
            <h2 className="text-[40px] font-semibold leading-none tracking-[-0.05em] text-ink md:text-[64px]">
              The <Swipe>it</Swipe> list
            </h2>
          </div>
          <Link href="/shop" className={cn('group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full py-1.5 pl-4 pr-1.5 text-[14px] font-medium text-ink', GLASS)}>
            Shop all
            <ArrowDot className="h-7 w-7 bg-white" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
          {products.map((p) => (
            <ProductTile key={p.id} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** The header's milky frosted glass, so the cards match the rest of the site. */
const CARD_GLASS =
  'bg-white/60 text-ink ring-1 ring-white/70 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_10px_40px_-16px_rgba(17,17,17,0.22),inset_0_1px_0_rgba(255,255,255,0.8)]';

/**
 * Tall photo card in the live site's language: frosted price chip on top,
 * frosted name panel with a Start assessment button at the bottom, softened
 * to the redesign's big radii. The card is a box with a stretched link to the
 * product page under its overlays, so the CTA can sit on top without nesting
 * one link inside another.
 */
export function ProductTile({ p, sizes = '(max-width: 1024px) 50vw, 25vw' }: { p: CatalogProduct; sizes?: string }) {
  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-shell bg-milk shadow-[0_30px_60px_-36px_rgba(17,17,17,0.5)]">
      <Image
        src={p.image}
        alt=""
        fill
        sizes={sizes}
        className="-translate-y-[9%] scale-[1.2] object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.25]"
      />

      <div className={cn('absolute left-2 top-2 flex items-baseline gap-1 rounded-full px-2.5 py-1 md:left-4 md:top-4 md:gap-2 md:px-4 md:py-2', CARD_GLASS)}>
        <span className="text-[11px] text-ink-soft md:text-[13px]">from</span>
        <span className="text-[13px] font-semibold md:text-[17px]">${perMonth(p)}</span>
        <span className="text-[11px] text-ink-soft md:text-[13px]">/mo</span>
      </div>

      {/* Above the card link but click-through, except the button: the blur
          makes the panel its own stacking context. */}
      <div className={cn('pointer-events-none absolute inset-x-2 bottom-2 z-[2] rounded-inner px-3 py-2.5 md:inset-x-4 md:bottom-4 md:p-5', CARD_GLASS)}>
        <p className="text-[16px] font-semibold leading-tight tracking-[-0.03em] md:text-[26px]">{p.name}</p>
        <div className="mt-0.5 md:mt-3 md:flex md:flex-wrap md:items-center md:justify-between md:gap-x-3 md:gap-y-2 md:border-t md:border-ink/10 md:pt-3">
          <p className="truncate text-[11px] text-ink-soft md:overflow-visible md:whitespace-normal md:text-[14px]">{p.tagline}</p>
          <Link
            href={`/start?product=${p.id}`}
            className="pointer-events-auto hidden shrink-0 whitespace-nowrap rounded-full bg-butter px-3 py-2 text-center text-[12px] font-semibold text-ink transition-colors hover:bg-butter-deep md:block md:px-4 md:text-[13px]"
          >
            Start assessment
          </Link>
        </div>
      </div>

      <Link href={`/shop/${p.id}`} aria-label={`Shop ${p.name}`} className="absolute inset-0 z-[1]" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shop by goal + campaign                                                    */
/* -------------------------------------------------------------------------- */

export async function ShopByGoal() {
  const categories = await listed();
  const total = listedItems(categories).length;
  return (
    <section className="relative overflow-hidden bg-white pb-16 pt-12 md:pb-24 md:pt-20">
      <Aura mix="dusk" className="opacity-60" />
      <div className="relative">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 px-5 md:mb-12 md:px-10">
          <h2 className="max-w-[760px] text-[40px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[64px]">
            Whatever you&apos;re here for, <Swipe>we&apos;ve got you.</Swipe>
          </h2>
          <p className="text-[15px] text-ink-soft">
            {countLabel(total)} · {LIST_DRAFTS ? `${categories.length} categories` : 'more coming soon'} · 1 physician
          </p>
        </div>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-10 [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => (
            <CategoryTile key={c.slug} c={c} className="aspect-[4/5] w-[68%] shrink-0 snap-start md:aspect-[3/4] md:w-auto" />
          ))}
        </div>
      </div>
    </section>
  );
}

const CAMPAIGN = [
  { src: '/brand/life-cyclist.jpg', tag: 'Built around an active life' },
  { src: '/brand/life-yoga.jpg', tag: 'Hormone care, on your terms' },
  { src: '/brand/life-coffee.jpg', tag: 'Care around your routine' },
  { src: '/brand/life-telehealth.jpg', tag: 'Your physician, from the sofa' },
];

/** Big campaign photography, rhode-style: people first, product second. */
export function Campaign() {
  return (
    <section className="bg-white pb-16 md:pb-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 px-5 md:mb-12 md:px-10">
        <h2 className="text-[40px] font-semibold leading-[1] tracking-[-0.05em] text-ink md:text-[64px]">
          Made for <Swipe>real life.</Swipe>
        </h2>
        <Sticker className="rotate-[-3deg]">For adults 18+</Sticker>
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-10 [&::-webkit-scrollbar]:hidden">
        {CAMPAIGN.map((c) => (
          <div key={c.src} className="relative aspect-[4/5] w-[78%] shrink-0 snap-start overflow-hidden rounded-shell bg-milk md:w-auto">
            <Image src={c.src} alt="" fill sizes="(max-width: 768px) 80vw, 25vw" className="object-cover" />
            <div className="absolute inset-x-3 bottom-3 md:inset-x-4 md:bottom-4">
              <Tag>{c.tag}</Tag>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Beliefs (rhode-style bento)                                                */
/* -------------------------------------------------------------------------- */

const CATEGORIES = [
  { label: 'Longevity', href: '/treatments/longevity', dot: 'bg-butter' },
  { label: 'Sexual health', href: '/treatments/sexual-health', dot: 'bg-peach' },
  { label: 'Hair & skin', href: '/treatments/hair', dot: 'bg-lilac' },
];

export function Beliefs() {
  return (
    <section className="relative overflow-hidden bg-white px-5 pb-16 md:px-10 md:pb-24">
      <Aura mix="bloom" className="top-1/3 opacity-70" />
      <div className="relative mx-auto">
        <div className="mb-10 grid gap-6 md:mb-14 md:grid-cols-[1.3fr_1fr] md:items-end">
          <h2 className="text-[40px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[64px]">
            Medicine that fits your <Swipe>life,</Swipe> not the other way around.
          </h2>
          <p className="max-w-[440px] text-[16px] leading-relaxed text-ink-soft md:justify-self-end">
            A short online assessment, a real physician who reads it, and a treatment made to order for you. No waiting rooms, no guesswork, no
            hidden fees.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3 md:gap-5">
          <Link href="/start" className="group relative block aspect-[4/5] overflow-hidden rounded-shell bg-milk md:row-span-2 md:aspect-auto">
            <Image src="/brand/hero-man.jpg" alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover object-[40%_center] transition-transform duration-700 group-hover:scale-[1.04]" />
            <Sticker className="absolute right-4 top-4 rotate-[5deg]">Longevity</Sticker>
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
              <Tag>Care led by a physician</Tag>
              <ArrowDot />
            </div>
          </Link>

          <div className="relative aspect-[16/10] overflow-hidden rounded-shell bg-butter md:aspect-auto md:min-h-[260px]">
            <Image src="/brand/texture-butter.jpg" alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            <div className="absolute inset-x-4 bottom-4">
              <Tag>Made to order by a 503A pharmacy</Tag>
            </div>
          </div>

          <div className="grid gap-3 md:row-span-2 md:gap-5">
            {CATEGORIES.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className={cn('group flex min-h-[110px] items-end justify-between rounded-shell p-5 transition-transform duration-500 hover:-translate-y-1 md:min-h-0 md:p-6', GLASS)}
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden className={cn('h-3 w-3 rounded-full', c.dot)} />
                  <span className="text-[28px] font-semibold leading-none tracking-[-0.045em] text-ink md:text-[36px]">{c.label}</span>
                </span>
                <ArrowDot className="bg-white" />
              </Link>
            ))}
          </div>

          <div className="relative aspect-[16/10] overflow-hidden rounded-shell bg-milk md:aspect-auto md:min-h-[260px]">
            <Image src="/brand/life-friends.jpg" alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            <div className="absolute inset-x-4 bottom-4">
              <Tag>One physician, every product</Tag>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  How it works                                                               */
/* -------------------------------------------------------------------------- */

const STEPS = [
  { title: 'Tell us about you', body: 'A five-minute online assessment: your goals, health history and medications.' },
  { title: 'A physician reviews it', body: 'Dr. Elder decides every prescription himself. Nothing is charged unless he approves.' },
  { title: 'Delivered to your door', body: 'Made to order by a licensed 503A pharmacy and shipped to you, tracked.' },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-white px-3 md:px-5">
      <div className="relative mx-auto overflow-hidden rounded-shell bg-milk px-5 py-16 md:px-10 md:py-24">
        <Aura mix="sunrise" />
        <div className="relative">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-14">
            <h2 className="text-[40px] font-semibold leading-none tracking-[-0.05em] text-ink md:text-[64px]">
              Three steps. <Swipe>That&apos;s it.</Swipe>
            </h2>
            <Sticker className="rotate-[4deg]">No waiting rooms</Sticker>
          </div>
          <ol className="grid gap-3 md:grid-cols-3 md:gap-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className={cn('flex min-h-[240px] flex-col justify-between rounded-shell p-6 md:min-h-[300px] md:p-8', GLASS)}>
                <span className="grid h-14 w-14 place-items-center rounded-inner bg-ink text-[22px] font-semibold text-butter">{i + 1}</span>
                <div>
                  <p className="text-[26px] font-semibold leading-tight tracking-[-0.04em] text-ink md:text-[30px]">{s.title}</p>
                  <p className="mt-2 max-w-[340px] text-[15px] leading-relaxed text-ink-soft">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex justify-center">
            <Link href="/start" className="group flex items-center gap-2 rounded-full bg-ink py-2 pl-6 pr-2 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5">
              Start your assessment
              <ArrowDot className="bg-butter ring-0" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Physician                                                                  */
/* -------------------------------------------------------------------------- */

export function PhysicianCard() {
  return (
    <section className="bg-white px-3 py-16 md:px-5 md:py-24">
      <div className="mx-auto grid gap-3 md:grid-cols-[5fr_7fr] md:gap-5">
        {/* Dr. Elder cut out of his studio backdrop and set on the brand's own surface (milk + butter/peach/lilac
            glows), whole and never cropped, fading into the tile at the waist. */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-shell bg-milk md:aspect-auto md:min-h-[640px]">
          <Aura mix="sunrise" />
          <Image
            src="/brand/dr-elder-cutout.webp"
            alt="Dr. Bader Elder, DO"
            fill
            sizes="(max-width: 768px) 100vw, 42vw"
            className="object-contain object-bottom pt-6 [mask-image:linear-gradient(to_bottom,#000_78%,transparent)]"
          />
          <div className={cn('absolute bottom-4 left-4 w-fit rounded-inner px-4 py-3', GLASS)}>
            <p className="text-[18px] font-semibold tracking-[-0.02em] text-ink">Dr. Bader Elder, DO</p>
            <p className="mt-0.5 text-[13px] text-ink-soft">Licensed in {SERVICE_AREA_SHORT}</p>
          </div>
        </div>
        <div className="relative flex flex-col justify-between gap-10 overflow-hidden rounded-shell bg-milk p-6 md:p-12">
          <Aura mix="bloom" className="opacity-80" />
          <div className="relative">
            <Sticker className="rotate-[-3deg]">Our physician</Sticker>
            <p className="mt-8 text-[32px] font-semibold leading-[1.04] tracking-[-0.045em] text-ink [text-wrap:balance] md:text-[52px]">
              Every prescription is decided by a <Swipe>physician</Swipe>, not a bot.
            </p>
            <p className="mt-5 max-w-[460px] text-[16px] leading-relaxed text-ink-soft">
              If a treatment isn&apos;t right for you, you&apos;re never charged. Questions go straight to your prescriber through the portal.
            </p>
          </div>
          <Link href="/about" className={cn('group relative flex w-fit items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5 text-[14px] font-medium text-ink', GLASS)}>
            About us
            <ArrowDot className="h-7 w-7 bg-white" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  FAQ                                                                        */
/* -------------------------------------------------------------------------- */

const PICK = [
  'How does Eternal Longevity work?',
  'Which states do you ship to?',
  'Is there an age requirement?',
  'Are these medications FDA-approved?',
  'How are medications shipped?',
  'What is your refund policy?',
];

export async function HomeFAQ() {
  const faqs = withPrices(FAQS, await getLiveProducts());
  const items = PICK.map((q) => faqs.find((f) => f.q === q)).filter((f) => f !== undefined);
  return (
    <section className="relative overflow-hidden bg-white px-5 pb-16 md:px-10 md:pb-24">
      <Aura mix="dusk" className="opacity-60" />
      <div className="relative mx-auto grid gap-8 md:grid-cols-[4fr_7fr] md:gap-16">
        <div>
          <h2 className="text-[40px] font-semibold leading-none tracking-[-0.05em] text-ink md:text-[64px]">
            Questions? <Swipe>Answered.</Swipe>
          </h2>
          <Link href="/faq" className={cn('group mt-6 inline-flex items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5 text-[14px] font-medium text-ink', GLASS)}>
            All FAQs
            <ArrowDot className="h-7 w-7 bg-white" />
          </Link>
        </div>
        <div className="space-y-2">
          {items.map((f) => (
            <details key={f.q} name="home-faq" className={cn('group rounded-inner px-5 md:px-6', GLASS)}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] font-semibold tracking-[-0.015em] text-ink md:text-[18px] [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white transition-colors group-open:bg-butter">
                  <Plus className="h-4 w-4 transition-transform duration-300 group-open:rotate-45" strokeWidth={2} aria-hidden />
                </span>
              </summary>
              <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Closing band                                                               */
/* -------------------------------------------------------------------------- */

export function ClosingBand() {
  return (
    <section className="bg-white px-3 pb-3 md:px-5 md:pb-5">
      <div className="relative mx-auto overflow-hidden rounded-shell bg-butter-soft px-5 pb-6 pt-10 md:px-12 md:pt-16">
        <Aura mix="bloom" />
        <div className={cn('relative z-10 flex flex-col gap-6 rounded-shell p-6 md:flex-row md:items-center md:justify-between md:p-8', GLASS)}>
          <div>
            <h2 className="text-[34px] font-semibold leading-none tracking-[-0.05em] text-ink md:text-[52px]">Ready when you are.</h2>
            <p className="mt-3 text-[15px] text-ink-soft">Five minutes online. Reviewed by a physician. Nothing charged unless approved.</p>
          </div>
          <Link href="/start" className="group flex w-fit shrink-0 items-center gap-3 rounded-full bg-ink py-2 pl-6 pr-2 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5">
            Start your assessment
            <ArrowDot className="h-9 w-9 bg-butter ring-0" />
          </Link>
        </div>
        <p
          aria-hidden
          className="pointer-events-none relative mt-6 select-none text-center text-[34vw] font-semibold leading-[0.8] tracking-[-0.07em] text-white blur-[8px] md:text-[22vw] lg:text-[300px]"
          style={{ textShadow: '0 0 60px rgba(255,236,159,0.9)' }}
        >
          eternal
        </p>
      </div>
    </section>
  );
}
