import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { getSession, loginUrl } from '@/lib/auth-server';
import { intakeStateFor } from '@/lib/intake-status';
import { checkoutPrefill } from '@/lib/checkout-prefill';
import { cardOnFile, frameAccountFor, paymentsConfigured } from '@/lib/payments';
import { supabaseAdminConfigured } from '@/lib/supabase/admin';
import Link from 'next/link';
import { latestIntakeAnswers } from '@/lib/intake-status';
import { loadCart } from '@/lib/profile-db';
import { intakeCovers } from '@/lib/purchase-rules';
import { heldProductsFor } from '@/lib/held-products';
import { getAnyShopProduct } from '@/lib/shopProducts';

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
  if ((await intakeStateFor(user.id)) !== 'submitted') {
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
  if (supabaseAdminConfigured()) {
    const [{ items }, answers, holding] = await Promise.all([
      loadCart(),
      latestIntakeAnswers(user.id),
      heldProductsFor(user.id),
    ]);
    held = Object.fromEntries([...holding].filter(([id]) => items.some((i) => i.productId === id)));
    const owed = [...new Set(items.map((i) => i.productId))]
      .filter((id) => !intakeCovers(answers, id))
      .map((id) => ({ id, name: getAnyShopProduct(id)?.name ?? 'This treatment' }));
    if (owed.length) {
      const first = owed[0];
      return (
        <main className="relative min-h-screen bg-white text-ink">
          <div className="mx-auto max-w-[640px] px-5 pb-20 pt-24 text-center md:pt-32">
            <h1 className="mb-4 text-[28px] font-semibold leading-[1.05] tracking-[-0.04em] [text-wrap:balance] md:text-[40px]">
              {owed.length === 1
                ? `A few questions about ${first.name} first.`
                : 'A few questions first.'}
            </h1>
            <p className="mb-8 text-[16px] leading-relaxed text-ink-soft">
              Dr. Elder reviews every treatment on its own, so each one needs its medical questions answered before
              checkout. It takes a few minutes, your details are already filled in, and you come straight back here.
            </p>
            <div className="flex flex-col items-center gap-3">
              {owed.map((p) => (
                <Link
                  key={p.id}
                  href={`/start?product=${encodeURIComponent(p.id)}`}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-butter px-6 py-3 text-[15px] font-semibold text-ink"
                >
                  Answer the {p.name} questions
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
   * They gave us a phone and a ZIP during the intake. Asking for them again at
   * checkout is asking someone to prove they meant it.
   */
  const cards = cardsEnabled();
  /*
   * The account is created here on a first checkout rather than on save, so
   * the card field can link this session's fraud signals to it (Frame.init).
   */
  const [prefill, savedCard, paymentAccountId] = await Promise.all([
    checkoutPrefill(user.id),
    cards ? savedCardFor(user.id) : null,
    cards ? frameAccountFor(user.id).catch(() => null) : null,
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
      />
    </main>
  );
}
