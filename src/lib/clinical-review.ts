import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { ageFrom, formatDate } from '@/lib/format';
import { defaultCardSummary } from '@/lib/pay-on-approval';
import { stripeConfigured } from '@/lib/stripe';

export interface ReviewLine {
  label: string;
  value: string;
  /** Answers a prescriber has to weigh rather than skim. */
  flag?: boolean;
}

export interface PatientReview {
  name: string;
  dob: string;
  age: string;
  sex: string;
  body: string;
  submittedAt: string;
  safety: ReviewLine[];
  history: ReviewLine[];
  /** Context the decision needs that is not in the intake. */
  context: ReviewLine[];
  /** Where it ships and how to reach them. */
  contact: ReviewLine[];
}

const SEX: Record<string, string> = {
  m: 'Male',
  f: 'Female',
  intersex: 'Intersex',
};

const CONDITIONS: Record<string, string> = {
  cardio: 'Heart disease, heart attack or stroke',
  t1d: 'Type 1 diabetes',
  autoimmune: 'Autoimmune condition',
  none: 'None reported',
};

function str(a: Record<string, unknown>, key: string): string {
  const v = a[key];
  if (v == null || v === '') return '—';
  return String(v);
}

function yesNo(a: Record<string, unknown>, key: string): { text: string; flag: boolean } {
  const v = String(a[key] ?? '').toLowerCase();
  if (v === 'yes') return { text: 'Yes', flag: true };
  if (v === 'no') return { text: 'No', flag: false };
  if (v === 'na') return { text: 'Not applicable', flag: false };
  return { text: '—', flag: false };
}

/**
 * The intake, arranged the way someone deciding has to read it.
 *
 * The queue used to show a name and a product and nothing else, so signing a
 * prescription meant approving a person the prescriber had never seen anything
 * about. Free-text answers — medications, allergies — are never collapsed to a
 * summary, because the detail is the whole point of asking.
 */
