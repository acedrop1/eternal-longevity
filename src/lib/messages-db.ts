'use server';

/**
 * Portal messaging: each member has two threads — 'support' (admin answers)
 * and 'doctor' (the prescriber answers). Member reads/writes run as the
 * caller through RLS. Doctor/admin replies go through the service role after
 * an explicit role check, same pattern as the order workflow.
 */

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { supabaseConfigured } from '@/lib/env';
import { getSession } from '@/lib/auth-server';
import { noticeEmail, sendEmail, SUPPORT_EMAIL } from '@/lib/email';
import { getPrescriber } from '@/lib/prescriber';
import { SITE_URL } from '@/lib/site';
import { shouldNotifyReply } from '@/lib/prescriber-view';

export type MessageChannel = 'support' | 'doctor';

/** Runtime check: the type does not survive the trip from the browser. */
const isChannel = (c: unknown): c is MessageChannel => c === 'support' || c === 'doctor';

export interface PortalMessage {
  id: string;
  /** Derived: a message is the member's when they sent it into their own thread. */
  senderRole: 'member' | 'staff';
  body: string;
  createdAt: string;
}

export interface MessageThread {
  userId: string;
  memberName: string;
  memberEmail: string;
  lastBody: string;
  lastAt: string;
  awaitingReply: boolean;
}

type Result = { ok: boolean; error?: string };

/** True when Supabase messaging is available for the caller. */
export async function messagesConfigured(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  return Boolean(await getSession());
}

/* ------------------------------ member side ------------------------------ */

/** The caller's own thread on one channel, oldest first. */
export async function listMyMessages(channel: MessageChannel): Promise<PortalMessage[]> {
  const user = await getSession();
  if (!user || !supabaseConfigured) return [];
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('thread_user_id', user.id)
    .eq('channel', channel)
    .order('created_at', { ascending: true })
    .limit(200);
  // A failed load is not an empty thread: throw so the page can say so.
  if (error) throw new Error(`listMyMessages(${channel}): ${error.message}`);
  return (data ?? []).map((m) => ({
    id: m.id,
    senderRole: m.sender_id === user.id ? ('member' as const) : ('staff' as const),
    body: m.body,
    createdAt: m.created_at,
  }));
}

/** Member sends a message on their own thread. */
export async function sendMessageAction(channel: MessageChannel, body: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'Not signed in.' };
  if (!isChannel(channel)) return { ok: false, error: 'Unknown conversation.' };
  if (typeof body !== 'string') return { ok: false, error: 'Type a message first.' };
  const text = body.trim();
  if (!text) return { ok: false, error: 'Type a message first.' };
  if (text.length > 4000) return { ok: false, error: 'Message is too long.' };

  const db = await createSupabaseServerClient();
  const { error } = await db.from('messages').insert({
    thread_user_id: user.id,
    sender_id: user.id,
    channel,
    body: text,
  });
  if (error) return { ok: false, error: error.message };
  await notifyStaffOfReply(user.id, channel);
  revalidatePath('/portal/messages');
  return { ok: true };
}

/**
 * Tell whoever answers the thread that a member wrote: the prescriber for the
 * doctor thread, the support inbox for support. At most one email per thread
 * per 15 minutes, worked out from the member's own message times (no send
 * log). No patient name or drug anywhere in the email.
 */
async function notifyStaffOfReply(userId: string, channel: MessageChannel): Promise<void> {
  try {
    const db = await createSupabaseServerClient();
    const { data } = await db
      .from('messages')
      .select('created_at')
      .eq('thread_user_id', userId)
      .eq('sender_id', userId)
      .eq('channel', channel)
      .order('created_at', { ascending: false })
      // ponytail: replaying the last 50 is exact unless a burst runs longer.
      .limit(50);
    if (!shouldNotifyReply((data ?? []).map((m) => m.created_at))) return;

    const doctor = channel === 'doctor';
    const prescriber = doctor ? await getPrescriber().catch(() => null) : null;
    await sendEmail({
      to: prescriber?.email || SUPPORT_EMAIL,
      subject: doctor ? 'New patient reply' : 'New member message',
      html: noticeEmail({
        eyebrow: doctor ? 'Patient messages' : 'Support messages',
        heading: doctor ? 'A patient replied.' : 'A member wrote to support.',
        // No name or details: email isn't where patient information goes.
        body: 'Open the portal to read it and reply.',
        cta: {
          label: 'Open messages',
          href: `${SITE_URL}/portal/${doctor ? 'doctor' : 'admin'}/messages`,
        },
      }),
    });
  } catch {
    // The message is saved either way; the notice is best effort.
  }
}

