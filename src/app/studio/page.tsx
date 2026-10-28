import { loadStudio, studioConfigured, studioSession } from '@/lib/studio';
import { Lock } from './Lock';
import { Studio } from './Studio';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const { user } = await studioSession();
  if (!user) return <Lock configured={studioConfigured()} />;
  return <Studio initial={await loadStudio()} me={user} />;
}
