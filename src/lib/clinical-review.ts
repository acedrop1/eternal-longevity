import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { ageFrom, formatDate } from '@/lib/format';

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
    .select('order_number, user_id, member_name')
    .in('order_number', orderNumbers);
  if (!orders?.length) return {};

  const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];
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
