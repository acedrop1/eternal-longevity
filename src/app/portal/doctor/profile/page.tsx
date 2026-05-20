import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Physician Profile | Eternal Longevity',
};

const LICENSES = [
  { state: 'New Jersey', number: '25MA08123900', expires: 'Jun 2027' },
  { state: 'New York', number: '281234', expires: 'Aug 2026' },
  { state: 'Massachusetts', number: '283456', expires: 'Mar 2027' },
];

export default async function DoctorProfilePage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'doctor') redirect(user.redirectTo);

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Queue', href: '/portal/doctor' },
        { label: 'My signed Rx', href: '/portal/doctor/history' },
        { label: 'Profile', href: '/portal/doctor/profile' },
      ]}
    >
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-sky-300">
          PHYSICIAN PROFILE
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', letterSpacing: '-0.02em', lineHeight: 1.05 }}
        >
          {user.name}
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Your contact info, licensure, and signing preferences. Changes are
          audited and routed to the compliance team for review.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* === MAIN === */}
        <div className="space-y-6">
          <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <h2 className="mb-5 text-lg font-semibold tracking-tight text-foreground">
              Contact info
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <ReadOnlyField label="FULL NAME" value={user.name} />
              <ReadOnlyField label="NPI" value="1245678901" />
              <ReadOnlyField label="EMAIL" value={user.email} />
              <ReadOnlyField label="PHONE" value="(201) 555-0188" />
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <h2 className="mb-5 text-lg font-semibold tracking-tight text-foreground">
              State licenses
            </h2>
            <ul className="space-y-3">
              {LICENSES.map((l) => (
                <li
                  key={l.state}
                  className="flex items-center justify-between rounded-2xl border border-line bg-background p-4"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {l.state}
                    </div>
                    <div className="text-xs text-foreground/55 mt-0.5 font-mono">
                      {l.number}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] tracking-widest text-foreground/55">
                      EXPIRES
                    </div>
                    <div className="text-sm text-foreground/85">{l.expires}</div>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-soft"
            >
              + Add a state license
            </button>
          </section>

          <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <h2 className="mb-5 text-lg font-semibold tracking-tight text-foreground">
              Signing preferences
            </h2>
            <div className="space-y-2">
              <Toggle
                title="Auto-sign clean intakes"
                body="If no red flags appear in the intake and labs, automatically apply your signature after a 30-second hold window."
                on={false}
              />
              <Toggle
                title="Email me when a new escalated case lands"
                body="An email is sent within 60 seconds of an escalated case appearing in the queue."
                on={true}
              />
              <Toggle
                title="SMS me when queue exceeds 10"
                body="Single SMS when the queue crosses 10 cases awaiting review."
                on={true}
              />
            </div>
          </section>
        </div>

        {/* === SIDEBAR === */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-2 text-[10px] tracking-widest text-sky-300">
              SIGNING WINDOW
            </div>
            <div className="text-sm font-medium text-foreground">
              Mon – Fri · 9a – 6p ET
            </div>
            <p className="text-xs text-foreground/55 mt-1 leading-relaxed">
              You can sign outside this window, but cases routed to you only
              count toward your TAT during signing hours.
            </p>
            <button
              type="button"
              className="mt-3 text-[11px] tracking-widest text-accent hover:text-accent-soft"
            >
              EDIT WINDOW →
            </button>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-2 text-[10px] tracking-widest text-foreground/55">
              SUPPORT
            </div>
            <p className="text-sm text-foreground/75 leading-relaxed">
              Issue with a case or queue routing? Email{' '}
              <a
                href="mailto:physicians@eternallongevity.com"
                className="text-accent hover:text-accent-soft"
              >
                physicians@eternallongevity.com
              </a>{' '}
              or page on-call ops via Slack.
            </p>
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
        {label}
      </div>
      <div className="rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground/85">
        {value}
      </div>
    </div>
  );
}

function Toggle({ title, body, on }: { title: string; body: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-background p-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <p className="text-xs text-foreground/55 mt-0.5 leading-relaxed">{body}</p>
      </div>
      <button
        type="button"
        aria-pressed={on}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-foreground/15'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}
