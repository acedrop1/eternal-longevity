import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { getSession, loginUrl } from '@/lib/auth-server';
import { assessmentDone, intakeStateFor } from '@/lib/intake-status';
import { checkoutPrefill } from '@/lib/checkout-prefill';
import { cardOnFile, frameAccountFor, paymentsConfigured } from '@/lib/payments';
import { supabaseAdminConfigured } from '@/lib/supabase/admin';
import Link from 'next/link';
import { latestIntakeAnswers, reassessNeeded } from '@/lib/intake-status';
import { loadCart } from '@/lib/profile-db';
import { intakeCovers } from '@/lib/purchase-rules';
import { heldProductsFor } from '@/lib/held-products';
import { getAnyShopProduct } from '@/lib/shopProducts';
import { getShippingSettings } from '@/lib/shipping-settings';
import { firstBoxFree } from '@/lib/first-box';
import { getLiveProducts } from '@/lib/catalog';
import { PRODUCT_CATEGORY } from '@/lib/intake-categories';
import { intakeProductIds } from '@/lib/intake-rules';

export const metadata: Metadata = {
  title: 'Checkout',
};

/** Card entry needs the server key (to save) and the browser key (to render the field). */
function cardsEnabled(): boolean {
  return paymentsConfigured() && Boolean(process.env.NEXT_PUBLIC_FRAME_PUBLISHABLE_KEY);
}

/** The card on file ("Visa •••• 4242"), as the approval charge will find it (cardOnFile). */
async function savedCardFor(userId: string): Promise<string | null> {
  const card = await cardOnFile(userId).catch(() => null);
  if (!card) return null;
  return `${card.brand.charAt(0).toUpperCase()}${card.brand.slice(1)} \u2022\u2022\u2022\u2022 ${card.last4}`;
}

