import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { DOCTOR_NAV } from '@/components/portal/ui';
import { getSession, loginUrl } from '@/lib/auth-server';
import { getPrescriber } from '@/lib/prescriber';
import { PrescriberForm } from '@/components/prescriber/PrescriberForm';
import { AdminPageHeader, SectionCard, SettingsRow } from '@/components/admin/IndexTable';

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
  if (!user) redirect(await loginUrl());
  if (user.role !== 'doctor') redirect(user.redirectTo);

  // Contact details come from the prescriber's own profile row, never from
  // placeholder values.
  const record = await getPrescriber(user.id);

  return (
    <PortalShell
      user={user}
      nav={DOCTOR_NAV}
    >
      <div className="space-y-6 max-md:[&_h2+p]:text-[15px] max-md:[&_h2]:text-[16px]">
        <AdminPageHeader
          title={record.display || user.name}
          subtitle={
            <span className="text-[15px] md:text-[14px]">
              Your contact details and licensure, and how the system reaches you when an order needs signing.
            </span>
          }
        />

        <SettingsRow
          title="Your details"
          description="Your name, credential, NPI and state licence. Correct anything that is wrong here — it prints on every prescription and on the published prescription policy."
        >
          {/* The shared form's labels and help run small on a phone; lift them here. */}
          <SectionCard className="max-md:[&_button]:min-h-[44px] max-md:[&_label]:text-[15px] max-md:[&_p]:text-[14px]">
            <PrescriberForm record={record} mode="doctor" />
          </SectionCard>
        </SettingsRow>

        <hr className="border-ink/10" />

        <SettingsRow
          title="Email"
          description="Where a new order reaches you. Email support to change it, so your sign-in and your notification address never drift apart."
        >
          <SectionCard>
            <p className="break-words text-[15px] font-medium text-ink md:text-[14px]">{user.email}</p>
          </SectionCard>
        </SettingsRow>

        <hr className="border-ink/10" />

        <SettingsRow
          title="How you're notified"
          description="Not settings — this is what the system does. Nothing here can be switched off, because nothing ships without your signature."
        >
          <SectionCard flush>
            <ul className="divide-y divide-ink/10">
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
          </SectionCard>
        </SettingsRow>

        <hr className="border-ink/10" />

        <SettingsRow title="Support" description="Something wrong with a case, or a member you need to reach?">
          <SectionCard>
            <p className="text-[15px] text-ink/80 md:text-[14px]">
              Email{' '}
              <a
                href="mailto:support@etlongevity.com"
                className="inline-flex min-h-[44px] items-center font-medium text-ink underline decoration-ink/30 md:min-h-0 underline-offset-[3px] hover:decoration-ink"
              >
                support@etlongevity.com
              </a>
              .
            </p>
          </SectionCard>
        </SettingsRow>
      </div>
    </PortalShell>
  );
}


function Fact({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex gap-3 px-4 py-3">
      <span
        aria-hidden
        className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-butter-deep"
      />
      <div className="min-w-0">
        <div className="text-[15px] font-medium text-ink md:text-[14px]">{title}</div>
        <p className="mt-0.5 text-[15px] leading-relaxed text-ink/65 md:text-[14px]">
          {body}
        </p>
      </div>
    </li>
  );
}
