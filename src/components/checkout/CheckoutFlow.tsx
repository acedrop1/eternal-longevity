'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/CartProvider';
import { useOrders } from '@/components/orders/OrdersProvider';
import { createCheckoutSessionAction } from '@/lib/checkout-actions';
import { useMemberProfile } from '@/components/profile/MemberProfileProvider';
import { formatAddressOneLine, type SavedAddress } from '@/lib/memberProfile';
import { STATES_AVAILABLE } from '@/lib/intakeSchema';
import { cn } from '@/lib/utils';

type SectionKey = 'email' | 'shipping' | 'method' | 'payment';

interface ShippingForm {
  fullName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

const SHIPPING_OPTIONS = [
  { id: 'standard', label: 'Standard cold-chain', eta: '3–5 business days', price: 0 },
  { id: 'express', label: 'Express cold-chain', eta: '2 business days', price: 25 },
  { id: 'saturday', label: 'Saturday delivery', eta: 'This Saturday', price: 45 },
] as const;

type ShippingMethodId = (typeof SHIPPING_OPTIONS)[number]['id'];

interface CheckoutFlowProps {
  defaultEmail: string;
  defaultName: string;
}

// ============================================================================
// Input formatters
// ============================================================================

/** Formats a raw card number into groups of 4 (or Amex 4-6-5). Caps at 19 digits. */
function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 19);
  // Amex (15 digits, starts 34/37) → 4-6-5 grouping
  if (/^3[47]/.test(digits)) {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
      .filter(Boolean)
      .join(' ');
  }
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

/** Identify card brand from raw digits (for the brand chip). */
function detectCardBrand(digits: string): string | null {
  const d = digits.replace(/\D/g, '');
  if (!d) return null;
  if (/^4/.test(d)) return 'VISA';
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'MASTERCARD';
  if (/^3[47]/.test(d)) return 'AMEX';
  if (/^6(?:011|5)/.test(d)) return 'DISCOVER';
  return null;
}

/** Auto-inserts "/" between MM and YY. Caps at 4 digits. */
function formatExpiration(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Formats US phone as user types. */
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (!d) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Strips non-digits and caps at 5 chars. */
function formatZip(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 5);
}

/** Strips non-digits and caps at 4 chars. */
function formatCvc(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 4);
}

// ============================================================================
// Validators
// ============================================================================

const isEmailValid = (v: string) => /\S+@\S+\.\S+/.test(v.trim());
const isPhoneValid = (v: string) => v.replace(/\D/g, '').length === 10;
const isZipValid = (v: string) => /^\d{5}$/.test(v.trim());

function isCardValid(number: string) {
  const d = number.replace(/\D/g, '');
  return d.length >= 13 && d.length <= 19;
}

function isExpValid(exp: string) {
  const m = exp.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const month = Number(m[1]);
  return month >= 1 && month <= 12;
}

function isCvcValid(cvc: string) {
  return /^\d{3,4}$/.test(cvc);
}

// ============================================================================
// Main flow
// ============================================================================

