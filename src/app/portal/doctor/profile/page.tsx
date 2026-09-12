import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import { getPrescriber } from '@/lib/prescriber';
import { PrescriberForm } from '@/components/prescriber/PrescriberForm';

export const metadata: Metadata = {
  title: 'Physician Profile',
};

/**
 * Real licensure for the prescriber of record, per the signed pharmacy
 * onboarding form. Prescriber licensure is what limits the states we can
 * serve, so it must not drift from reality.
 */
export default async function DoctorProfilePage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'doctor') redirect(user.redirectTo);

  // Contact details come from the prescriber's own profile row, never from
  // placeholder values.
  const record = await getPrescriber(user.id);

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
      <div>
        <p className="mb-2 text-[11px] tracking-widest text-sky-300">
          PHYSICIAN PROFILE
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', letterSpacing: '-0.02em', lineHeight: 1.05 }}
        >
          {record.display || user.name}
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
            <h2 className="mb-1.5 text-lg font-semibold tracking-tight text-foreground">
              Your details
            </h2>
            <p className="mb-5 text-sm leading-relaxed text-foreground/55">
              Your name, credential, NPI and state licence. Correct anything
              that is wrong here — it prints on every prescription and on the
              published prescription policy.
            </p>
            <PrescriberForm record={record} mode="doctor" />
          </section>

          <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <h2 className="mb-1.5 text-lg font-semibold tracking-tight text-foreground">
              Email
            </h2>
            <p className="text-sm leading-relaxed text-foreground/55">
              {user.email} — where a new order reaches you. Email support to
              change it, so your sign-in and your notification address never
              drift apart.
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