/* ---------------------------- clinical side ------------------------------ */

/**
 * Threads for the staff inbox: one row per member on the channel, newest
 * activity first. Doctor sees 'doctor', admin sees 'support' (admin may view
 * both).
 */
export async function listMessageThreads(channel: MessageChannel): Promise<MessageThread[]> {
  const user = await getSession();
  if (!user || (user.role !== 'doctor' && user.role !== 'admin')) return [];
  if (!supabaseAdminConfigured()) return [];

  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('messages')
    .select('thread_user_id, sender_id, body, created_at')
    .eq('channel', channel)
    .order('created_at', { ascending: false })
    .limit(500);
  if (!data?.length) return [];

  // Latest message per member; flag threads where the member spoke last.
  const byUser = new Map<string, { body: string; at: string; fromMember: boolean }>();
  for (const m of data) {
    if (!byUser.has(m.thread_user_id)) {
      byUser.set(m.thread_user_id, {
        body: m.body,
        at: m.created_at,
        fromMember: m.sender_id === m.thread_user_id,
      });
    }
  }

  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, email')
    .in('id', [...byUser.keys()]);
  const names = new Map((profiles ?? []).map((p) => [p.id, p]));

  return [...byUser.entries()].map(([userId, m]) => ({
    userId,
    memberName: names.get(userId)?.full_name ?? 'Member',
    memberEmail: names.get(userId)?.email ?? '',
    lastBody: m.body,
    lastAt: m.at,
    awaitingReply: m.fromMember,
  }));
}

/** Full thread for one member, staff view. */
export async function listThreadMessages(
  userId: string,
  channel: MessageChannel
): Promise<PortalMessage[]> {
  const user = await getSession();
  if (!user || (user.role !== 'doctor' && user.role !== 'admin')) return [];
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('thread_user_id', userId)
    .eq('channel', channel)
    .order('created_at', { ascending: true })
    .limit(200);
  return (data ?? []).map((m) => ({
    id: m.id,
    senderRole: m.sender_id === userId ? ('member' as const) : ('staff' as const),
    body: m.body,
    createdAt: m.created_at,
  }));
}

/** Doctor/admin replies into a member's thread. */
export async function replyMessageAction(
  userId: string,
  channel: MessageChannel,
  body: string
): Promise<Result> {
  const user = await getSession();
  if (!user || (user.role !== 'doctor' && user.role !== 'admin')) {
    return { ok: false, error: 'Not authorized.' };
  }
  if (!supabaseAdminConfigured()) return { ok: false, error: 'Messaging is not connected.' };
  if (!isChannel(channel)) return { ok: false, error: 'Unknown conversation.' };
  const text = body.trim();
  if (!text) return { ok: false, error: 'Type a message first.' };
  if (text.length > 4000) return { ok: false, error: 'Message is too long.' };

  const db = createSupabaseAdminClient();
  const { error } = await db.from('messages').insert({
    thread_user_id: userId,
    sender_id: user.id,
    channel,
    body: text,
  });
  if (error) return { ok: false, error: error.message };

  // The member hears there is something to read; what it says stays in the portal.
  const { data: member } = await db.from('profiles').select('email').eq('id', userId).maybeSingle();
  if (member?.email) {
    try {
      await sendEmail({
        to: member.email,
        subject: 'You have a new message from your care team',
        html: noticeEmail({
          eyebrow: 'Messages',
          heading: 'You have a new message from your care team',
          body: 'Sign in to read it and reply. We keep messages in your portal rather than in email, for your privacy.',
          cta: { label: 'Read it in your portal', href: `${SITE_URL}/portal/messages?thread=${channel}` },
        }),
      });
    } catch {
      // The reply is saved either way.
    }
  }

  revalidatePath('/portal/doctor/messages');
  revalidatePath('/portal/admin/messages');
  return { ok: true };
}
