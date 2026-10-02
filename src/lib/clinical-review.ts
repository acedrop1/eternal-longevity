import { SHOP_PRODUCTS } from './shopProducts';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { ageFrom, formatDate } from '@/lib/format';
import { defaultCardSummary } from '@/lib/pay-on-approval';
import { stripeConfigured } from '@/lib/stripe';
import { getSession } from '@/lib/auth-server';
import {
  categoryAnswers,
  threadStatuses,
  type CategorySection,
  type ThreadStatus,
} from '@/lib/prescriber-view';
import { intakeProductIds, photosPending } from '@/lib/intake-rules';
import { PRODUCT_CATEGORY } from '@/lib/intake-categories';

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
  /** Per-category questions (hair, skin, ...), with signed photo/lab URLs. */
  categories: CategorySection[];
  /** Photos the prescriber asked for that haven't been added in the portal yet. */
  photosPending: boolean;
  /** A hair or skin case he hasn't asked photos for yet: offer "Request photos". */
  photosRequestable: boolean;
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
/** The formatted intake for one member, without needing an order. */
export async function reviewForMember(
  userId: string,
): Promise<PatientReview | null> {
  if (!supabaseAdminConfigured()) return null;
  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('order_number')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (order?.order_number) {
    const map = await reviewsForOrders([order.order_number]);
    return map[order.order_number] ?? null;
  }
  // No order yet — build it from the intake alone.
  const map = await reviewsForUsers([userId]);
  return map[userId] ?? null;
}

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
    .select('user_id, status, paid_confirmed_at')
    .in('user_id', userIds as string[])
    .in('status', ['signed', 'paid', 'compounding', 'shipped', 'delivered'])
    .order('paid_confirmed_at', { ascending: false });

  const history = new Map<string, { count: number; last: string | null }>();
  for (const row of past ?? []) {
    if (!row.user_id) continue;
    const seen = history.get(row.user_id);
    if (seen) seen.count += 1;
    else history.set(row.user_id, { count: 1, last: row.paid_confirmed_at });
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
    const h = o.user_id ? history.get(o.user_id) : undefined;
    out[o.order_number] = buildReview({
      answers: row?.answers,
      submittedAt: row?.created_at ?? null,
      fallbackName: o.member_name,
      email: o.member_email,
      cardSummary:
        (o.user_id ? cards.get(o.user_id) : null) ??
        (o.card_last4 ? `\u2022\u2022\u2022\u2022 ${o.card_last4}` : null),
      priorOrders: h ? { count: h.count, last: h.last } : null,
      shippingAddress: o.shipping_address,
    });
  }
  await signIntakeMedia(Object.values(out).flatMap((r) => r.categories));
  return out;
}

/**
 * One person's record, however we reached them.
 *
 * Shared because admin looks people up by member and the prescriber reaches
 * them through an order, and both should read the same intake the same way.
 */
function buildReview(input: {
  answers: unknown;
  submittedAt: string | null;
  fallbackName: string | null;
  email: string | null;
  cardSummary: string | null;
  priorOrders: { count: number; last: string | null } | null;
  shippingAddress: unknown;
}): PatientReview {
  const a = (input.answers ?? {}) as Record<string, unknown>;

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

  const addr = (input.shippingAddress ?? {}) as Record<string, string>;
  const street = [addr.line1, addr.line2].filter(Boolean).join(', ');

  return {
    name:
      [a.first_name, a.last_name].filter(Boolean).join(' ') ||
      input.fallbackName ||
      'Patient',
    dob: a.dob ? formatDate(String(a.dob)) : '—',
    age: a.dob ? `${ageFrom(String(a.dob))}` : '—',
    sex: SEX[String(a.sex ?? '')] ?? '—',
    body:
      ft !== '—' ? `${ft}′ ${inch}″ · ${lb} lb` : lb !== '—' ? `${lb} lb` : '—',
    submittedAt: input.submittedAt ? formatDate(input.submittedAt) : '—',
    categories: categoryAnswers(a),
    photosPending: photosPending(a),
    photosRequestable:
      a.photosRequested !== true &&
      intakeProductIds(a).some((id) => ['hair', 'skin'].includes(PRODUCT_CATEGORY[id])),
    safety: [
      {
        label: 'Active cancer, or treated in the last 5 years',
        value: cancer.text,
        flag: cancer.flag,
      },
      {
        label: 'Pregnant or breastfeeding',
        value: pregnant.text,
        flag: pregnant.flag,
      },
      {
        label: 'End-stage kidney or liver disease',
        value: organ.text,
        flag: organ.flag,
      },
    ],
    context: [
      {
        label: 'Card on file',
        value: input.cardSummary ?? 'None saved',
        flag: !input.cardSummary,
      },
      {
        label: 'Previous approved orders',
        value: input.priorOrders
          ? `${input.priorOrders.count}, last ${
              input.priorOrders.last ? formatDate(input.priorOrders.last) : 'unknown'
            }`
          : 'None yet',
      },
    ],
    contact: [
      {
        label: 'Ships to',
        value: street
          ? `${street}, ${addr.city ?? ''} ${addr.state ?? ''} ${addr.zip ?? ''}`.trim()
          : '—',
      },
      { label: 'Phone', value: str(a, 'phone') },
      { label: 'Email', value: input.email ?? str(a, 'email') },
    ],
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
      // One screen per product in the visit: the first is `product_contraindications`,
      // each extra one `product_contraindications__<productId>`.
      ...Object.keys(a)
        .filter((k) => k === 'product_contraindications' || k.startsWith('product_contraindications__'))
        .map((k) => {
          const v = String(a[k] ?? '');
          const id = k.split('__')[1];
          const name = id ? SHOP_PRODUCTS.find((p) => p.id === id)?.name ?? id : '';
          return {
            label: name ? `Product safety screen · ${name}` : 'Product safety screen',
            value: v === 'none' ? 'None of the listed contraindications apply' : v === 'some' ? 'One or more applies' : '—',
            flag: v === 'some',
          };
        }),
    ],
  };
}


