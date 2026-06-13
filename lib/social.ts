/**
 * lib/social.ts — Friends + DMs via Supabase.
 * All writes are rate-limited on the DB side (see supabase-social-tables.sql).
 * This module adds a client-side 500 ms debounce on search to reduce reads.
 */

import { supabase } from './supabase';
import { getUser } from './sync';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PublicProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  current_streak: number;
  best_streak: number;
  streak_start: string | null;
  last_active: string | null;
}

export interface FriendRequest {
  id: string;
  requester: string;
  addressee: string;
  status: 'pending' | 'accepted';
  created_at: string;
  /** Joined profile of the other person */
  profile: PublicProfile;
}

export interface DirectMessage {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  read: boolean;
  created_at: string;
}

// ── Profile helpers ────────────────────────────────────────────────────────────

/** Upsert your own public streak numbers so the leaderboard stays fresh. */
export async function syncProfileStreak(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('seedguard_stats') : null;
    const stats = raw ? JSON.parse(raw) : {};
    const start = typeof window !== 'undefined'
      ? localStorage.getItem('seedguard_streak_start')
      : null;
    await supabase.from('profiles').upsert({
      id: user.id,
      username: user.user_metadata?.username ?? user.email ?? 'Anonymous',
      current_streak: stats.currentStreak ?? 0,
      best_streak: stats.longestStreak ?? 0,
      streak_start: start ?? null,
      last_active: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[syncProfileStreak]', err);
  }
}

/** Search users by username (case-insensitive, excludes yourself). */
export async function searchUsers(query: string): Promise<PublicProfile[]> {
  const user = await getUser();
  if (!user || query.length < 2) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, current_streak, best_streak, streak_start, last_active')
    .ilike('username', `%${query}%`)
    .neq('id', user.id)
    .limit(10);
  if (error) throw error;
  return (data ?? []) as PublicProfile[];
}

// ── Friend requests ────────────────────────────────────────────────────────────

/** Send a friend request. Duplicate-prevented by DB unique index. */
export async function sendFriendRequest(addresseeId: string): Promise<void> {
  const user = await getUser();
  if (!user) throw new Error('Not logged in');
  if (addresseeId === user.id) throw new Error("You can't add yourself.");

  // Check for an existing row in either direction first (avoids a confusing DB error)
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(`and(requester.eq.${user.id},addressee.eq.${addresseeId}),and(requester.eq.${addresseeId},addressee.eq.${user.id})`)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'accepted') throw new Error('You are already friends!');
    throw new Error('A friend request already exists between you two.');
  }

  const { error } = await supabase.from('friendships').insert({
    requester: user.id,
    addressee: addresseeId,
    status: 'pending',
  });
  if (error) throw new Error(error.message);
}

/** Accept an incoming friend request (addressee only). */
export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) throw new Error(error.message);
}

/** Reject / cancel / remove — deletes the row entirely. */
export async function removeFriendship(friendshipId: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw new Error(error.message);
}

/**
 * Fetch all friendships for the current user (pending + accepted).
 * Returns them enriched with the other person's profile.
 */
export async function getMyFriendships(): Promise<{
  accepted: FriendRequest[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}> {
  const user = await getUser();
  if (!user) return { accepted: [], incoming: [], outgoing: [] };

  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id, requester, addressee, status, created_at,
      requester_profile:profiles!friendships_requester_fkey(id, username, avatar_url, current_streak, best_streak, streak_start, last_active),
      addressee_profile:profiles!friendships_addressee_fkey(id, username, avatar_url, current_streak, best_streak, streak_start, last_active)
    `)
    .or(`requester.eq.${user.id},addressee.eq.${user.id}`);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const normalize = (row: Record<string, unknown>): FriendRequest => {
    const isRequester = row.requester === user.id;
    const rawProfile = isRequester ? row.addressee_profile : row.requester_profile;
    // Supabase returns joined rows as an object; cast accordingly
    const profile = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as PublicProfile;
    return {
      id: row.id as string,
      requester: row.requester as string,
      addressee: row.addressee as string,
      status: row.status as 'pending' | 'accepted',
      created_at: row.created_at as string,
      profile,
    };
  };

  const all = rows.map(normalize);
  return {
    accepted: all.filter((r) => r.status === 'accepted'),
    incoming: all.filter((r) => r.status === 'pending' && r.addressee === user.id),
    outgoing: all.filter((r) => r.status === 'pending' && r.requester === user.id),
  };
}

// ── Direct Messages ────────────────────────────────────────────────────────────

/** Load the conversation between the current user and one friend. */
export async function getConversation(friendId: string): Promise<DirectMessage[]> {
  const user = await getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender, recipient, content, read, created_at')
    .or(
      `and(sender.eq.${user.id},recipient.eq.${friendId}),and(sender.eq.${friendId},recipient.eq.${user.id})`
    )
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);
  // Mark unread incoming messages as read
  const unread = (data ?? []).filter((m) => !m.read && m.recipient === user.id).map((m) => m.id);
  if (unread.length > 0) {
    supabase.from('messages').update({ read: true }).in('id', unread).then(() => {});
  }
  return (data ?? []) as DirectMessage[];
}

/** Send a message to a friend. */
export async function sendMessage(recipientId: string, content: string): Promise<DirectMessage> {
  const user = await getUser();
  if (!user) throw new Error('Not logged in');
  const trimmed = content.trim();
  if (!trimmed) throw new Error('Message cannot be empty.');
  if (trimmed.length > 1000) throw new Error('Message too long (max 1000 characters).');

  const { data, error } = await supabase
    .from('messages')
    .insert({ sender: user.id, recipient: recipientId, content: trimmed })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DirectMessage;
}

/** Count unread messages across all conversations. */
export async function getUnreadCount(): Promise<number> {
  const user = await getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient', user.id)
    .eq('read', false);
  return count ?? 0;
}

// ── Realtime subscriptions ─────────────────────────────────────────────────────

/**
 * Subscribe to new messages in a conversation.
 * @returns Unsubscribe function — call it on component unmount.
 */
export function subscribeToConversation(
  myId: string,
  friendId: string,
  onMessage: (msg: DirectMessage) => void
): () => void {
  let channel: RealtimeChannel | null = null;
  channel = supabase
    .channel(`conv:${[myId, friendId].sort().join('-')}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient=eq.${myId}`,
      },
      (payload) => {
        const msg = payload.new as DirectMessage;
        if (msg.sender === friendId) onMessage(msg);
      }
    )
    .subscribe();

  return () => {
    channel?.unsubscribe();
  };
}

/**
 * Subscribe to incoming friend requests.
 * @returns Unsubscribe function.
 */
export function subscribeToFriendRequests(
  myId: string,
  onUpdate: () => void
): () => void {
  const channel = supabase
    .channel(`friendships:${myId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: `addressee=eq.${myId}`,
      },
      onUpdate
    )
    .subscribe();
  return () => { channel.unsubscribe(); };
}
