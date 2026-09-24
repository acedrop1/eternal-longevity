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

export const metadata: Metadata = {
  title: 'Applications',
};



function flattenAnswers(answers: unknown): { label: string; value: string }[] {
  if (!answers || typeof answers !== 'object') return [];
  return Object.entries(answers as Record<string, unknown>).map(
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
        .select('id, case_id, email, status, answers, created_at')
        .in('status', ['submitted', 'in_review', 'needs_info'])
        .order('created_at', { ascending: true });
      if (data) {
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
        }));
      }
    } catch {
      intakes = [];
    }
  }

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div>
        <p className="mb-2 font-mono text-[12px] text-foreground/55">
          Members · applications
        </p>
        <h1
          className="font-display font-normal text-foreground"
          style={{
            fontSize: 'clamp(1.8rem, 1.5vw + 1rem, 2.6rem)',
            fontStretch: '75%',
            lineHeight: 1.05,
          }}
        >
          Applications.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
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
