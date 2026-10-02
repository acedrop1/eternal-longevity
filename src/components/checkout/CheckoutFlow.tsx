'use client';

import type { Cadence } from '@/lib/cartTypes';
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
import { useMemberProfile } from '@/components/profile/MemberProfileProvider';
import { formatAddressOneLine, type SavedAddress } from '@/lib/memberProfile';
import { SERVICEABLE_STATES, STATE_NAMES } from '@/lib/intakeSchema';
import { SERVICE_AREA_OR, SITE_NAME } from '@/lib/site';
import { monthsPerCycle } from '@/lib/order-rules';
import { shippingLabelFor, shippingPriceFor } from '@/lib/shipping';
import { cadenceTiersForProduct } from '@/lib/shopProducts';
import { cityForZip } from '@/lib/njZips';
import {
  usePlacesAutocomplete,
  type Suggestion,
} from '@/lib/usePlacesAutocomplete';
import { cn } from '@/lib/utils';
import { checkPromoAction, type PromoCheck } from '@/lib/promo-db';
import { CheckoutCardStep } from '@/components/checkout/CheckoutCardStep';

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

/**
 * The pharmacy ships each order overnight cold-chain (refrigerated products)
 * or 2-day (everything else); the product decides, not the member, so there is
 * no tier to pick. The price per shipment is in lib/shipping, the same number
 * the server charges. Left as a list so a choice can come back without
 * rewiring the section.
 */
const SHIPPING_OPTIONS = [
  {
    id: 'expedited',
    label: 'Tracked shipping from the pharmacy',
  },
] as const;

type ShippingMethodId = (typeof SHIPPING_OPTIONS)[number]['id'];

/** The address typed so far, for this tab only, so a refresh keeps it. Cleared once the order is placed. */
const SHIPPING_DRAFT = 'el-checkout-shipping';

