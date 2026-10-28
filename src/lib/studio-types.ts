/** The content studio (/studio): shared shapes, safe for client components. */

export const KINDS = ['task', 'post', 'story', 'shoot', 'inspo'] as const;
export type Kind = (typeof KINDS)[number];

export const BRANDS = ['longevity', 'hair', 'both'] as const;
export type Brand = (typeof BRANDS)[number];

export const STATUSES = ['todo', 'doing', 'review', 'changes', 'approved', 'scheduled', 'posted', 'done'] as const;
export type Status = (typeof STATUSES)[number];

export const PLATFORMS = ['Instagram', 'TikTok', 'Facebook'] as const;

export interface StudioFile {
  path: string;
  name: string;
  type: string;
  size: number;
  /** Signed read link, added on the way out; never stored. */
  url?: string;
}

export interface StudioLink {
  url: string;
  label?: string;
}

export interface StudioComment {
  id: string;
  by: string;
  at: string;
  body: string;
  verdict?: 'approved' | 'changes';
}

export interface StudioItem {
  id: string;
  kind: Kind;
  title: string;
  notes: string;
  brand: Brand;
  platforms: string[];
  /** YYYY-MM-DD, Eastern. */
  due: string | null;
  status: Status;
  assignee: string;
  flagged: boolean;
  links: StudioLink[];
  files: StudioFile[];
  comments: StudioComment[];
  /** YYYY-MM-DD it was posted or done; what the daily rings count. */
  completedOn: string | null;
  /** Who checked it off. */
  completedBy?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuideSection {
  id: string;
  title: string;
  body: string;
}

export type Role = 'admin' | 'manager' | 'member';

export const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', manager: 'Manager', member: 'Content' };

/** Admins and managers issue and approve work; members (content) do it. */
export const canAssign = (role: Role) => role !== 'member';

/** What a member may add themselves: their own content ideas and references. */
export const MEMBER_KINDS: Kind[] = ['post', 'story', 'inspo'];
/** Verdicts only a manager gives. */
export const VERDICTS: Status[] = ['approved', 'changes'];

/** A teammate as the browser sees them: never their code. */
export interface StudioUser {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  hasCode: boolean;
  lastLogin: string | null;
  /** Last time they had the studio open (updated at most every few minutes). */
  lastSeen?: string | null;
}

/** One Instagram page's grid preview: the handle and screenshots of posts already live (newest first). */
export interface GridPage {
  handle: string;
  live: StudioFile[];
  name?: string;
  bio?: string;
  followers?: string;
  following?: string;
  avatar?: StudioFile | null;
}
export type GridBrand = 'longevity' | 'hair';
export const DEFAULT_GRID: Record<GridBrand, GridPage> = { longevity: { handle: 'etlongevity', live: [] }, hair: { handle: '', live: [] } };

export interface StudioSettings {
  /** Names of active teammates, for the "Who" picker. */
  people: string[];
  users: StudioUser[];
  targets: { posts: number; stories: number };
  guide: GuideSection[];
  grid: Record<GridBrand, GridPage>;
}

/** One line in the Activity log: who did what, when. */
export interface StudioEvent {
  at: string;
  by: string;
  /** e.g. "sent for review", "marked done", "signed in". */
  action: string;
  itemId?: string;
  itemTitle?: string;
  detail?: string;
}

/** A task that passed its due day unfinished. Recorded once and kept, even if the date moves later. */
export interface StudioMiss {
  key: string;
  itemId: string;
  title: string;
  assignee: string;
  brand: Brand;
  kind: Kind;
  due: string;
  firstSeen: string;
}

export interface StudioData {
  items: StudioItem[];
  settings: StudioSettings;
  /** The Activity log, newest first (Adam and Mo only; empty for content). */
  activity: StudioEvent[];
  /** Missed deadlines and weekly report notes (Adam and Mo only). */
  misses: StudioMiss[];
  notes: Record<string, string>;
  /** False on a local build with no database: changes last until the server restarts. */
  live: boolean;
}

export const DEFAULT_TARGETS = { posts: 4, stories: 4 };

export const KIND_LABEL: Record<Kind, string> = {
  task: 'Task',
  post: 'Post',
  story: 'Story',
  shoot: 'Shoot',
  inspo: 'Inspo',
};

export const BRAND_LABEL: Record<Brand, string> = {
  longevity: 'Eternal Longevity',
  hair: 'Eternal Hair & Esthetics',
  both: 'Collab',
};

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'To do',
  doing: 'In progress',
  review: 'Needs review',
  changes: 'Changes asked',
  approved: 'Approved',
  scheduled: 'Scheduled',
  posted: 'Posted',
  done: 'Done',
};

/** The statuses each kind moves through, in order. */
export const FLOW: Record<Kind, Status[]> = {
  task: ['todo', 'doing', 'review', 'changes', 'approved', 'done'],
  shoot: ['todo', 'done'],
  post: ['todo', 'doing', 'review', 'changes', 'approved', 'scheduled', 'posted'],
  story: ['todo', 'doing', 'review', 'changes', 'approved', 'scheduled', 'posted'],
  inspo: ['todo'],
};

export const isFinished = (s: Status) => s === 'done' || s === 'posted';
export const finishedStatus = (k: Kind): Status => (k === 'post' || k === 'story' ? 'posted' : 'done');

/** "Active today · 2:41 PM", "Last here Yesterday", "Never signed in". */
export function presence(u: Pick<StudioUser, 'lastSeen' | 'lastLogin'>, today = todayET()): { text: string; today: boolean } {
  const last = [u.lastSeen, u.lastLogin].filter(Boolean).sort().pop();
  if (!last) return { text: 'Never signed in', today: false };
  const d = todayET(new Date(last));
  const time = new Date(last).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
  if (d === today) return { text: `Active today · last seen ${time}`, today: true };
  const diff = Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000);
  return { text: `Last here ${diff === 1 ? 'yesterday' : new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, today: false };
}

/** Today in Eastern time, YYYY-MM-DD. */
export function todayET(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d);
}
