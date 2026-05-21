import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { AdminQueueList } from '@/components/admin/AdminQueueList';
import {
  AdminIntakeQueue,
  type IntakeRowView,
} from '@/components/admin/AdminIntakeQueue';
import { getSession } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Review Queue | Eternal Longevity',
};

const ADMIN_NAV = [
  { label: 'Overview', href: '/portal/admin' },
  { label: 'Members', href: '/portal/admin/members' },
  { label: 'Queue', href: '/portal/admin/queue' },
  { label: 'Billing', href: '/portal/admin/billing' },
  { label: 'Orders', href: '/portal/admin/fulfillment' },
  { label: 'Pharmacy', href: '/portal/admin/pharmacy' },
  { label: 'Settings', href: '/portal/admin/settings' },
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

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
          answers: flattenAnswers(r.answers),
        }));
      }
    } catch {
      intakes = [];
    }
  }

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          REVIEW QUEUE · ADMIN TRIAGE
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(1.85rem, 4vw, 2.75rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Triage incoming intakes.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Every new intake lands here first. Approve it to release it for
          physician sign-off, request more information, or decline with a
          reason.
        </p>
      </div>

      {live ? (
        <AdminIntakeQueue intakes={intakes} />
      ) : (
        <AdminQueueList />
      )}
    </PortalShell>
  );
}
