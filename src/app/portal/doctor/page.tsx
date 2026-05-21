import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { DoctorQueueList } from '@/components/doctor/DoctorQueueList';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Clinical Queue | Eternal Longevity',
};

export default async function DoctorPortalPage() {
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
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
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
          <p className="mt-2 max-w-xl text-foreground/65 leading-relaxed text-sm">
            Every order an admin has approved appears here. Sign Rx to release
            for compounding, or decline to send the case back with a clinical
            note.
          </p>
        </div>
      </div>

      <DoctorQueueList doctorName={user.name} />
    </PortalShell>
  );
}
