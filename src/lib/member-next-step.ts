import 'server-only';

import { isFailedRefill, type Order } from '@/lib/orders';
import type { CartItem } from '@/lib/cartTypes';
import type { IntakeState } from '@/lib/intake-status';
import { getAnyShopProduct } from '@/lib/shopProducts';
import { TERMINAL_ORDER } from '@/lib/order-rules';

export interface NextStep {
  eyebrow: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
}


/**
 * The one thing a member should do next, named for the product it is about.
 * The doctor's question and an unfinished assessment are shown before this by
 * the dashboard; an order already placed is shown as the latest order instead.
 * null = nothing is waiting on them.
 */
export function memberNextStep(input: {
  state: IntakeState;
  latestAnswers: Record<string, unknown>;
  orders: Order[];
  cart: CartItem[];
  photosOwed: boolean;
  hasDraft: boolean;
  /** The newest intake was sent back for more information. */
  needsInfo?: boolean;
}): NextStep | null {
  const { state, latestAnswers, orders, cart, photosOwed, hasDraft, needsInfo } = input;
  // Newest first, whatever order the caller passed them in.
  const byNewest = [...orders].sort((a, b) => b.placedAt - a.placedAt);

  // Approved and waiting on money: nothing ships until this is done.
  const owed = byNewest.find((o) => o.status === 'signed');
  if (owed) {
    const name = owed.lines.map((l) => l.productName).join(' + ') || 'order';
    return isFailedRefill(owed)
      ? {
          eyebrow: 'Payment needed',
          title: `Your ${name} refill didn’t go through`,
          body: 'Your card was declined, so your plan is paused. Update your card and we’ll restart it.',
          cta: { label: 'Update your card', href: '/portal/account' },
        }
      : {
          eyebrow: 'Payment needed',
          title: `Dr. Elder approved your ${name}`,
          body: 'Complete payment and we’ll send it to the pharmacy. Nothing ships until then.',
          cta: { label: 'Complete payment', href: `/portal/orders/pay/${encodeURIComponent(owed.id)}` },
        };
  }

  if (state === 'declined') {
    return {
      eyebrow: 'Your last visit',
      title: 'Your last visit was closed',
      body: 'If something has changed, message your care team and they can reopen it.',
      cta: { label: 'Message your care team', href: '/portal/messages' },
    };
  }
  if (state === 'awaiting_visit') {
    return {
      eyebrow: 'Next step',
      title: 'Finish your visit',
      body: 'A few medical questions are left before Dr. Elder can review your order.',
      cta: { label: 'Finish your visit', href: '/portal/visit' },
    };
  }
  // intakeStateFor counts this as 'submitted', so it must come before the
  // "assessment complete, choose your plan" step below.
  if (needsInfo) {
    return {
      eyebrow: 'Next step',
      title: 'Dr. Elder needs a bit more information',
      body: 'Our team sent you a quick question. Reply in your messages and your visit goes on to review.',
      cta: { label: 'Read and reply', href: '/portal/messages?thread=support' },
    };
  }
  if (photosOwed) {
    return {
      eyebrow: 'Next step',
      title: 'Add your photos',
      body: 'Two or three quick photos from your phone. Dr. Elder reviews your order once they are in.',
      cta: { label: 'Add photos', href: '/portal/visit' },
    };
  }

  const productId = typeof latestAnswers.requestedProductId === 'string' ? latestAnswers.requestedProductId : null;
  const product = productId ? getAnyShopProduct(productId) : null;
  if (state === 'submitted' && product) {
    // A decision on this product is the answer, not an invitation to buy it.
    const last = byNewest.find((o) => o.lines.some((l) => l.productId === product.id));
    if (last?.status === 'declined-clinical') {
      return {
        eyebrow: 'Your prescriber’s decision',
        title: `Dr. Elder didn’t approve ${product.name}`,
        body: 'His note is on your order, and you have not been charged. If you have questions, message him directly.',
        cta: { label: 'Message Dr. Elder', href: '/portal/messages?thread=doctor' },
      };
    }
    if (last?.status === 'denied-admin') {
      // Closed by the team, not the prescriber: don't say he decided anything.
      return {
        eyebrow: 'Your order',
        title: `Your ${product.name} order was cancelled`,
        body: 'The reason is on your order. If you were charged, it is refunded in full. Questions? Message your care team.',
        cta: { label: 'Message your care team', href: '/portal/messages?thread=support' },
      };
    }
    const ordered = orders.some(
      (o) => !TERMINAL_ORDER.includes(o.status) && o.lines.some((l) => l.productId === product.id),
    );
    if (!ordered) {
      const inCart = cart.length > 0;
      return {
        eyebrow: 'Next step',
        title: `Your ${product.name} assessment is complete`,
        body: inCart
          ? 'Check out to send it to Dr. Elder. Your card is charged only if he approves.'
          : 'Choose your plan and check out to send it to Dr. Elder. Your card is charged only if he approves.',
        cta: inCart
          ? { label: 'Check out', href: '/checkout' }
          : { label: 'Choose your plan', href: `/shop/${product.id}` },
      };
    }
    return null;
  }

  if (!orders.length && !hasDraft) {
    return {
      eyebrow: 'Get started',
      title: 'Start your first visit',
      body: 'A few minutes of questions. A licensed physician reviews them and decides whether to prescribe.',
      cta: { label: 'Find your treatment', href: '/start' },
    };
  }
  return null;
}
