/**
 * lib/streaks.ts — Leaderboard queries for the dedicated Streaks tab.
 */

import { supabase } from './supabase';
import { getUser } from './sync';
import type { PublicProfile } from './social';

export interface StreakEntry {
  rank: number;
  id: string;
  username: string;
  avatar_url: string | null;
  current_streak: number;
  best_streak: number;
  streak_start: string | null;
  last_active: string | null;
  isMe: boolean;
}

/** Global leaderboard — top 50 users by current streak. */
export async function getGlobalLeaderboard(): Promise<StreakEntry[]> {
  const user = await getUser();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, current_streak, best_streak, streak_start, last_active')
    .order('current_streak', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    id: row.id,
    username: row.username ?? 'Anonymous',
    avatar_url: row.avatar_url ?? null,
    current_streak: row.current_streak ?? 0,
    best_streak: row.best_streak ?? 0,
    streak_start: row.streak_start ?? null,
    last_active: row.last_active ?? null,
    isMe: user?.id === row.id,
  }));
}

/** Friends-only leaderboard. */
export async function getFriendsLeaderboard(): Promise<StreakEntry[]> {
  const user = await getUser();
  if (!user) return [];

  // Collect accepted friend IDs
  const { data: friendships, error: fe } = await supabase
    .from('friendships')
    .select('requester, addressee')
    .eq('status', 'accepted')
    .or(`requester.eq.${user.id},addressee.eq.${user.id}`);

  if (fe) throw new Error(fe.message);

  const friendIds: string[] = (friendships ?? []).map((f) =>
    f.requester === user.id ? f.addressee : f.requester
  );

  // Always include yourself
  const ids = Array.from(new Set([user.id, ...friendIds]));

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, current_streak, best_streak, streak_start, last_active')
    .in('id', ids)
    .order('current_streak', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    id: row.id,
    username: row.username ?? 'Anonymous',
    avatar_url: row.avatar_url ?? null,
    current_streak: row.current_streak ?? 0,
    best_streak: row.best_streak ?? 0,
    streak_start: row.streak_start ?? null,
    last_active: row.last_active ?? null,
    isMe: user.id === row.id,
  }));
}

/** Format an ISO date string for display. */
export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/** Days since an ISO timestamp. */
export function daysSince(iso: string | null): number {
  if (!iso) return 0;
  try {
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  } catch {
    return 0;
  }
}

/** Colour class + flame intensity based on streak length. */
export function streakTier(days: number): {
  color: string;
  glow: string;
  flames: number;
  label: string;
} {
  if (days >= 365) return { color: 'text-gold',     glow: 'neon-box-gold',  flames: 5, label: 'Legend' };
  if (days >= 180) return { color: 'text-accent',   glow: 'neon-box-cyan',  flames: 4, label: 'Elite' };
  if (days >= 90)  return { color: 'text-secondary', glow: 'neon-box-cyan',  flames: 3, label: 'Master' };
  if (days >= 30)  return { color: 'text-primary',   glow: 'neon-box-pink',  flames: 2, label: 'Rising' };
  if (days >= 7)   return { color: 'text-primary/80', glow: '',              flames: 1, label: 'Builder' };
  return              { color: 'text-muted-foreground', glow: '',            flames: 0, label: '' };
}
