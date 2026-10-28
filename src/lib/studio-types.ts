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
}

export interface StudioSettings {
  /** Names of active teammates, for the "Who" picker. */
  people: string[];
  users: StudioUser[];
  targets: { posts: number; stories: number };
  guide: GuideSection[];
}

export interface StudioData {
  items: StudioItem[];
  settings: StudioSettings;
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
  hair: 'Eternal Hair',
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

/** Today in Eastern time, YYYY-MM-DD. */
export function todayET(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d);
}
