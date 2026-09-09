import type { Metadata } from 'next';
import { formatDate as fmtDate } from '@/lib/format';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { DoctorQueueList } from '@/components/doctor/DoctorQueueList';
import {
  DoctorSignQueue,
  type DoctorIntakeView,
} from '@/components/doctor/DoctorSignQueue';
import { getSession } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Clinical Queue',
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

export default async function DoctorPortalPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'doctor') redirect(user.redirectTo);

  const live = supabaseAdminConfigured();
  let intakes: DoctorIntakeView[] = [];

  if (live) {
    try {
      const db = createSupabaseAdminClient();
      const [{ data: approved }, { data: signed }] = await Promise.all([
        db
          .from('intake_submissions')
          .select('id, case_id, email, answers, created_at')
          .eq('status', 'approved')
          .order('created_at', { ascending: true }),
        db.from('prescriptions').select('intake_id'),
      ]);
      const signedIntakeIds = new Set(
        (signed ?? [])
          .map((p) => p.intake_id)
          .filter((id): id is string => Boolean(id)),
      );
      intakes = (approved ?? [])
        .filter((r) => !signedIntakeIds.has(r.id))
        .map((r) => ({
          id: r.id,
          caseId: r.case_id,
          email: r.email,
          submittedAt: fmtDate(r.created_at),
          answers: flattenAnswers(r.answers),
        }));
    } catch {
      intakes = [];
    }
  }

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Queue', href: '/portal/doctor' },
        { label: 'Messages', href: '/portal/doctor/messages' },
        { label: 'My signed Rx', href: '/portal/doctor/history' },
        { label: 'Profile', href: '/portal/doctor/profile' },
      ]}
    >
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] tracking-widest text-sky-300">
            CLINICAL QUEUE
          </p>
          <h1
            className="font-semibold tracking-tight text-foreground"
            style={{
              fontSize: 'clamp(1.85rem, 4vw, 2.75rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            Welcome back, {user.name.split(' ').slice(-1)[0]}.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/65">
            Orders arrive here the moment a member checks out. Signing charges
            their card and sends the prescription to the pharmacy; declining
            charges nothing.
          </p>
        </div>
      </div>

      <DoctorQueueList doctorName={user.name} />

      {/*
        Standalone assessments — someone who filled in the visit form without
        buying — are a separate, rarer stream that still goes through admin
        review first. It gets its own heading only when it has something in
        it, so an empty second queue never pads the page.
      */}
      {live && intakes.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-[11px] tracking-widest text-sky-300">
                STANDALONE ASSESSMENTS
              </p>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                No order attached
              </h2>
            </div>
            <span className="text-[11px] tracking-widest text-foreground/45">
              {intakes.length} {intakes.length === 1 ? 'CASE' : 'CASES'}
            </span>
          </div>
          <DoctorSignQueue intakes={intakes} />
        </section>
      )}
    </PortalShell>
  );
}
