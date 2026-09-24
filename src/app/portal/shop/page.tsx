import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ShopCatalog } from '@/components/shop/ShopCatalog';
import { getSession } from '@/lib/auth-server';
import { MEMBER_NAV, PageHeader } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse our full peptide catalog. Compounded to prescription by a licensed 503A pharmacy.',
};

export default async function ShopPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  return (
    <PortalShell user={user} nav={MEMBER_NAV}>
      <PageHeader
        title="Build the protocol that fits you."
        intro="Every product is compounded to prescription by a licensed 503A pharmacy, tested for purity and potency before release, and cold-chain shipped. Cancel between cycles, never mid-cycle."
      />

      <ShopCatalog />
    </PortalShell>
  );
}