export async function reviewsForOrders(
  orderNumbers: string[],
): Promise<Record<string, PatientReview>> {
  if (!supabaseAdminConfigured() || orderNumbers.length === 0) return {};
  const db = createSupabaseAdminClient();

  const { data: orders } = await db
    .from('orders')
    .select(
      'order_number, user_id, member_name, member_email, card_last4, shipping_address',
    )
    .in('order_number', orderNumbers);
  if (!orders?.length) return {};

  const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];

  /*
   * Whether this is someone's first order changes the decision — a repeat
   * patient has tolerated the thing before, a new one has not — and whether a
   * card is actually on file decides whether signing can charge at all.
   */
  const { data: past } = await db
    .from('orders')
    .select('user_id, status, paid_at')
    .in('user_id', userIds as string[])
    .in('status', ['signed', 'paid', 'compounding', 'shipped', 'delivered'])
    .order('paid_at', { ascending: false });

  const history = new Map<string, { count: number; last: string | null }>();
  for (const row of past ?? []) {
    if (!row.user_id) continue;
    const seen = history.get(row.user_id);
    if (seen) seen.count += 1;
    else history.set(row.user_id, { count: 1, last: row.paid_at });
  }
  const { data: intakes } = await db
    .from('intake_submissions')
    .select('user_id, answers, created_at')
    .in('user_id', userIds as string[])
    .order('created_at', { ascending: false });

  // Newest intake per member.
  const latest = new Map<string, { answers: unknown; created_at: string }>();
  for (const row of intakes ?? []) {
    if (row.user_id && !latest.has(row.user_id)) latest.set(row.user_id, row);
  }

  /*
   * Asked of Stripe, one customer at a time. There are never many orders
   * waiting at once, and being wrong about whether a card exists is worse than
   * the round trip.
   */
  const cards = new Map<string, string | null>();
  if (stripeConfigured()) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, stripe_customer_id')
      .in('id', userIds as string[]);
    for (const pr of profiles ?? []) {
      if (pr.stripe_customer_id) {
        cards.set(pr.id, await defaultCardSummary(pr.stripe_customer_id));
      }
    }
  }

  const out: Record<string, PatientReview> = {};
  for (const o of orders) {
    const row = o.user_id ? latest.get(o.user_id) : undefined;
    const a = (row?.answers ?? {}) as Record<string, unknown>;

    const cancer = yesNo(a, 'cancer');
    const pregnant = yesNo(a, 'pregnant');
    const organ = yesNo(a, 'organ');
    const allergies = yesNo(a, 'allergies_any');

    const conditionList = Array.isArray(a.conditions)
      ? (a.conditions as string[]).map((c) => CONDITIONS[c] ?? c)
      : [];

    const ft = str(a, 'height_ft');
    const inch = str(a, 'height_in');
    const lb = str(a, 'weight_lb');

    out[o.order_number] = {
      name: [a.first_name, a.last_name].filter(Boolean).join(' ') ||
        o.member_name || 'Patient',
      dob: a.dob ? formatDate(String(a.dob)) : '—',
      age: a.dob ? `${ageFrom(String(a.dob))}` : '—',
      sex: SEX[String(a.sex ?? '')] ?? '—',
      body:
        ft !== '—' ? `${ft}′ ${inch}″ · ${lb} lb` : lb !== '—' ? `${lb} lb` : '—',
      submittedAt: row?.created_at ? formatDate(row.created_at) : '—',
      safety: [
        { label: 'Active cancer, or treated in the last 5 years', value: cancer.text, flag: cancer.flag },
        { label: 'Pregnant or breastfeeding', value: pregnant.text, flag: pregnant.flag },
        { label: 'End-stage kidney or liver disease', value: organ.text, flag: organ.flag },
      ],
      context: [
        (() => {
          const card = o.user_id ? cards.get(o.user_id) : null;
          const fallback = o.card_last4
            ? `\u2022\u2022\u2022\u2022 ${o.card_last4}`
            : null;
          const value = card ?? fallback;
          return {
            label: 'Card on file',
            value: value ?? 'None saved — signing cannot charge',
            flag: !value,
          };
        })(),
        {
          label: 'Previous approved orders',
          value: (() => {
            const h = o.user_id ? history.get(o.user_id) : undefined;
            if (!h) return 'None — first order';
            return `${h.count}, last ${h.last ? formatDate(h.last) : 'unknown'}`;
          })(),
        },
      ],
      contact: (() => {
        const addr = (o.shipping_address ?? {}) as Record<string, string>;
        const street = [addr.line1, addr.line2].filter(Boolean).join(', ');
        return [
          {
            label: 'Ships to',
            value: street
              ? `${street}, ${addr.city ?? ''} ${addr.state ?? ''} ${addr.zip ?? ''}`.trim()
              : '—',
          },
          { label: 'Phone', value: str(a, 'phone') },
          { label: 'Email', value: o.member_email ?? str(a, 'email') },
        ];
      })(),
      history: [
        {
          label: 'Diagnosed conditions',
          value: conditionList.length ? conditionList.join(', ') : '—',
          flag: conditionList.some((c) => c !== 'None reported'),
        },
        {
          label: 'Medications, supplements and herbals',
          value: str(a, 'medications'),
          flag: str(a, 'medications') !== '—',
        },
        { label: 'Drug allergies', value: allergies.text, flag: allergies.flag },
        { label: 'Allergy detail', value: str(a, 'allergies_detail') },
        {
          label: 'Product safety screen',
          value:
            String(a.product_contraindications ?? '') === 'none'
              ? 'None of the listed contraindications apply'
              : String(a.product_contraindications ?? '') === 'some'
                ? 'One or more applies'
                : '—',
          flag: String(a.product_contraindications ?? '') === 'some',
        },
      ],
    };
  }
  return out;
}
