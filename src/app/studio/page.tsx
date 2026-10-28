import { loadStudio, studioConfigured, studioSession, touchStudio } from '@/lib/studio';
import { canAssign } from '@/lib/studio-types';
import { Lock } from './Lock';
import { Studio } from './Studio';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const { user } = await studioSession();
  if (!user) return <Lock configured={studioConfigured()} />;
  await touchStudio(user.id);
  return <Studio initial={await loadStudio(canAssign(user.role))} me={user} />;
}
