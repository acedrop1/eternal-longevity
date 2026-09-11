import { getSession } from '@/lib/auth-server';
import { intakeStateFor } from '@/lib/intake-status';
import type { Order } from '@/lib/orders';

export interface OnboardingStep {
  key: string;
  title: string;
  /** Exactly what this step collects, in the member's own words. */
  collects: string[];
  done: boolean;
  /** Where the member goes to finish it, when they can. */
  href?: string;
  action?: string;
}

/**
 * What a member has to provide before a prescriber can review them, and how
 * far along they are.
 *
 * Two jobs. For a new member it answers "what is this going to ask me and how
 * much is left" without making them start to find out. For anyone auditing the
 * practice — a payment processor, a certification reviewer, a state board — it
 * puts the full data-collection requirement on one screen, which is otherwise
 * only visible by completing an intake end to end.
 *
 * Every item reflects the real schema in `intakeSchema.ts`. If a question is
 * added or dropped there, this list has to move with it.
 */
export async function getOnboardingSteps(
  orders: Order[],
): Promise<OnboardingStep[]> {
  const user = await getSession();

  const state = user ? await intakeStateFor(user.id) : 'none';
  // An intake exists at all — the pre-purchase questions and consents are in.
  const intakeStarted = state !== 'none';
  // The clinical visit is done once the intake is no longer waiting on it.
  const visitDone = state === 'submitted';

  const hasShipping = orders.some((o) => Boolean(o.shippingAddress?.line1));
  const reviewed = orders.some((o) =>
    ['signed', 'paid', 'declined-clinical', 'compounding', 'shipped', 'delivered'].includes(
      o.status,
    ),
  );

  return [
    {
      key: 'account',
      title: 'Create your account',
      collects: ['Email address', 'Password'],
      done: Boolean(user),
    },
    {
      key: 'about',
      title: 'Tell us who you are',
      collects: [
        'First and last name',
        'Date of birth — you must be 18 or older',
        'Mobile number',
        'ZIP code',
        'Sex assigned at birth',
        'Height and weight',
      ],
      done: intakeStarted,
      href: intakeStarted ? undefined : '/start',
      action: 'Start',
    },
    {
      key: 'consents',
      title: 'Read and confirm the consents',
      collects: [
        'Consent for a licensed prescriber to review your information',
        'Acknowledgement that results vary and that risks exist',
        'Authorisation to charge your saved card only if you are approved',
        'Privacy Policy and Terms of Service',
      ],
      done: intakeStarted,
    },
    {
      key: 'visit',
      title: 'Complete your medical visit',
      collects: [
        'Active cancer, pregnancy or breastfeeding, end-stage kidney or liver disease',
        'Medical history — cardiovascular, diabetes, autoimmune and related conditions',
        'All medications, supplements and herbals, with dose',
        'Drug allergies and what happened',
        'A safety screen specific to the product you selected',
      ],
      done: visitDone,
      href: visitDone ? undefined : '/portal/visit',
      action: 'Complete visit',
    },
    {
      key: 'shipping',
      title: 'Add your shipping address',
      collects: ['Street address, city, state and ZIP — collected at checkout'],
      done: hasShipping,
    },
    {
      key: 'review',
      title: 'Prescriber review',
      collects: [
        'Nothing from you. A licensed prescriber reviews your intake and either issues a prescription or declines with a clinical note.',
        'Your card is charged only if you are approved.',
        'A plan ships on the same prescription until it expires. A different product is reviewed again.',
      ],
      done: reviewed,
    },
  ];
}
