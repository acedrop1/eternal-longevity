import type { Metadata } from 'next';
import { formatDate as fmtDate } from '@/lib/format';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import {
  AdminIntakeQueue,
  type IntakeRowView,
} from '@/components/admin/AdminIntakeQueue';
import { getSession } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { ADMIN_NAV } from '@/components/portal/ui';
import { ALL_CATEGORY_STEPS } from '@/lib/intake-categories';
import { categoryAnswers } from '@/lib/prescriber-view';
import { doctorThreadStatuses, signIntakeMedia } from '@/lib/clinical-review';

export const metadata: Metadata = {
  title: 'Applications',
};



/** Category fields are shown labelled (with photos) above; keep them out of the raw list. */
const CATEGORY_FIELD_IDS = new Set(
  ALL_CATEGORY_STEPS.flatMap((s) => s.fields.map((f) => f.id)),
);

function flattenAnswers(answers: unknown): { label: string; value: string }[] {
  if (!answers || typeof answers !== 'object') return [];
  return Object.entries(answers as Record<string, unknown>)
    .filter(([label]) => !CATEGORY_FIELD_IDS.has(label))
    .map(
    ([label, value]) => ({
      label,
      value:
        value == null
          ? '—'
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value),
    }),
  );
}

export default async function AdminQueuePage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  const live = supabaseAdminConfigured();
  let intakes: IntakeRowView[] = [];

  if (live) {
    try {
      const db = createSupabaseAdminClient();
      const { data } = await db
        .from('intake_submissions')
        .select('id, user_id, case_id, email, status, answers, created_at')
        .in('status', ['submitted', 'in_review', 'needs_info'])
        .order('created_at', { ascending: true });
      if (data) {
        const threads = await doctorThreadStatuses(
          data.map((r) => r.user_id ?? ''),
        );
        intakes = data.map((r) => ({
          id: r.id,
          caseId: r.case_id,
          email: r.email,
          status: r.status,
          submittedAt: fmtDate(r.created_at),
          // Arrived from a product card, or from the generic Apply Now?
          source:
            (r.answers as Record<string, unknown> | null)?.requestedProduct
              ? String((r.answers as Record<string, unknown>).requestedProduct)
              : null,
          answers: flattenAnswers(r.answers),
          categories: categoryAnswers(r.answers),
          thread: r.user_id ? threads[r.user_id] : undefined,
        }));
        await signIntakeMedia(intakes.flatMap((i) => i.categories));
      }
    } catch {
      intakes = [];
    }
  }

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div>
        <p className="mb-2 text-[13px] font-medium text-ink/55">
          Members · applications
        </p>
        <h1
          className="text-[36px] font-semibold leading-[1] tracking-[-0.045em] text-ink [text-wrap:balance] md:text-[48px]"
        >
          Applications.
        </h1>
        <p className="mt-3 max-w-[68ch] text-[16px] leading-relaxed text-ink-soft">
          Everyone who has completed the intake. Signing up is not a request
          for anything — the prescriber reviews each order under Orders when it
          is placed. Request info or close an application only if something in
          it is wrong.
        </p>
      </div>

      {/* Intakes come from Supabase in live mode. Orders now do too, so the
          admin sees both queues rather than one or the other. */}
      {live && <AdminIntakeQueue intakes={intakes} />}
    </PortalShell>
  );
}
