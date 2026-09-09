import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Physician Profile',
};

/**
 * Real licensure for the prescriber of record, per the signed pharmacy
 * onboarding form. Prescriber licensure is what limits the states we can
 * serve, so it must not drift from reality.
 */
const LICENSES = [
  { state: 'New Jersey', number: '25MB11925900', expires: '—' },
];

export default async function DoctorProfilePage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'doctor') redirect(user.redirectTo);

  // Contact details come from the prescriber's own profile row, never from
  // placeholder values.
  let npi = '—';
  let phone = '—';
  if (supabaseConfigured) {
    const db = await createSupabaseServerClient();
    const { data } = await db
      .from('profiles')
      .select('npi, phone')
      .eq('id', user.id)
      .maybeSingle();
    npi = data?.npi || '—';
    phone = data?.phone || '—';
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
          Your contact details and licensure, and how the system reaches you
          when an order needs signing. To change anything here, email support.
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
              <ReadOnlyField label="NPI" value={npi} />
              <ReadOnlyField label="EMAIL" value={user.email} />
              <ReadOnlyField label="PHONE" value={phone} />
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
            <p className="mt-4 text-xs leading-relaxed text-foreground/45">
              Licensure sets the states we can ship to. Email support to add
              one — it has to be verified against the state board before the
              site will accept orders from there.
            </p>
          </section>

          <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <h2 className="mb-1.5 text-lg font-semibold tracking-tight text-foreground">
              How you're notified
            </h2>
            <p className="mb-5 text-sm leading-relaxed text-foreground/55">
              Not settings — this is what the system does. Nothing here can be
              switched off, because nothing ships without your signature.
            </p>
            <ul className="space-y-2">
              <Fact
                title="Every new order emails and texts you"
                body="Sent the moment a member checks out, to the address and number above. There is no admin step in front of you."
              />
              <Fact
                title="Nothing is signed on your behalf"
                body="Every prescription waits for you. There is no automatic signing, and no case times out into an approval."
              />
              <Fact
                title="Signing charges the card and sends the Rx"
                body="Approving releases the order to the pharmacy and charges the card the member saved at checkout. Declining charges nothing."
              />
            </ul>
          </section>
        </div>

        {/* === SIDEBAR === */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-2 text-[10px] tracking-widest text-foreground/55">
              SUPPORT
            </div>
            <p className="text-sm text-foreground/75 leading-relaxed">
              Something wrong with a case, or a member you need to reach?
              Email{' '}
              <a
                href="mailto:support@etlongevity.com"
                className="text-accent hover:text-accent-soft"
              >
                support@etlongevity.com
              </a>
              .
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

function Fact({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex gap-3 rounded-2xl border border-line bg-background p-4">
      <span
        aria-hidden
        className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent"
      />
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground/55">
          {body}
        </p>
      </div>
    </li>
  );
}
