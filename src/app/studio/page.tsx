import { loadStudio, studioConfigured, studioSession } from '@/lib/studio';
import { Lock } from './Lock';
import { Studio } from './Studio';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const session = await studioSession();
  if (!session.ok) return <Lock configured={studioConfigured()} />;
  const data = await loadStudio();
  const who = session.who && data.settings.people.includes(session.who) ? session.who : null;
  return <Studio initial={data} who={who} />;
}
