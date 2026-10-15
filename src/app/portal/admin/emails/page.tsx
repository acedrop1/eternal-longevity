import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminPageHeader } from '@/components/admin/IndexTable';
import { getSession, loginUrl } from '@/lib/auth-server';
import { emailConfigured } from '@/lib/email';
import { EMAIL_TEMPLATES, SMS_TEMPLATES } from '@/lib/email-catalog';
import { EmailsView } from './EmailsView';

export const metadata: Metadata = { title: 'Emails' };

/** Admin → Emails: every branded email and text, previewed with sample data, plus a custom branded email. */
export default async function AdminEmailsPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const templates = EMAIL_TEMPLATES.map((t) => {
    const { subject, html } = t.build();
    return { id: t.id, audience: t.audience, name: t.name, when: t.when, subject, html };
  });

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="space-y-5">
        <AdminPageHeader title="Emails & texts" subtitle="Every message the site sends, who gets it and when, plus a branded email you can write yourself." />
        <EmailsView templates={templates} sms={SMS_TEMPLATES} emailOn={emailConfigured()} />
      </div>
    </PortalShell>
  );
}