/**
 * Same record, keyed by member rather than by order.
 *
 * Admin looks people up before they have bought anything, and the intake is
 * the only thing on file at that point.
 */
export async function reviewsForUsers(
  userIds: string[],
): Promise<Record<string, PatientReview>> {
  if (!supabaseAdminConfigured() || userIds.length === 0) return {};
  const db = createSupabaseAdminClient();

  const [{ data: profiles }, { data: intakes }] = await Promise.all([
    db.from('profiles').select('id, full_name, email').in('id', userIds),
    db
      .from('intake_submissions')
      .select('user_id, answers, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false }),
  ]);

  const latest = new Map<string, { answers: unknown; created_at: string }>();
  for (const row of intakes ?? []) {
    if (row.user_id && !latest.has(row.user_id)) latest.set(row.user_id, row);
  }

  const out: Record<string, PatientReview> = {};
  for (const pr of profiles ?? []) {
    const row = latest.get(pr.id);
    out[pr.id] = buildReview({
      answers: row?.answers,
      submittedAt: row?.created_at ?? null,
      fallbackName: pr.full_name,
      email: pr.email,
      cardSummary: null,
      priorOrders: null,
      shippingAddress: null,
    });
  }
  await signIntakeMedia(Object.values(out).flatMap((r) => r.categories));
  return out;
}

/**
 * Fills each photo/lab file's `url` with a 10-minute signed URL from the
 * private `intake-media` bucket, in one call. Clinical roles only; anything
 * missing (bucket, file, or the call failing) stays null = "unavailable".
 */
export async function signIntakeMedia(sections: CategorySection[]): Promise<void> {
  const media = sections.flatMap((s) => [...s.photos, ...s.files]);
  media.forEach((m) => (m.url = null));
  if (!media.length || !supabaseAdminConfigured()) return;
  const user = await getSession();
  if (!user || (user.role !== 'doctor' && user.role !== 'admin')) return;
  try {
    const { data } = await createSupabaseAdminClient()
      .storage.from('intake-media')
      .createSignedUrls([...new Set(media.map((m) => m.path))], 600);
    const urls = new Map(
      (data ?? []).filter((d) => !d.error && d.signedUrl).map((d) => [d.path, d.signedUrl]),
    );
    media.forEach((m) => (m.url = urls.get(m.path) ?? null));
  } catch {
    // Leave them unavailable rather than break the queue.
  }
}

/**
 * "Waiting on patient" / "Patient replied" for each member, from their
 * 'doctor' thread, in one query. Callers have already checked the role.
 */
export async function doctorThreadStatuses(
  userIds: string[],
): Promise<Record<string, ThreadStatus>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length || !supabaseAdminConfigured()) return {};
  try {
    const { data } = await createSupabaseAdminClient()
      .from('messages')
      .select('thread_user_id, sender_id, body, created_at')
      .eq('channel', 'doctor')
      .in('thread_user_id', ids)
      .order('created_at', { ascending: false })
      // ponytail: newest 2000 rows across the visible patients; a per-thread
      // latest-by-sender view if threads ever get that long.
      .limit(2000);
    return threadStatuses(data ?? []);
  } catch {
    return {};
  }
}