export default async function CheckoutPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'member') redirect(user.redirectTo);

  /*
   * The prescriber cannot review someone who has told us nothing. Send them to
   * the medical visit first rather than letting them fill in an address and a
   * card only to be rejected by the server at the end.
   */
  const intakeState = await intakeStateFor(user.id);
  if (!assessmentDone(intakeState)) {
    redirect('/portal/visit');
  }

  /*
   * Every product in the cart needs its own questions answered before it can
   * be checked out, not just an assessment for something. Stop here, before an
   * address and a card, rather than at Place order (which enforces it too).
   * Demo stores no intakes, so it skips this. Products they already have
   * (an order on its way, a plan) are flagged on their lines up front too.
   */
  let held: Record<string, 'order' | 'plan'> = {};
  let answers: Record<string, unknown> = {};
  let holding = new Map<string, 'order' | 'plan'>();
  let cartIds: string[] = [];
  if (supabaseAdminConfigured()) {
    const [{ items }, onFile, holds, redo] = await Promise.all([
      loadCart(),
      latestIntakeAnswers(user.id),
      heldProductsFor(user.id),
      reassessNeeded(user.id),
    ]);
    answers = onFile;
    holding = holds;
    cartIds = items.map((i) => i.productId);
    held = Object.fromEntries([...holding].filter(([id]) => items.some((i) => i.productId === id)));
    // Never asked, or declined by Dr. Elder and not answered again since: questions first, before address or card.
    const owed = [...new Set(items.map((i) => i.productId))]
      .filter((id) => !intakeCovers(answers, id) || redo.has(id))
      .map((id) => ({ id, name: getAnyShopProduct(id)?.name ?? 'This treatment', declined: redo.get(id) }));
    if (owed.length) {
      const first = owed[0];
      const declinedOn = first.declined
        ? new Date(first.declined.declinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })
        : null;
      return (
        <main className="relative min-h-screen bg-white text-ink">
          <div className="mx-auto max-w-[640px] px-5 pb-20 pt-24 text-center md:pt-32">
            <h1 className="mb-4 text-[28px] font-semibold leading-[1.05] tracking-[-0.04em] [text-wrap:balance] md:text-[40px]">
              {declinedOn
                ? `Update your answers for ${first.name}.`
                : owed.length === 1
                  ? `A few questions about ${first.name} first.`
                  : 'A few questions first.'}
            </h1>
            {declinedOn ? (
              <p className="mb-8 rounded-inner bg-butter-soft px-5 py-4 text-left text-[16px] leading-relaxed text-ink ring-1 ring-butter-deep/50">
                Dr. Elder didn&rsquo;t approve {first.name} on {declinedOn}, so he needs your current answers before you
                order it again. Your last answers are filled in: check each one, update anything that&rsquo;s changed,
                and you come straight back here. You&rsquo;re charged only if he approves.
              </p>
            ) : (
              <p className="mb-8 text-[16px] leading-relaxed text-ink-soft">
                Dr. Elder reviews every treatment on its own, so each one needs its medical questions answered before
                checkout. It takes a few minutes, your details are already filled in, and you come straight back here.
              </p>
            )}
            <div className="flex flex-col items-center gap-3">
              {owed.map((p) => (
                <Link
                  key={p.id}
                  href={`/start?product=${encodeURIComponent(p.id)}`}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-butter px-6 py-3 text-[15px] font-semibold text-ink"
                >
                  {p.declined ? `Update my ${p.name} answers` : `Answer the ${p.name} questions`}
                </Link>
              ))}
              <Link
                href="/portal"
                className="mt-2 text-[14px] text-ink-soft underline decoration-ink/30 underline-offset-[3px] hover:text-ink"
              >
                Back to your portal
              </Link>
            </div>
          </div>
        </main>
      );
    }
  }

  /*
   * Add-ons (Admin → Products → Add-on at checkout): live, needing no new
   * questions from this member (intakeCovers, so placeOrder accepts them), not
   * something they already have, and meant for a treatment area they're here
   * for. Demo has no intake, so only products with no questions qualify.
   */
  const areas = new Set<string>(
    [
      ...[...intakeProductIds(answers), ...cartIds].map((id): string => PRODUCT_CATEGORY[id] ?? ''),
      ...[answers.entryCategory, answers.goal_category].filter((v): v is string => typeof v === 'string'),
    ].filter(Boolean),
  );
  const addons = (await getLiveProducts())
    .filter(
      (p) =>
        p.addon &&
        intakeCovers(answers, p.id) &&
        !holding.has(p.id) &&
        (!p.addonFor?.length || p.addonFor.some((a) => areas.has(a))),
    )
    .map((p) => p.id);

  /*
   * They gave us a phone and a ZIP during the intake. Asking for them again at
   * checkout is asking someone to prove they meant it.
   */
  const cards = cardsEnabled();
  /*
   * The account is created here on a first checkout rather than on save, so
   * the card field can link this session's fraud signals to it (Frame.init).
   */
  // Shipping is shown exactly as placeOrder will charge it (lib/first-box).
  const [prefill, savedCard, paymentAccountId, shipSettings, freeBox] = await Promise.all([
    checkoutPrefill(user.id),
    cards ? savedCardFor(user.id) : null,
    cards ? frameAccountFor(user.id).catch(() => null) : null,
    getShippingSettings(),
    firstBoxFree(user.id),
  ]);

  return (
    <main className="relative min-h-screen bg-white text-ink">
      <CheckoutFlow
        defaultEmail={user.email}
        defaultName={prefill.fullName || user.name}
        defaultPhone={prefill.phone}
        defaultZip={prefill.zip}
        defaultState={prefill.state}
        googlePlacesKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY}
        savedCard={savedCard}
        held={held}
        cardsEnabled={cards}
        paymentAccountId={paymentAccountId ?? undefined}
        pricePerShipment={shipSettings.pricePerShipment}
        firstBoxFree={freeBox}
        addons={addons}
        healthNext={intakeState === 'awaiting_visit'}
      />
    </main>
  );
}