interface CheckoutFlowProps {
  defaultEmail: string;
  defaultName: string;
  /** Already given during the intake — never ask for it twice. */
  defaultPhone?: string;
  defaultZip?: string;
  /** The state they picked on the first intake question. */
  defaultState?: string;
  /** Absent in every environment without a Places key; the field degrades. */
  googlePlacesKey?: string;
  /** Empty when Stripe is unconfigured; the card step hides and the order
   *  can still be placed, which keeps preview environments usable. */
  stripePublishableKey?: string;
  /** The card on file ("Visa •••• 4242"), when there is one: the card step starts done. */
  savedCard?: string | null;
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

/** What the member sees when the server turns an order down. */
const ORDER_ERROR: Record<string, string> = {
  state_not_serviced: `We can only ship to ${SERVICE_AREA_OR} right now.`,
  intake_incomplete: 'Please finish your assessment before placing an order.',
  product_unavailable: 'One of these treatments is not available right now. Please review your cart.',
  empty_cart: 'Your cart is empty.',
  invalid_quantity: 'You can order up to 3 of each treatment and 5 treatments at a time.',
  invalid_address: 'Please check your shipping address.',
  promo_unavailable: 'That code is no longer available, so we removed it. Check your total and place your order again.',
  already_ordered: 'You already have one of these treatments, on a plan or on its way. Remove it to continue, or manage it in your portal.',
  not_assessed: 'One of these treatments needs a few questions of its own first.',
  duplicate_product: 'The same treatment is in your cart twice. Keep one plan to continue.',
  not_authorized: 'Please sign in to place your order.',
  default: 'We could not place your order. Please try again.',
};

export function CheckoutFlow({
  defaultEmail,
  defaultName,
  defaultPhone = '',
  defaultZip = '',
  defaultState = '',
  googlePlacesKey,
  stripePublishableKey,
  savedCard,
}: CheckoutFlowProps) {
  const router = useRouter();
  const {
    resolvedItems,
    subtotal: cartSubtotal,
    hydrated,
    removeItem,
    setCadence,
    clear: clearCart,
  } = useCart();
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
    // State comes from the first intake question; the intake ZIP names the city.
    city: cityForZip(defaultZip) ?? '',
    state: SERVICEABLE_STATES.includes(defaultState) ? defaultState : (SERVICEABLE_STATES[0] ?? ''),
    zip: defaultZip,
    phone: formatPhone(defaultPhone),
  });
  /*
   * Street suggestions, when a Places key is configured. Without one the field
   * is an ordinary input and the ZIP still fills the city, so nothing here is
   * load-bearing.
   */
  const places = usePlacesAutocomplete(googlePlacesKey);
  const [highlight, setHighlight] = useState(-1);

  const applySuggestion = async (sg: Suggestion) => {
    places.clear();
    setHighlight(-1);
    const picked = await sg.resolve();
    if (!picked) return;
    setShipping((s) => ({
      ...s,
      address1: picked.line1 || s.address1,
      city: picked.city || s.city,
      state: picked.state || s.state,
      zip: picked.zip || s.zip,
    }));
    // Straight to the apartment line — everything else is filled.
    window.setTimeout(() => address2Ref.current?.focus(), 0);
  };

  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethodId>('expedited');
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
  // Promotion code. Validated server-side on apply; the server re-derives the
  // discount at order time regardless of what we display here.
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<PromoCheck | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  // The card is captured (not charged) before the order can be placed. A card
  // already on file counts, until they choose to use a different one.
  const [cardSaved, setCardSaved] = useState(!!savedCard);
  const [newCard, setNewCard] = useState(false);
  const [notAssessed, setNotAssessed] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  // Separate, explicit consent to the charges themselves, recurring ones
  // included — the card is billed later with nobody at the keyboard.
  const [chargesAccepted, setChargesAccepted] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  // Mobile-only: collapsible order summary at top. Always expanded on lg+.
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // --- Refs for focus + scroll management ---
  const emailRef = useRef<HTMLInputElement>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const address1Ref = useRef<HTMLInputElement>(null);
  const address2Ref = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
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

  /*
   * Nothing to check out: an empty state, once the saved cart has loaded
   * (never before: that is how a full cart got bounced to the shop). There
   * used to be a stand-in line for a default product here, which meant an
   * empty cart could place a real order for something nobody chose. `placed`
   * stops the cart clearing after a successful order from flashing the empty
   * state on the way to the success page.
   */
  const placed = useRef(false);

  // Restore the address typed before a refresh, then keep it as they type.
  useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(SHIPPING_DRAFT) ?? 'null') as Record<string, unknown> | null;
      if (!saved || typeof saved !== 'object') return;
      setShipping((s) => ({
        ...s,
        ...Object.fromEntries(Object.entries(saved).filter(([k, v]) => k in s && typeof v === 'string' && v.trim())),
      }));
    } catch {
      // Storage blocked or corrupt: the form starts from the defaults.
    }
  }, []);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(SHIPPING_DRAFT, JSON.stringify(shipping));
    } catch {
      // Private mode / quota: a refresh just starts over.
    }
  }, [shipping]);

  const lines = useMemo(
    () =>
      resolvedItems.map((it) => ({
        key: `${it.productId}-${it.cadence}`,
        productId: it.productId,
        cadence: it.cadence,
        name: it.product.name,
        tiers: cadenceTiersForProduct(it.product),
        cadenceLabel: it.cadence === 'once' ? 'One-time purchase' : `${it.cadenceLabel} billing`,
        qty: it.quantity,
        perMonth: it.perMonth,
        total: it.total * it.quantity,
        // One shipment per order, and every renewal ships again.
        shipping: shippingPriceFor(it.product),
        shippingLabel: shippingLabelFor(it.product),
        sub: it.product.cycleLength,
        image: it.product.image,
        swatch: it.product.swatch,
        shot: it.product.shot,
      })),
    [resolvedItems],
  );

  const subtotal = cartSubtotal;
  // Each item is its own order and shipment; the server prices it the same way.
  const shippingCost = lines.reduce((s, l) => s + l.shipping, 0);
  const shippingLabels = [...new Set(lines.map((l) => l.shippingLabel))].join(' · ');
  // Prescription drugs carry no sales tax in NJ, NY, PA or MI; the server sets it too.
  const tax = 0;
  const discount = promo?.ok ? (promo.discountCents ?? 0) / 100 : 0;
  // The promo comes off the items only, and off shipping only when the code
  // waives it (lib/shipping orderTotalCents).
  const freeShipping = Boolean(promo?.ok && promo.includesShipping);
  const shippingPrice = freeShipping ? 'Free' : `$${shippingCost}`;
  const total = Math.max(0, subtotal - discount) + (freeShipping ? 0 : shippingCost) + tax;

  // A discount is priced on the basket it was applied to: re-price it when a plan or line changes.
  useEffect(() => {
    if (!promo?.ok || !promo.code) return;
    let stale = false;
    checkPromoAction(promo.code, Math.round(subtotal * 100))
      .then((r) => !stale && setPromo(r))
      .catch(() => {});
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  async function applyPromo() {
    if (!promoInput.trim() || promoBusy) return;
    setPromoBusy(true);
    try {
      setPromo(await checkPromoAction(promoInput, Math.round(subtotal * 100)));
    } catch {
      setPromo({ ok: false, error: 'Could not check that code.' });
    } finally {
      setPromoBusy(false);
    }
  }

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
    if (!termsAccepted || !chargesAccepted || !hasCart) return;
    setPayError(null);
    if (stripePublishableKey && !cardSaved) return;
    if (!emailValid || !shippingValid || !methodValid) return;
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

    const orderLines = resolvedItems.map((it) => ({
      productId: it.productId,
      productName: it.product.name,
      cadence: it.cadence,
      cadenceLabel: it.cadenceLabel,
      quantity: it.quantity,
      perCycle: it.total,
      image: it.product.image,
      swatch: it.product.swatch,
    }));

    /*
     * Every order goes through the server: it prices each line from the
     * catalogue, checks the state and the intake, and saves the card for a
     * charge only once the prescriber approves. Nothing is charged here.
     */
    const res = await placeOrder({
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
      promoCode: promo?.ok ? promo.code : undefined,
    });
    if (!res.ok) {
      setIsPaying(false);
      setPayError(ORDER_ERROR[res.error ?? ''] ?? ORDER_ERROR.default);
      if (res.error === 'promo_unavailable') {
        setPromo(null);
        setPromoInput('');
      }
      // The server names the product whose questions are still to answer.
      setNotAssessed(res.error === 'not_assessed' ? ((res as { productId?: string }).productId ?? null) : null);
      return;
    }
    placed.current = true;
    try {
      window.sessionStorage.removeItem(SHIPPING_DRAFT);
    } catch {
      // Nothing to clear.
    }

    // Clear the cart and route to success
    startTransition(() => {
      clearCart();
      router.push('/checkout/success');
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

  /* A New Jersey ZIP names exactly one city, so typing it fills the city in
     (the bundled map covers NJ; other states type their city). Anything they
     have typed themselves is left alone. */
  /*
   * Derive the city from the ZIP whenever the ZIP changes and the city is
   * blank. The change handler covers typing, but a browser autofill or a paste
   * can set the value without one firing — and the city sitting empty next to a
   * filled ZIP is what makes the form feel broken.
   */
  useEffect(() => {
    const city = cityForZip(shipping.zip);
    if (city && !shipping.city.trim()) {
      setShipping((s) => (s.city.trim() ? s : { ...s, city }));
    }
  }, [shipping.zip, shipping.city]);

  const onZipChange = (raw: string) =>
    setShipping((s) => {
      const zip = formatZip(raw);
      const city = cityForZip(zip);
      return { ...s, zip, city: city ?? s.city };
    });

  const onPhoneChange = (raw: string) =>
    setShipping((s) => ({ ...s, phone: formatPhone(raw) }));

  // Brand chip in card-number field
  const cardBrand = detectCardBrand(card.number);

  if (hydrated && !hasCart && !placed.current) {
    return (
      <div className="mx-auto max-w-[640px] px-5 pb-20 pt-24 text-center md:pt-32">
        <h1 className="mb-4 text-[28px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink md:text-[40px]">
          Your cart is empty.
        </h1>
        <p className="mb-8 text-[16px] leading-relaxed text-ink-soft">
          Pick a treatment and a plan, and you&rsquo;ll check out here.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/portal/shop"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-butter px-6 py-3 text-[15px] font-semibold text-ink"
          >
            Browse treatments
          </Link>
          <Link
            href="/portal"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full px-6 py-3 text-[15px] font-semibold text-ink ring-1 ring-ink/15"
          >
            Back to your portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">
      {/* ============ TOP NAV ============ */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/portal"
          className="flex items-center gap-3 text-ink"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Eternal Longevity" className="h-6 w-auto" />
          <span className="hidden text-[13px] font-medium text-ink/55 sm:inline">
            Checkout
          </span>
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-milk px-3 py-1.5 text-[13px] font-medium text-ink/70">
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
          Secure checkout
        </span>
      </div>

      <div className="grid gap-6 lg:gap-14 lg:grid-cols-[1.4fr_1fr]">
        {/* ============ ORDER SUMMARY ============
            First in DOM so it appears at top on mobile (as a collapsible card),
            but lg:order-2 puts it in the right column on desktop. */}
        <aside className="lg:order-2">
          <div className="lg:sticky lg:top-8">
            <div className="overflow-hidden rounded-shell bg-milk">
              {/* Compact mobile header. Tap to expand. Hidden on lg+ where the
                  full summary is always visible in the sidebar. */}
              <button
                type="button"
                onClick={() => setSummaryExpanded((v) => !v)}
                aria-expanded={summaryExpanded}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left lg:hidden"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-white text-ink/70">
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
                    <span className="block text-[15px] font-semibold text-ink">
                      Order summary
                    </span>
                    <span className="block text-[13px] text-ink/55">
                      {lines.length} item{lines.length === 1 ? '' : 's'} ·{' '}
                      {summaryExpanded ? 'Tap to collapse' : 'Tap to expand'}
                    </span>
                  </span>
                </span>
                <span className="flex flex-shrink-0 items-center gap-2">
                  <span className="text-[16px] font-semibold text-ink tabular-nums">
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
                      'text-ink/55 transition-transform duration-300',
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
                    ? 'block border-t border-ink/10 lg:border-t-0'
                    : 'hidden'
                )}
              >
                <div className="mb-5 hidden lg:flex items-center justify-between">
                  <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">
                    Order details
                  </h2>
                  <span className="text-[13px] font-medium text-ink/55">
                    {lines.length} item{lines.length === 1 ? '' : 's'}
                  </span>
                </div>

                <ul className="mb-5 border-t border-ink/10">
                  {lines.map((l) => (
                    <li key={l.key} className="flex gap-3 border-b border-ink/10 py-4">
                      <div
                        className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-thumb bg-milk-deep"
                        style={l.shot ? undefined : { background: l.swatch }}
                      >
                        <Image
                          src={l.image}
                          alt={l.name}
                          fill
                          sizes="64px"
                          className={l.shot ? 'object-cover' : 'object-cover opacity-50'}
                        />
                      </div>
                      <div className="flex flex-1 min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-semibold text-ink">
                            {l.name}
                          </div>
                          {l.tiers.length > 1 ? (
                            <select
                              aria-label={`Plan for ${l.name}`}
                              value={l.cadence}
                              onChange={(e) => setCadence(l.productId, l.cadence, e.target.value as Cadence)}
                              className="mt-1 w-full max-w-[260px] rounded-full bg-white py-1 pl-3 pr-2 text-[16px] font-medium text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-2 focus:ring-ink/20 lg:text-[13px]"
                            >
                              {l.tiers.map((t) => (
                                <option key={t.key} value={t.key}>
                                  {t.key === 'once' ? 'One-time purchase' : `${t.label} billing`} · ${t.total}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="mt-0.5 text-[13px] font-medium text-ink/60">
                              {l.cadenceLabel}
                            </div>
                          )}
                          <div className="mt-0.5 text-[13px] text-ink/55">
                            {l.sub} · Qty {l.qty}
                          </div>
                          <div className="mt-0.5 text-[13px] text-ink/55">
                            {l.shippingLabel} ${l.shipping}
                          </div>
                          {l.productId && l.cadence && (
                            <button
                              type="button"
                              onClick={() =>
                                removeItem(
                                  l.productId as string,
                                  l.cadence as Cadence
                                )
                              }
                              className="mt-1.5 text-[13px] text-ink/55 underline decoration-ink/30 underline-offset-[3px] transition-colors hover:text-red-700 hover:decoration-red-700"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="text-[15px] font-semibold text-ink tabular-nums">
                          ${l.total}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mb-5 flex items-center gap-2 text-[13px] text-ink/60">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-butter text-ink">
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
                  <span className="font-medium text-ink">Prescription required</span>
                  <span>· 503A compounded</span>
                </div>

                <div className="space-y-2 border-t border-ink/10 pt-4 text-[15px]">
                  <SummaryRow label="Subtotal" value={`$${subtotal}`} />
                  <SummaryRow
                    label="Shipping"
                    value={shippingPrice}
                  />
                  {promo?.ok && (
                    <SummaryRow
                      label={`Discount · ${promo.code}`}
                      value={`-$${discount.toFixed(2)}`}
                    />
                  )}

                  <div className="mt-3 flex gap-2">
                    <input
                      aria-label="Promotion code"
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value.toUpperCase());
                        setPromo(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void applyPromo();
                        }
                      }}
                      placeholder="Promo code"
                      className="min-w-0 flex-1 rounded-inner bg-white px-4 py-3 text-[16px] uppercase text-ink ring-1 ring-ink/10 placeholder:normal-case placeholder:text-ink/40 transition-shadow focus:outline-none focus:ring-2 focus:ring-ink/20"
                    />
                    <button
                      type="button"
                      onClick={applyPromo}
                      disabled={!promoInput.trim() || promoBusy}
                      className="flex-none rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:bg-milk-deep disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {promoBusy ? '…' : 'Apply'}
                    </button>
                  </div>
                  {promo && (
                    <p
                      role={promo.ok ? 'status' : 'alert'}
                      className={cn(
                        'mt-1.5 text-[13px]',
                        promo.ok ? 'text-ink' : 'text-red-600',
                      )}
                    >
                      {promo.ok ? `${promo.label} applied.` : promo.error}
                    </p>
                  )}

                  <div className="my-2 h-px bg-ink/10" />
                  <SummaryRow
                    label="Total if approved"
                    value={`$${total}`}
                    emphasis
                  />
                </div>

                <div className="mt-5 rounded-inner bg-butter-soft px-4 py-3 text-[13px] leading-relaxed text-ink/70 ring-1 ring-butter-deep/40">
                  <span className="font-semibold text-ink">
                    Nothing is charged today.
                  </span>{' '}
                  You only pay if your prescriber approves your treatment.
                </div>

              </div>
            </div>
          </div>
        </aside>

        {/* ============ LEFT. FORM SECTIONS ============ */}
        <div className="lg:order-1 space-y-3">
          <h1
            className="mb-6 text-[40px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[56px]"
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
            <FieldLabel htmlFor="co-email">Email</FieldLabel>
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
            <p className="mt-2 text-[13px] text-ink/55">
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
                <div className="mb-2 text-[13px] font-medium text-ink/70">
                  Ship to
                </div>
                {profile.addresses.map((a) => {
                  const isActive = selectedAddressId === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAddressId(a.id)}
                      className={cn(
                        'flex w-full items-start gap-4 rounded-inner px-5 py-4 text-left transition-[box-shadow,background-color]',
                        isActive
                          ? 'bg-white ring-2 ring-ink'
                          : 'bg-milk ring-1 ring-transparent hover:bg-milk-deep'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2 transition-all',
                          isActive ? 'border-ink' : 'border-ink/30'
                        )}
                      >
                        {isActive && (
                          <span className="h-2.5 w-2.5 rounded-full bg-ink" />
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-semibold text-ink">
                            {a.label}
                          </span>
                          {a.isPrimary && (
                            <span className="rounded-full bg-butter px-2 py-0.5 text-[12px] font-medium text-ink">
                              Primary
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[15px] text-ink">
                          {a.fullName}
                        </span>
                        <span className="mt-0.5 block text-[13px] text-ink/55">
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
                    'flex w-full items-center gap-4 rounded-inner border border-dashed px-5 py-4 text-left transition-colors',
                    selectedAddressId === 'new'
                      ? 'border-ink bg-white'
                      : 'border-ink/25 bg-white hover:border-ink/50'
                  )}
                >
                  <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-milk text-[13px] text-ink/70">
                    +
                  </span>
                  <span className="text-[15px] font-medium text-ink">
                    Use a new address
                  </span>
                </button>
              </div>
            )}

            {/* New-address form: render when 'new' is selected OR no saved addresses */}
            {(selectedAddressId === 'new' || profile.addresses.length === 0) && (
            <div className="grid gap-4">
              <div>
                <FieldLabel htmlFor="ship-name">Full name</FieldLabel>
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
                <FieldLabel htmlFor="ship-addr1">Street address</FieldLabel>
                <div className="relative">
                  <input
                    ref={address1Ref}
                    id="ship-addr1"
                    type="text"
                    value={shipping.address1}
                    onChange={(e) => {
                      const v = e.target.value;
                      setShipping((s) => ({ ...s, address1: v }));
                      setHighlight(-1);
                      void places.search(v);
                    }}
                    onBlur={() => window.setTimeout(places.clear, 150)}
                    onKeyDown={(e) => {
                      if (places.suggestions.length) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setHighlight((h) =>
                            Math.min(h + 1, places.suggestions.length - 1),
                          );
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setHighlight((h) => Math.max(h - 1, 0));
                          return;
                        }
                        if (e.key === 'Escape') {
                          places.clear();
                          return;
                        }
                        if (e.key === 'Enter' && highlight >= 0) {
                          e.preventDefault();
                          void applySuggestion(places.suggestions[highlight]);
                          return;
                        }
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        zipRef.current?.focus();
                      }
                    }}
                    role="combobox"
                    aria-expanded={places.suggestions.length > 0}
                    aria-autocomplete="list"
                    aria-controls="ship-addr-suggestions"
                    autoComplete={places.enabled ? 'off' : 'address-line1'}
                    autoCapitalize="words"
                    className={inputClass}
                  />

                  {places.suggestions.length > 0 && (
                    <ul
                      id="ship-addr-suggestions"
                      role="listbox"
                      className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-shell bg-white shadow-[0_24px_60px_-24px_rgba(17,17,17,0.35)] ring-1 ring-ink/10"
                    >
                      {places.suggestions.map((sg, i) => (
                        <li key={sg.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={i === highlight}
                            onMouseEnter={() => setHighlight(i)}
                            // mousedown, not click: blur fires first otherwise
                            // and the list is gone before the click lands.
                            onMouseDown={(e) => {
                              e.preventDefault();
                              void applySuggestion(sg);
                            }}
                            className={cn(
                              'block w-full px-4 py-3 text-left text-[15px] transition-colors',
                              i === highlight
                                ? 'bg-milk text-ink'
                                : 'text-ink/75 hover:bg-milk',
                            )}
                          >
                            {sg.text}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="ship-addr2">Apt / suite (optional)</FieldLabel>
                <input
                  ref={address2Ref}
                  id="ship-addr2"
                  type="text"
                  value={shipping.address2}
                  onChange={(e) =>
                    setShipping((s) => ({ ...s, address2: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      zipRef.current?.focus();
                    }
                  }}
                  autoComplete="address-line2"
                  autoCapitalize="words"
                  className={inputClass}
                />
              </div>
              {/*
                ZIP first, then city. The city is derived from the ZIP, so
                asking for it first meant reaching an empty field with nothing
                to fill it from — which reads as a form that does not work.
              */}
              <div className="grid gap-4 sm:grid-cols-[1fr_2fr_1fr]">
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
                        cityRef.current?.focus();
                      }
                    }}
                    autoComplete="postal-code"
                    placeholder="07512"
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="ship-city">City</FieldLabel>
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
                        phoneRef.current?.focus();
                      }
                    }}
                    autoComplete="address-level2"
                    autoCapitalize="words"
                    placeholder="Fills from your ZIP"
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="ship-state">State</FieldLabel>
                  {/* Only the states we serve can be chosen; the server enforces the same list. */}
                  <select
                    id="ship-state"
                    value={shipping.state}
                    onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))}
                    autoComplete="address-level1"
                    className={inputClass}
                  >
                    {SERVICEABLE_STATES.map((st) => (
                      <option key={st} value={st}>
                        {STATE_NAMES[st] ?? st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="ship-phone">Phone</FieldLabel>
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
                <p className="mt-2 text-[13px] text-ink/55">
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
                ? `${shippingLabels} · ${shippingPrice}`
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
                      'flex w-full items-center gap-4 rounded-inner px-5 py-4 text-left transition-[box-shadow,background-color]',
                      isActive
                        ? 'bg-white ring-2 ring-ink'
                        : 'bg-milk ring-1 ring-transparent hover:bg-milk-deep'
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2 transition-all',
                        isActive ? 'border-ink' : 'border-ink/30'
                      )}
                    >
                      {isActive && (
                        <span className="h-2.5 w-2.5 rounded-full bg-ink" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-semibold text-ink">
                        {opt.label}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-ink/55">
                        {shippingLabels}
                      </span>
                    </span>
                    <span className="flex-shrink-0 text-[15px] font-semibold text-ink tabular-nums">
                      {freeShipping ? 'Free' : `+$${shippingCost}`}
                    </span>
                  </button>
                );
              })}
            </div>
            <ContinueButton disabled={!methodValid} onClick={continueMethod}>
              Continue to payment
            </ContinueButton>
          </Section>

          {/* === SECTION 4. REVIEW & PLACE === */}
          <Section
            number="4"
            title="Review & place order"
            isOpen={open === 'payment'}
            isComplete={completed.payment}
            summary=""
            disabled={!completed.method}
            onEdit={() => setOpen('payment')}
            sectionRef={sectionRefs.payment}
          >
            <div className="rounded-inner bg-milk px-5 py-5">
              <p className="mb-1 text-[14px] font-semibold text-ink">
                Not charged until approved
              </p>
              <p className="text-[15px] leading-relaxed text-ink-soft">
                Your card is saved now but not charged. Your prescriber reviews
                your visit first — if they approve, this card is charged and
                your prescription goes straight to the pharmacy. If they decide
                this treatment isn&apos;t right for you, it is never charged.
              </p>
              {/* A plan renewing on an existing prescription is not a new
                  clinical decision; a different product is. Saying so stops a
                  returning member expecting a review that will not happen, and
                  a plan member fearing one that will. */}
              <p className="mt-2 text-[15px] leading-relaxed text-ink/55">
                A plan keeps shipping on this prescription until it expires. A
                different product is a new prescription, so it is reviewed
                again.
              </p>
            </div>

            {stripePublishableKey && (
              <div className="mt-4">
                <p className="mb-2.5 text-[13px] font-medium text-ink/70">
                  Payment method
                </p>
                {savedCard && !newCard ? (
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-inner bg-butter-soft px-4 py-3.5 ring-1 ring-butter-deep/40">
                    <span className="text-[15px] font-medium text-ink">{savedCard}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCard(true);
                        setCardSaved(false);
                      }}
                      className="text-[14px] text-ink/70 underline decoration-ink/30 underline-offset-[3px] hover:text-ink"
                    >
                      Use a different card
                    </button>
                  </div>
                ) : (
                  <CheckoutCardStep
                    publishableKey={stripePublishableKey}
                    amountLabel={`$${total}`}
                    amountCents={Math.round(total * 100)}
                    saved={cardSaved}
                    onSaved={() => setCardSaved(true)}
                  />
                )}
              </div>
            )}

            <div className="mt-4 flex items-baseline justify-between border-t border-ink/10 pt-4">
              <span className="text-[15px] text-ink/60">Total if approved</span>
              <span className="text-[22px] font-semibold tracking-[-0.03em] tabular-nums text-ink">
                ${total}
              </span>
            </div>

            <label className="mt-5 flex cursor-pointer gap-3 rounded-inner bg-milk px-4 py-4 text-[14px] leading-relaxed text-ink-soft">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 flex-none accent-ink"
              />
              <span>
                I am 18 or older and a resident of {SERVICE_AREA_OR}, the health
                information I provided is accurate and complete, and I agree to
                the{' '}
                <Link href="/legal/terms" className="text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink" target="_blank">
                  Terms of Service
                </Link>
                ,{' '}
                <Link href="/legal/consent" className="text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink" target="_blank">
                  Informed Consent
                </Link>
                ,{' '}
                <Link href="/legal/refunds" className="text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink" target="_blank">
                  Refund Policy
                </Link>{' '}
                and{' '}
                <Link href="/legal/privacy" className="text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink" target="_blank">
                  Privacy Policy
                </Link>
                . I understand this order is a request for a prescriber to
                review, not a guarantee of one, and that nothing is charged
                unless my treatment is approved.
              </span>
            </label>

            {/* Recurring-charge authorization, built from the cart itself so
                every amount and interval shown is the one that will bill. */}
            <label className="mt-3 flex cursor-pointer gap-3 rounded-inner bg-milk px-4 py-4 text-[14px] leading-relaxed text-ink-soft">
              <input
                type="checkbox"
                checked={chargesAccepted}
                onChange={(e) => setChargesAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 flex-none accent-ink"
              />
              <span>
                If my prescriber approves, I authorize {SITE_NAME} to charge the
                card I saved ${total} for this order. After that:
                {lines.map((l) => {
                  const n = monthsPerCycle(l.cadence);
                  return (
                    <span key={l.key} className="mt-1 block pl-3">
                      · {l.name}
                      {l.qty > 1 ? ` ×${l.qty}` : ''}:{' '}
                      {l.cadence === 'once'
                        ? 'a single charge, included above. It does not renew.'
                        : `$${l.total} + $${l.shipping} shipping = $${l.total + l.shipping} every ${n === 1 ? 'month' : `${n} months`}, automatically, until I cancel.`}
                    </span>
                  );
                })}
                <span className="mt-1.5 block">
                  I can cancel a plan anytime in{' '}
                  <Link href="/portal/subscriptions" className="text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink" target="_blank">
                    Portal › Subscriptions
                  </Link>
                  ; cancelling stops the next charge.
                </span>
              </span>
            </label>

            <button
              type="button"
              onClick={handlePay}
              disabled={isPaying || !termsAccepted || !chargesAccepted || !hasCart || (!!stripePublishableKey && !cardSaved)}
              className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-butter px-6 py-3.5 text-[16px] font-semibold text-ink transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-butter-deep disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-butter"
            >
              {isPaying && (
                <span
                  aria-hidden
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink"
                />
              )}
              {isPaying ? 'Placing order…' : 'Place order'}
            </button>
            {payError && (
              <p role="alert" className="mt-3 text-center text-[14px] text-red-600">
                {payError}
                {notAssessed && (
                  <>
                    {' '}
                    <Link
                      href={`/start?product=${encodeURIComponent(notAssessed)}`}
                      className="font-semibold text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
                    >
                      Answer them now
                    </Link>
                  </>
                )}
              </p>
            )}
            <p className="mt-3 text-center text-[13px] leading-relaxed text-ink/55">
              Placing an order costs nothing. You can pause or cancel between
              cycles at any time.
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
  'w-full rounded-inner bg-milk px-4 py-3.5 text-[16px] text-ink ring-1 ring-transparent placeholder:text-ink/40 transition-[box-shadow,background-color] focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink/20';

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
      className="mb-2 block text-[13px] font-medium text-ink/70"
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
      className="mt-6 w-full rounded-full bg-ink px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ink sm:w-auto"
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
        'scroll-mt-4 rounded-shell bg-white ring-1 transition-[box-shadow,opacity]',
        isOpen
          ? 'ring-ink/15 shadow-[0_24px_60px_-34px_rgba(17,17,17,0.35)]'
          : disabled
            ? 'opacity-60 ring-ink/10'
            : 'ring-ink/10'
      )}
    >
      <header className="flex items-center justify-between gap-3 px-5 py-4 md:px-7">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              'grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular-nums',
              isComplete
                ? 'bg-butter text-ink'
                : isOpen
                  ? 'bg-ink text-white'
                  : 'bg-milk text-ink/55'
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
            <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
              {title}
            </h3>
            {!isOpen && summary && (
              <p className="mt-0.5 truncate text-[13px] text-ink/55">
                {summary}
              </p>
            )}
          </div>
        </div>
        {isComplete && !isOpen && (
          <button
            type="button"
            onClick={onEdit}
            className="flex-shrink-0 rounded-full bg-milk px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-milk-deep"
          >
            Edit
          </button>
        )}
      </header>
      {isOpen && (
        <div className="px-5 pb-6 pt-1 md:px-7 md:pb-7">{children}</div>
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
        emphasis ? 'text-[17px] font-semibold text-ink' : 'text-ink/70'
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
      className="flex min-h-[44px] items-center gap-3 rounded-inner bg-milk px-4 py-3 text-left transition-colors hover:bg-milk-deep"
    >
      <span
        className={cn(
          'grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border-2 transition-colors',
          checked ? 'border-ink bg-ink text-white' : 'border-ink/25 bg-white'
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
      <span className="text-[15px] text-ink">{label}</span>
    </button>
  );
}
