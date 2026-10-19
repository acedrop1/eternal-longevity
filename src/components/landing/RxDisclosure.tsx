import Link from 'next/link';
import { getShippingSettings } from '@/lib/shipping-settings';

/**
 * The paid-landing disclosure (Mo's Account and Website Setup Brief, section 2:
 * "Align the prescription destination"): prescription requirement, eligibility,
 * service states, compounded status, safety pointer, and the real pricing and
 * renewal terms. Same words on /hair and every landing page.
 */
export async function RxDisclosure({ safetyHref }: { safetyHref: string }) {
  const ship = await getShippingSettings();
  const shipping =
    ship.pricePerShipment === 0
      ? 'Shipping is free.'
      : `Shipping is $${ship.pricePerShipment} per box${ship.firstOrderFree ? ' (your first box ships free)' : ''}.`;
  return (
    <div className="mx-auto mt-6 max-w-3xl space-y-2 rounded-inner bg-milk px-5 py-4 text-[13px] leading-relaxed text-ink/75">
      <p>
        <span className="font-semibold text-ink">Pricing. </span>
        &ldquo;From&rdquo; prices are per month on the longest plan. Each plan is billed up front for its length (1, 3, 6 or 12
        months), only if a physician approves. {shipping} Plans renew automatically at the same interval until you cancel;
        cancel anytime in your portal.
      </p>
      <p>
        Prescription required after review by a licensed physician. Treatment is not guaranteed. Available to adults 18 and
        older in New Jersey, New York, Pennsylvania and Michigan. Compounded medications are not FDA-approved; the FDA does not
        verify their safety, effectiveness or quality. See the applicable{' '}
        <Link href={safetyHref} className="text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink">
          product safety information
        </Link>
        .
      </p>
    </div>
  );
}