export function CheckoutFlow({ defaultEmail, defaultName }: CheckoutFlowProps) {
  const router = useRouter();
  const { resolvedItems, subtotal: cartSubtotal, removeItem, clear: clearCart } = useCart();
  const { placeOrder } = useOrders();
  const {
    profile,
    addAddress,
    addCard,
  } = useMemberProfile();
  const [, startTransition] = useTransition();

  // --- Saved-profile pickers ---
  // 'new' means the user is filling in a fresh address/card; otherwise it's the saved id.
  const defaultAddressId =
    profile.addresses.find((a) => a.isPrimary)?.id ??
    profile.addresses[0]?.id ??
    'new';
  const defaultCardId =
    profile.cards.find((c) => c.isPrimary)?.id ??
    profile.cards[0]?.id ??
    'new';
  const [selectedAddressId, setSelectedAddressId] = useState<string>(defaultAddressId);
  const [selectedCardId, setSelectedCardId] = useState<string>(defaultCardId);
  const [saveAddress, setSaveAddress] = useState(true);
  const [saveCard, setSaveCard] = useState(true);

  // Once the profile has hydrated, sync to its primary if we were on a stale default.
  useEffect(() => {
    if (
      selectedAddressId !== 'new' &&
      !profile.addresses.find((a) => a.id === selectedAddressId) &&
      profile.addresses.length > 0
    ) {
      const primary = profile.addresses.find((a) => a.isPrimary) ?? profile.addresses[0];
      setSelectedAddressId(primary.id);
    }
    if (
      selectedCardId !== 'new' &&
      !profile.cards.find((c) => c.id === selectedCardId) &&
      profile.cards.length > 0
    ) {
      const primary = profile.cards.find((c) => c.isPrimary) ?? profile.cards[0];
      setSelectedCardId(primary.id);
    }
    // Only re-run when address/card lists change
  }, [profile.addresses, profile.cards, selectedAddressId, selectedCardId]);

  // --- Form state (used when selectedAddressId / selectedCardId === 'new') ---
  const [email, setEmail] = useState(defaultEmail);
  const [shipping, setShipping] = useState<ShippingForm>({
    fullName: defaultName,
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
  });
  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethodId>('standard');
  const [card, setCard] = useState({
    number: '',
    exp: '',
    cvc: '',
    name: '',
  });
  const [open, setOpen] = useState<SectionKey>('email');
  const [completed, setCompleted] = useState<Record<SectionKey, boolean>>({
    email: false,
    shipping: false,
    method: false,
    payment: false,
  });
  const [isPaying, setIsPaying] = useState(false);
  // Mobile-only: collapsible order summary at top. Always expanded on lg+.
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // --- Refs for focus + scroll management ---
  const emailRef = useRef<HTMLInputElement>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const address1Ref = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLSelectElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const methodSectionRef = useRef<HTMLDivElement>(null);
  const cardNumberRef = useRef<HTMLInputElement>(null);
  const expRef = useRef<HTMLInputElement>(null);
  const cvcRef = useRef<HTMLInputElement>(null);
  const cardNameRef = useRef<HTMLInputElement>(null);

  // Section ref map for scroll-into-view on transition
  const sectionRefs: Record<SectionKey, React.RefObject<HTMLElement | null>> = {
    email: useRef<HTMLElement>(null),
    shipping: useRef<HTMLElement>(null),
    method: useRef<HTMLElement>(null),
    payment: useRef<HTMLElement>(null),
  };

  // --- Section transitions: scroll + focus the right input ---
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    // Run after the new section paints so scrollIntoView measures correctly
    const t = window.setTimeout(() => {
      const sectionEl = sectionRefs[open].current;
      if (sectionEl) {
        sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Focus the first input of the new section. preventScroll keeps the
      // smooth-scroll above from being interrupted on iOS Safari.
      const firstInput = {
        email: emailRef.current,
        shipping: fullNameRef.current,
        method: null,
        payment: cardNumberRef.current,
      }[open];
      if (firstInput) {
        firstInput.focus({ preventScroll: true });
      }
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // --- Derived ---
  const hasCart = resolvedItems.length > 0;

  // Fallback line: Recover protocol shown if cart is empty.
  const fallbackLine = useMemo(
    () => ({
      key: 'fallback-recover',
      name: 'Recover Protocol',
      cadence: 'Quarterly billing',
      qty: 1,
      perMonth: 160,
      total: 480,
      sub: '12-week cycle',
      image: '/images/11.jpg',
      swatch: 'linear-gradient(180deg, #1a4a3e 0%, #000000 100%)',
    }),
    []
  );

  const lines = useMemo(() => {
    if (hasCart) {
      return resolvedItems.map((it) => ({
        key: `${it.productId}-${it.cadence}`,
        productId: it.productId,
        cadence: it.cadence,
        name: it.product.name,
        cadenceLabel: `${it.cadenceLabel} billing`,
        qty: it.quantity,
        perMonth: it.perMonth,
        total: it.total * it.quantity,
        sub: it.product.cycleLength,
        image: it.product.image,
        swatch: it.product.swatch,
      }));
    }
    return [
      {
        key: fallbackLine.key,
        productId: undefined as string | undefined,
        cadence: undefined as string | undefined,
        name: fallbackLine.name,
        cadenceLabel: fallbackLine.cadence,
        qty: fallbackLine.qty,
        perMonth: fallbackLine.perMonth,
        total: fallbackLine.total,
        sub: fallbackLine.sub,
        image: fallbackLine.image,
        swatch: fallbackLine.swatch,
      },
    ];
  }, [hasCart, resolvedItems, fallbackLine]);

  const subtotal = hasCart ? cartSubtotal : fallbackLine.total;
  const shippingCost = SHIPPING_OPTIONS.find((s) => s.id === shippingMethod)?.price ?? 0;
  const tax = Math.round(subtotal * 0.08);
  const total = subtotal + shippingCost + tax;

  // --- Section-level validity ---
  const emailValid = isEmailValid(email);

  // Selected saved address (if any) → always valid; or new form must be complete
  const usingSavedAddress =
    selectedAddressId !== 'new' &&
    !!profile.addresses.find((a) => a.id === selectedAddressId);
  const newAddressValid =
    !!shipping.fullName.trim() &&
    !!shipping.address1.trim() &&
    !!shipping.city.trim() &&
    !!shipping.state.trim() &&
    isZipValid(shipping.zip) &&
    isPhoneValid(shipping.phone);
  const shippingValid = usingSavedAddress || newAddressValid;

  const methodValid = !!shippingMethod;

  const usingSavedCard =
    selectedCardId !== 'new' &&
    !!profile.cards.find((c) => c.id === selectedCardId);
  const newCardValid =
    isCardValid(card.number) &&
    isExpValid(card.exp) &&
    isCvcValid(card.cvc) &&
    card.name.trim().length > 1;
  const cardValid = usingSavedCard || newCardValid;

  // --- Step transitions ---
  function continueFrom(section: SectionKey, next?: SectionKey) {
    setCompleted((c) => ({ ...c, [section]: true }));
    // When entering payment, prefill name-on-card from shipping
    if (next === 'payment' && !card.name) {
      setCard((c) => ({ ...c, name: shipping.fullName }));
    }
    if (next) setOpen(next);
  }

  function continueEmail() {
    if (!emailValid) return;
    continueFrom('email', 'shipping');
  }
  function continueShipping() {
    if (!shippingValid) return;
    continueFrom('shipping', 'method');
  }
  function continueMethod() {
    if (!methodValid) return;
    continueFrom('method', 'payment');
  }

  async function handlePay() {
    if (!emailValid || !shippingValid || !methodValid || !cardValid) return;
    setIsPaying(true);

    // Resolve the address used for this order. Either a saved one or the new form.
    let shippingAddressForOrder: SavedAddress;
    if (usingSavedAddress) {
      shippingAddressForOrder = profile.addresses.find(
        (a) => a.id === selectedAddressId
      ) as SavedAddress;
    } else {
      const newAddr: Omit<SavedAddress, 'id'> = {
        label: 'Home',
        fullName: shipping.fullName,
        line1: shipping.address1,
        line2: shipping.address2 || undefined,
        city: shipping.city,
        state: shipping.state,
        zip: shipping.zip,
        phone: shipping.phone,
        isPrimary: profile.addresses.length === 0,
      };
      shippingAddressForOrder = saveAddress
        ? addAddress(newAddr)
        : { ...newAddr, id: 'unsaved' };
    }

    // Resolve the card last4. Either saved or new
    let cardLast4: string;
    if (usingSavedCard) {
      const savedCard = profile.cards.find((c) => c.id === selectedCardId);
      cardLast4 = savedCard?.last4 ?? '••••';
    } else {
      const digits = card.number.replace(/\D/g, '');
      cardLast4 = digits.slice(-4);
      if (saveCard && newCardValid) {
        const [m, y] = card.exp.split('/').map((s) => s.trim());
        addCard({
          brand: detectCardBrand(digits) ?? 'CARD',
          last4: cardLast4,
          expMonth: m ?? '',
          expYear: y ?? '',
          nameOnCard: card.name,
          isPrimary: profile.cards.length === 0,
        });
      }
    }

    // Build order lines from the current cart (or fallback to demo line)
    const orderLines = hasCart
      ? resolvedItems.map((it) => ({
          productId: it.productId,
          productName: it.product.name,
          cadence: it.cadence as 'monthly' | 'quarterly' | 'annual',
          cadenceLabel: it.cadenceLabel,
          quantity: it.quantity,
          perCycle: it.total,
          image: it.product.image,
          swatch: it.product.swatch,
        }))
      : [
          {
            productId: 'fallback-recover',
            productName: 'Recover Protocol',
            cadence: 'quarterly' as const,
            cadenceLabel: 'Quarterly',
            quantity: 1,
            perCycle: fallbackLine.total,
            image: fallbackLine.image,
            swatch: fallbackLine.swatch,
          },
        ];

    // If a real payment backend is connected, hand off to Stripe Checkout.
    // The card is entered on Stripe's hosted page — never in this form.
    try {
      const checkout = await createCheckoutSessionAction({
        lines: orderLines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          quantity: l.quantity,
          amountCents: Math.round(l.perCycle * 100),
        })),
      });
      if (checkout.url) {
        window.location.href = checkout.url;
        return;
      }
    } catch {
      // Fall through to the demo success flow below.
    }

    placeOrder({
      memberName: shippingAddressForOrder.fullName,
      memberEmail: email,
      state: shippingAddressForOrder.state,
      lines: orderLines,
      subtotal,
      shippingCost,
      tax,
      total,
      shippingAddress: {
        fullName: shippingAddressForOrder.fullName,
        line1: shippingAddressForOrder.line1,
        line2: shippingAddressForOrder.line2,
        city: shippingAddressForOrder.city,
        state: shippingAddressForOrder.state,
        zip: shippingAddressForOrder.zip,
      },
      cardLast4,
    });

    // Clear the cart and route to success
    startTransition(() => {
      clearCart();
      router.push('/checkout/success?demo=1');
    });
  }

  // --- Enter-key advance helper ---
  function enterAdvance(action: () => void) {
    return (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        action();
      }
    };
  }

  // --- Auto-advance handlers ---
  const onCardChange = (raw: string) => {
    const formatted = formatCardNumber(raw);
    const digitsOnly = formatted.replace(/\D/g, '');
    setCard((c) => ({ ...c, number: formatted }));
    const brand = detectCardBrand(digitsOnly);
    const target = brand === 'AMEX' ? 15 : 16;
    if (digitsOnly.length >= target) {
      // Move to expiration after a tick so the value is committed
      window.setTimeout(() => expRef.current?.focus(), 0);
    }
  };

  const onExpChange = (raw: string) => {
    const formatted = formatExpiration(raw);
    setCard((c) => ({ ...c, exp: formatted }));
    if (formatted.length === 5) {
      window.setTimeout(() => cvcRef.current?.focus(), 0);
    }
  };

  const onCvcChange = (raw: string) => {
    const formatted = formatCvc(raw);
    setCard((c) => ({ ...c, cvc: formatted }));
    const brand = detectCardBrand(card.number);
    const target = brand === 'AMEX' ? 4 : 3;
    if (formatted.length >= target) {
      window.setTimeout(() => cardNameRef.current?.focus(), 0);
    }
  };

  const onZipChange = (raw: string) =>
    setShipping((s) => ({ ...s, zip: formatZip(raw) }));

  const onPhoneChange = (raw: string) =>
    setShipping((s) => ({ ...s, phone: formatPhone(raw) }));

  // Brand chip in card-number field
  const cardBrand = detectCardBrand(card.number);

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8 md:py-12">
      {/* ============ TOP NAV ============ */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/portal"
          className="flex items-center gap-2 text-foreground hover:text-accent transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Eternal Longevity" className="h-6 w-auto" />
          <span className="hidden sm:inline text-[11px] tracking-widest text-foreground/55">
            CHECKOUT
          </span>
        </Link>
        <span className="inline-flex items-center gap-1.5 text-[11px] tracking-wider text-foreground/55">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          SECURE CHECKOUT
        </span>
      </div>

      <div className="grid gap-6 lg:gap-14 lg:grid-cols-[1.4fr_1fr]">
        {/* ============ ORDER SUMMARY ============
            First in DOM so it appears at top on mobile (as a collapsible card),
            but lg:order-2 puts it in the right column on desktop. */}
        <aside className="lg:order-2">
          <div className="lg:sticky lg:top-8">
            <div className="rounded-3xl border border-line bg-surface overflow-hidden">
              {/* Compact mobile header. Tap to expand. Hidden on lg+ where the
                  full summary is always visible in the sidebar. */}
              <button
                type="button"
                onClick={() => setSummaryExpanded((v) => !v)}
                aria-expanded={summaryExpanded}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left lg:hidden"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-foreground/5 text-foreground/70">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      Order summary
                    </span>
                    <span className="block text-[11px] tracking-wider text-foreground/55">
                      {lines.length} item{lines.length === 1 ? '' : 's'} ·{' '}
                      {summaryExpanded ? 'TAP TO COLLAPSE' : 'TAP TO EXPAND'}
                    </span>
                  </span>
                </span>
                <span className="flex flex-shrink-0 items-center gap-2">
                  <span className="text-base font-semibold text-foreground tabular-nums">
                    ${total}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                      'text-foreground/55 transition-transform duration-300',
                      summaryExpanded ? 'rotate-180' : ''
                    )}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>

              {/* Full summary body. Always visible on lg+, conditional on mobile */}
              <div
                className={cn(
                  'lg:block lg:p-7 px-5 pb-5 pt-1',
                  summaryExpanded
                    ? 'block border-t border-line lg:border-t-0'
                    : 'hidden'
                )}
              >
                <div className="mb-5 hidden lg:flex items-center justify-between">
                  <h2 className="text-[11px] tracking-widest text-foreground/55">
                    ORDER DETAILS
                  </h2>
                  <span className="text-[11px] tracking-wider text-foreground/55">
                    {lines.length} item{lines.length === 1 ? '' : 's'}
                  </span>
                </div>

                <ul className="space-y-4 mb-5">
                  {lines.map((l) => (
                    <li key={l.key} className="flex gap-3">
                      <div
                        className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-line"
                        style={{ background: l.swatch }}
                      >
                        <Image
                          src={l.image}
                          alt={l.name}
                          fill
                          sizes="64px"
                          className="object-cover opacity-50"
                        />
                      </div>
                      <div className="flex flex-1 min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {l.name}
                          </div>
                          <div className="text-[11px] tracking-wider text-foreground/55 mt-0.5">
                            {l.cadenceLabel.toUpperCase()}
                          </div>
                          <div className="text-xs text-foreground/55 mt-0.5">
                            {l.sub} · Qty {l.qty}
                          </div>
                          {l.productId && l.cadence && (
                            <button
                              type="button"
                              onClick={() =>
                                removeItem(
                                  l.productId as string,
                                  l.cadence as 'monthly' | 'quarterly' | 'annual'
                                )
                              }
                              className="mt-1 text-[10px] tracking-widest text-foreground/45 hover:text-red-300 transition-colors"
                            >
                              REMOVE
                            </button>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-foreground tabular-nums">
                          ${l.total}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mb-5 flex items-center gap-2 text-[11px] tracking-wider text-foreground/65">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-accent/10 text-accent">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="font-semibold text-foreground/85">Third-party tested</span>
                  <span>· 503A compounded</span>
                </div>

                <div className="space-y-2 text-sm border-t border-line pt-4">
                  <SummaryRow label="Subtotal" value={`$${subtotal}`} />
                  <SummaryRow
                    label="Shipping"
                    value={shippingCost === 0 ? 'Included' : `$${shippingCost}`}
                  />
                  <SummaryRow label="Estimated tax" value={`$${tax}`} />
                  <div className="my-2 h-px bg-line" />
                  <SummaryRow
                    label="Total due today"
                    value={`$${total}`}
                    emphasis
                  />
                </div>

                <div className="mt-5 rounded-2xl border border-line bg-background px-4 py-3 text-xs text-foreground/55 leading-relaxed">
                  As low as{' '}
                  <span className="font-semibold text-foreground">
                    ${Math.round(total / 12)}/mo
                  </span>{' '}
                  with Affirm or Klarna · interest-free.
                </div>

                <button
                  type="button"
                  className="mt-5 w-full text-left text-[11px] tracking-wider text-accent hover:text-accent-soft"
                >
                  ADD PROMO CODE OR GIFT CARD →
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ============ LEFT. FORM SECTIONS ============ */}
        <div className="lg:order-1 space-y-3">
          <h1
            className="mb-6 font-semibold tracking-tight text-foreground"
            style={{
              fontSize: 'clamp(1.85rem, 4vw, 2.75rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            Start your cycle.
          </h1>

          {/* === SECTION 1. EMAIL === */}
          <Section
            number="1"
            title="Email"
            isOpen={open === 'email'}
            isComplete={completed.email}
            summary={completed.email ? email : ''}
            onEdit={() => setOpen('email')}
            sectionRef={sectionRefs.email}
          >
            <FieldLabel htmlFor="co-email">EMAIL</FieldLabel>
            <input
              ref={emailRef}
              id="co-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={enterAdvance(continueEmail)}
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="you@example.com"
              className={inputClass}
            />
            <p className="mt-2 text-xs text-foreground/55">
              We&apos;ll send your receipt and shipping updates here.
            </p>
            <ContinueButton disabled={!emailValid} onClick={continueEmail}>
              Continue to shipping
            </ContinueButton>
          </Section>

          {/* === SECTION 2. SHIPPING === */}
          <Section
            number="2"
            title="Shipping details"
            isOpen={open === 'shipping'}
            isComplete={completed.shipping}
            summary={(() => {
              if (!completed.shipping) return '';
              if (usingSavedAddress) {
                const a = profile.addresses.find((x) => x.id === selectedAddressId);
                return a ? `${a.fullName} · ${formatAddressOneLine(a)}` : '';
              }
              return `${shipping.fullName} · ${shipping.address1}, ${shipping.city}, ${shipping.state} ${shipping.zip}`;
            })()}
            disabled={!completed.email}
            onEdit={() => setOpen('shipping')}
            sectionRef={sectionRefs.shipping}
          >
            {/* Saved-address picker. Shows when the member has saved addresses */}
            {profile.addresses.length > 0 && (
              <div className="mb-5 space-y-2">
                <div className="mb-2 text-[10px] tracking-widest text-foreground/55">
                  SHIP TO
                </div>
                {profile.addresses.map((a) => {
                  const isActive = selectedAddressId === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAddressId(a.id)}
                      className={cn(
                        'flex w-full items-start gap-4 rounded-2xl border px-5 py-4 text-left transition-all',
                        isActive
                          ? 'border-accent bg-accent/5'
                          : 'border-line bg-surface hover:border-foreground/30'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2 transition-all',
                          isActive ? 'border-accent' : 'border-line'
                        )}
                      >
                        {isActive && (
                          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {a.label}
                          </span>
                          {a.isPrimary && (
                            <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] tracking-widest font-semibold">
                              PRIMARY
                            </span>
                          )}
                        </span>
                        <span className="block text-sm text-foreground/85 mt-0.5">
                          {a.fullName}
                        </span>
                        <span className="block text-xs text-foreground/55 mt-0.5">
                          {formatAddressOneLine(a)}
                        </span>
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedAddressId('new')}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-2xl border-2 border-dashed px-5 py-4 text-left transition-all',
                    selectedAddressId === 'new'
                      ? 'border-accent bg-accent/5'
                      : 'border-line bg-background hover:border-foreground/30'
                  )}
                >
                  <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-foreground/10 text-foreground/65 text-xs">
                    +
                  </span>
                  <span className="text-sm font-medium text-foreground/85">
                    Use a new address
                  </span>
                </button>
              </div>
            )}

            {/* New-address form: render when 'new' is selected OR no saved addresses */}
            {(selectedAddressId === 'new' || profile.addresses.length === 0) && (
            <div className="grid gap-4">
              <div>
                <FieldLabel htmlFor="ship-name">FULL NAME</FieldLabel>
                <input
                  ref={fullNameRef}
                  id="ship-name"
                  type="text"
                  value={shipping.fullName}
                  onChange={(e) =>
                    setShipping((s) => ({ ...s, fullName: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      address1Ref.current?.focus();
                    }
                  }}
                  autoComplete="name"
                  autoCapitalize="words"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel htmlFor="ship-addr1">STREET ADDRESS</FieldLabel>
                <input
                  ref={address1Ref}
                  id="ship-addr1"
                  type="text"
                  value={shipping.address1}
                  onChange={(e) =>
                    setShipping((s) => ({ ...s, address1: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      cityRef.current?.focus();
                    }
                  }}
                  autoComplete="address-line1"
                  autoCapitalize="words"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel htmlFor="ship-addr2">APT / SUITE (OPTIONAL)</FieldLabel>
                <input
                  id="ship-addr2"
                  type="text"
                  value={shipping.address2}
                  onChange={(e) =>
                    setShipping((s) => ({ ...s, address2: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      cityRef.current?.focus();
                    }
                  }}
                  autoComplete="address-line2"
                  autoCapitalize="words"
                  className={inputClass}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                <div>
                  <FieldLabel htmlFor="ship-city">CITY</FieldLabel>
                  <input
                    ref={cityRef}
                    id="ship-city"
                    type="text"
                    value={shipping.city}
                    onChange={(e) =>
                      setShipping((s) => ({ ...s, city: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        stateRef.current?.focus();
                      }
                    }}
                    autoComplete="address-level2"
                    autoCapitalize="words"
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="ship-state">STATE</FieldLabel>
                  <select
                    ref={stateRef}
                    id="ship-state"
                    value={shipping.state}
                    onChange={(e) =>
                      setShipping((s) => ({ ...s, state: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        zipRef.current?.focus();
                      }
                    }}
                    autoComplete="address-level1"
                    className={cn(inputClass, 'appearance-none')}
                  >
                    <option value="">—</option>
                    {STATES_AVAILABLE.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="ship-zip">ZIP</FieldLabel>
                  <input
                    ref={zipRef}
                    id="ship-zip"
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    value={shipping.zip}
                    onChange={(e) => onZipChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        phoneRef.current?.focus();
                      }
                    }}
                    autoComplete="postal-code"
                    placeholder="07030"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="ship-phone">PHONE</FieldLabel>
                <input
                  ref={phoneRef}
                  id="ship-phone"
                  type="tel"
                  inputMode="tel"
                  value={shipping.phone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                  onKeyDown={enterAdvance(continueShipping)}
                  autoComplete="tel"
                  placeholder="(555) 555-5555"
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-foreground/55">
                  Used only for delivery updates and emergencies.
                </p>
              </div>

              {/* Save this address for next time */}
              <SaveToggle
                label="Save this address for next time"
                checked={saveAddress}
                onChange={setSaveAddress}
              />
            </div>
            )}
            <ContinueButton
              disabled={!shippingValid}
              onClick={continueShipping}
            >
              Continue to shipping method
            </ContinueButton>
          </Section>

          {/* === SECTION 3. SHIPPING METHOD === */}
          <Section
            number="3"
            title="Choose shipping method"
            isOpen={open === 'method'}
            isComplete={completed.method}
            summary={
              completed.method
                ? `${SHIPPING_OPTIONS.find((s) => s.id === shippingMethod)?.label} · ${SHIPPING_OPTIONS.find((s) => s.id === shippingMethod)?.eta}`
                : ''
            }
            disabled={!completed.shipping}
            onEdit={() => setOpen('method')}
            sectionRef={sectionRefs.method}
          >
            <div ref={methodSectionRef} className="space-y-2">
              {SHIPPING_OPTIONS.map((opt) => {
                const isActive = shippingMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setShippingMethod(opt.id)}
                    className={cn(
                      'flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all',
                      isActive
                        ? 'border-accent bg-accent/5'
                        : 'border-line bg-surface hover:border-foreground/30'
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2 transition-all',
                        isActive ? 'border-accent' : 'border-line'
                      )}
                    >
                      {isActive && (
                        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-foreground">
                        {opt.label}
                      </span>
                      <span className="block text-xs text-foreground/55 mt-0.5">
                        {opt.eta}
                      </span>
                    </span>
                    <span className="flex-shrink-0 text-sm font-semibold text-foreground tabular-nums">
                      {opt.price === 0 ? 'Included' : `+$${opt.price}`}
                    </span>
                  </button>
                );
              })}
            </div>
            <ContinueButton disabled={!methodValid} onClick={continueMethod}>
              Continue to payment
            </ContinueButton>
          </Section>

          {/* === SECTION 4. PAYMENT === */}
          <Section
            number="4"
            title="Payment"
            isOpen={open === 'payment'}
            isComplete={completed.payment}
            summary={(() => {
              if (!completed.payment) return '';
              if (usingSavedCard) {
                const c = profile.cards.find((x) => x.id === selectedCardId);
                return c ? `${c.brand} ending in ${c.last4}` : '';
              }
              return `Card ending in ${card.number.replace(/\D/g, '').slice(-4)}`;
            })()}
            disabled={!completed.method}
            onEdit={() => setOpen('payment')}
            sectionRef={sectionRefs.payment}
          >
            <div className="mb-4 rounded-2xl border border-line bg-background px-4 py-3 flex items-center gap-3">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-foreground/65"
                aria-hidden
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span className="text-sm font-medium text-foreground">
                Card via Stripe
              </span>
              <span className="ml-auto text-[10px] tracking-widest text-foreground/45">
                SECURED
              </span>
            </div>

            {/* Saved-card picker */}
            {profile.cards.length > 0 && (
              <div className="mb-5 space-y-2">
                <div className="mb-2 text-[10px] tracking-widest text-foreground/55">
                  PAY WITH
                </div>
                {profile.cards.map((c) => {
                  const isActive = selectedCardId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCardId(c.id)}
                      className={cn(
                        'flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all',
                        isActive
                          ? 'border-accent bg-accent/5'
                          : 'border-line bg-surface hover:border-foreground/30'
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2 transition-all',
                          isActive ? 'border-accent' : 'border-line'
                        )}
                      >
                        {isActive && (
                          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                        )}
                      </span>
                      <span className="grid h-9 w-12 flex-shrink-0 place-items-center rounded-lg bg-foreground/10 text-[10px] font-bold tracking-widest text-foreground/75">
                        {c.brand}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-foreground">
                          •••• {c.last4}
                          {c.isPrimary && (
                            <span className="ml-2 rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] tracking-widest font-semibold">
                              PRIMARY
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-foreground/55 mt-0.5">
                          Exp {c.expMonth}/{c.expYear} · {c.nameOnCard}
                        </span>
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedCardId('new')}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-2xl border-2 border-dashed px-5 py-4 text-left transition-all',
                    selectedCardId === 'new'
                      ? 'border-accent bg-accent/5'
                      : 'border-line bg-background hover:border-foreground/30'
                  )}
                >
                  <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-foreground/10 text-foreground/65 text-xs">
                    +
                  </span>
                  <span className="text-sm font-medium text-foreground/85">
                    Use a new card
                  </span>
                </button>
              </div>
            )}

            {/* New-card form */}
            {(selectedCardId === 'new' || profile.cards.length === 0) && (
            <div className="grid gap-4">
              {/* Card number with inline brand chip */}
              <div>
                <FieldLabel htmlFor="card-num">CARD NUMBER</FieldLabel>
                <div className="relative">
                  <input
                    ref={cardNumberRef}
                    id="card-num"
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    value={card.number}
                    onChange={(e) => onCardChange(e.target.value)}
                    autoComplete="cc-number"
                    placeholder="1234 5678 9012 3456"
                    className={cn(inputClass, 'pr-20 tracking-[0.04em]')}
                  />
                  {cardBrand && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-foreground/10 px-2 py-1 text-[10px] tracking-widest font-semibold text-foreground/75">
                      {cardBrand}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <FieldLabel htmlFor="card-exp">EXPIRY (MM/YY)</FieldLabel>
                  <input
                    ref={expRef}
                    id="card-exp"
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    value={card.exp}
                    onChange={(e) => onExpChange(e.target.value)}
                    onKeyDown={(e) => {
                      // Allow Backspace to clear the slash and jump back a digit
                      if (
                        e.key === 'Backspace' &&
                        card.exp.endsWith('/') &&
                        (e.target as HTMLInputElement).selectionStart === card.exp.length
                      ) {
                        e.preventDefault();
                        setCard((c) => ({ ...c, exp: c.exp.slice(0, -1) }));
                      }
                    }}
                    autoComplete="cc-exp"
                    placeholder="04/27"
                    maxLength={5}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="card-cvc">CVC</FieldLabel>
                  <input
                    ref={cvcRef}
                    id="card-cvc"
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    value={card.cvc}
                    onChange={(e) => onCvcChange(e.target.value)}
                    onKeyDown={(e) => {
                      // Backspace at start of CVC jumps back to exp
                      if (
                        e.key === 'Backspace' &&
                        card.cvc.length === 0
                      ) {
                        e.preventDefault();
                        expRef.current?.focus();
                      }
                    }}
                    autoComplete="cc-csc"
                    placeholder="123"
                    maxLength={4}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="card-name">NAME ON CARD</FieldLabel>
                <input
                  ref={cardNameRef}
                  id="card-name"
                  type="text"
                  value={card.name}
                  onChange={(e) =>
                    setCard((c) => ({ ...c, name: e.target.value }))
                  }
                  onKeyDown={enterAdvance(handlePay)}
                  autoComplete="cc-name"
                  autoCapitalize="words"
                  className={inputClass}
                />
              </div>

              {/* Save this card for next time */}
              <SaveToggle
                label="Save this card for next time"
                checked={saveCard}
                onChange={setSaveCard}
              />
            </div>
            )}

            <button
              type="button"
              onClick={handlePay}
              disabled={!cardValid || isPaying}
              className={cn(
                'mt-6 w-full rounded-full font-semibold py-3.5 text-base transition-colors inline-flex items-center justify-center gap-2',
                cardValid && !isPaying
                  ? 'bg-accent text-black hover:bg-accent-soft'
                  : 'bg-foreground/15 text-foreground/40 cursor-not-allowed'
              )}
            >
              {isPaying && (
                <span
                  aria-hidden
                  className="h-4 w-4 inline-block rounded-full border-2 border-black/30 border-t-black animate-spin"
                />
              )}
              {isPaying ? 'Processing…' : `Pay $${total}`}
            </button>
            <p className="mt-3 text-center text-[11px] text-foreground/45">
              You can pause or cancel between cycles · No mid-cycle billing
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

const inputClass =
  'w-full rounded-2xl border border-line bg-background px-4 py-3.5 text-base text-foreground placeholder-foreground/30 transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] tracking-wider text-foreground/60"
    >
      {children}
    </label>
  );
}

function ContinueButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'mt-6 rounded-full font-semibold px-7 py-3 text-sm transition-colors w-full sm:w-auto',
        disabled
          ? 'bg-foreground/15 text-foreground/40 cursor-not-allowed'
          : 'bg-foreground text-background hover:bg-accent hover:text-black'
      )}
    >
      {children} →
    </button>
  );
}

function Section({
  number,
  title,
  isOpen,
  isComplete,
  summary,
  disabled,
  onEdit,
  sectionRef,
  children,
}: {
  number: string;
  title: string;
  isOpen: boolean;
  isComplete: boolean;
  summary: string;
  disabled?: boolean;
  onEdit: () => void;
  sectionRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  return (
    <section
      ref={sectionRef}
      // Pad top so the header doesn't sit flush against the sticky bar when
      // scrolled into view on mobile.
      className={cn(
        'scroll-mt-4 rounded-3xl border bg-surface transition-all',
        isOpen
          ? 'border-foreground/20'
          : disabled
            ? 'border-line opacity-60'
            : 'border-line'
      )}
    >
      <header className="flex items-center justify-between px-6 py-4 md:px-7">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              'grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums',
              isComplete
                ? 'bg-accent text-background'
                : isOpen
                  ? 'bg-foreground text-background'
                  : 'bg-foreground/10 text-foreground/55'
            )}
          >
            {isComplete ? (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              number
            )}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm md:text-base font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            {!isOpen && summary && (
              <p className="mt-0.5 text-xs text-foreground/55 truncate">
                {summary}
              </p>
            )}
          </div>
        </div>
        {isComplete && !isOpen && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] tracking-wider text-accent hover:text-accent-soft flex-shrink-0"
          >
            EDIT
          </button>
        )}
      </header>
      {isOpen && (
        <div className="px-6 pb-6 md:px-7 md:pb-7 pt-1">{children}</div>
      )}
    </section>
  );
}

function SummaryRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        emphasis ? 'text-base font-semibold text-foreground' : 'text-foreground/75'
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function SaveToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex items-center gap-3 rounded-2xl border border-line bg-background px-4 py-3 text-left transition-all hover:border-foreground/30"
    >
      <span
        className={cn(
          'grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border-2 transition-all',
          checked ? 'border-accent bg-accent text-background' : 'border-line bg-surface'
        )}
      >
        {checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="text-sm text-foreground/85">{label}</span>
    </button>
  );
}
