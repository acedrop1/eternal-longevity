'use server';

/**
 * Portal messaging: each member has two threads — 'support' (admin answers)
 * and 'doctor' (the prescriber answers). Member reads/writes run as the
 * caller through RLS. Doctor/admin replies go through the service role after
 * an explicit role check, same pattern as the order workflow.
 */

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { supabaseConfigured } from '@/lib/env';
import { getSession } from '@/lib/auth-server';

export type MessageChannel = 'support' | 'doctor';

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
  const { data } = await db
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('thread_user_id', user.id)
    .eq('channel', channel)
    .order('created_at', { ascending: true })
    .limit(200);
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
  revalidatePath('/portal/messages');
  return { ok: true };
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
  revalidatePath('/portal/doctor/messages');
  revalidatePath('/portal/admin/messages');
  return { ok: true };
}
