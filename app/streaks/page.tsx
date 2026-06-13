'use client';

/**
 * Dedicated Streaks leaderboard tab.
 *
 * Two views (toggled at the top):
 *   "Friends"  — you + accepted friends, sorted by current streak
 *   "Global"   — all 50 top users site-wide
 *
 * Design mirrors the blue/gold reference leaderboard:
 *   • Rank badge (trophy icons for top 3, number for rest)
 *   • Avatar circle with user-colour ring
 *   • Username + tier label
 *   • Current streak (large, neon)
 *   • Best streak + started date in a secondary row
 *   • Flame indicators that glow based on streak tier
 *
 * Background art: la-sunset.jpg in the header banner.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Flame, Trophy, Medal, Crown, RefreshCw, Loader2, Globe, Users } from 'lucide-react';
import { ImageBanner } from '@/components/synth-background';
import { LeaderboardRowSkeleton } from '@/components/skeleton';
import { ProfileCard } from '@/components/profile-card';
import { useToast } from '@/components/toast';
import {
  getGlobalLeaderboard, getFriendsLeaderboard,
  fmtDate, daysSince, streakTier,
  type StreakEntry,
} from '@/lib/streaks';
import { syncProfileStreak } from '@/lib/social';
import { getUser } from '@/lib/sync';
import { supabase } from '@/lib/supabase';
import { ART } from '@/lib/assets';

type View = 'friends' | 'global';

// ── Rank badge ─────────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gold/20 border-2 border-gold/60 neon-box-gold flex-shrink-0" aria-label="1st place">
      <Crown className="w-5 h-5 text-gold flame-glow" aria-hidden />
    </div>
  );
  if (rank === 2) return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-300/10 border-2 border-zinc-300/50 flex-shrink-0" aria-label="2nd place">
      <Medal className="w-5 h-5 text-zinc-300" aria-hidden />
    </div>
  );
  if (rank === 3) return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-600/10 border-2 border-amber-600/50 flex-shrink-0" aria-label="3rd place">
      <Medal className="w-5 h-5 text-amber-500" aria-hidden />
    </div>
  );
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/20 border border-muted/30 flex-shrink-0">
      <span className="text-sm font-extrabold text-muted-foreground tabular-nums">#{rank}</span>
    </div>
  );
}

// ── Flame indicator row ─────────────────────────────────────────────────────────
function FlameRow({ days }: { days: number }) {
  const { flames, color } = streakTier(days);
  if (flames === 0) return null;
  return (
    <div className="flex gap-0.5" aria-label={`${flames} out of 5 flames`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Flame
          key={i}
          className={`w-3.5 h-3.5 ${i < flames ? `${color} flame-glow` : 'text-muted/25'}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

// ── Single leaderboard row ──────────────────────────────────────────────────────
function LeaderboardRow({ entry, rank }: { entry: StreakEntry; rank: number }) {
  const tier = streakTier(entry.current_streak);
  const stale = daysSince(entry.last_active ?? null);
  const initial = (entry.username ?? '?').charAt(0).toUpperCase();

  // Row border colour by rank
  const rankBorder =
    rank === 1 ? 'border-gold/40' :
    rank === 2 ? 'border-zinc-300/30' :
    rank === 3 ? 'border-amber-600/30' :
    'border-muted/20';

  return (
    <li
      className={`
        rounded-2xl border ${rankBorder} glass-effect p-4 flex items-center gap-3
        neon-hover transition-all duration-200
        ${entry.isMe ? 'ring-1 ring-primary/40' : ''}
      `}
    >
      <RankBadge rank={rank} />

      {/* Avatar — click for profile card */}
      <ProfileCard entry={entry}>
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm border-2 flex-shrink-0 ${tier.color}`}
          style={{ borderColor: `hsl(var(--primary) / 0.45)` }}
        >
          {entry.avatar_url ? (
            <img src={entry.avatar_url} alt="" className="w-full h-full rounded-full object-cover" loading="lazy" />
          ) : initial}
        </div>
      </ProfileCard>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-bold text-sm truncate ${entry.isMe ? 'neon-text-pink text-primary' : ''}`}>
            {entry.username}
          </span>
          {entry.isMe && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold uppercase tracking-wider">
              You
            </span>
          )}
          {tier.label && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-muted/20 ${tier.color} uppercase tracking-wider font-semibold`}>
              {tier.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <FlameRow days={entry.current_streak} />
          <span className="text-xs text-muted-foreground tabular-nums">Best: {entry.best_streak}d</span>
          {entry.streak_start && (
            <span className="text-xs text-muted-foreground">Since {fmtDate(entry.streak_start)}</span>
          )}
          {stale >= 3 && !entry.isMe && (
            <span className="text-[10px] text-muted-foreground/60">Updated {stale}d ago</span>
          )}
        </div>
      </div>

      {/* Current streak — the headline number */}
      <div className="flex-shrink-0 text-right">
        <p className={`text-2xl md:text-3xl font-extrabold tabular-nums leading-none ${tier.color} ${rank <= 3 ? (rank === 1 ? 'neon-text-gold' : 'neon-text-pink') : ''}`}>
          {entry.current_streak}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">days</p>
      </div>
    </li>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────
export default function StreaksPage() {
  const { toast } = useToast();
  const [view, setView] = useState<View>('friends');
  const [entries, setEntries] = useState<StreakEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);
    try {
      // Push latest local streak to the DB so our row is current
      await syncProfileStreak();
      const data = view === 'global'
        ? await getGlobalLeaderboard()
        : await getFriendsLeaderboard();
      setEntries(data);
    } catch (err: unknown) {
      toast((err as Error).message ?? 'Failed to load leaderboard.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [view, toast]);

  useEffect(() => {
    getUser().then((u) => setLoggedIn(!!u));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Live updates: Realtime + 60-second polling fallback ──────────────────────
  const loadDataRef = useRef(loadData);
  useEffect(() => { loadDataRef.current = loadData; }, [loadData]);

  useEffect(() => {
    // Supabase Realtime — fires immediately when any profile's streak changes
    const channel = supabase
      .channel('leaderboard-profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => { loadDataRef.current(true); }
      )
      .subscribe();

    // 60-second polling fallback (covers browsers that block WebSockets)
    const interval = setInterval(() => { loadDataRef.current(true); }, 60_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []); // runs once on mount, cleaned up on unmount
  // ─────────────────────────────────────────────────────────────────────────────

  const myEntry = entries.find((e) => e.isMe);

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl space-y-6 page-entry">
      {/* Header banner — la-sunset.jpg placed here */}
      <ImageBanner src={ART.laSunset} className="mb-2">
        <div className="p-6 md:p-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-widest uppercase italic neon-text-gold text-gold flex items-center gap-3">
              <Trophy className="w-8 h-8" aria-hidden />
              Streaks
            </h1>
            <p className="text-muted-foreground text-base mt-1">
              {view === 'friends' ? 'Your circle ranked by current streak.' : 'Top 50 warriors site-wide.'}
            </p>
          </div>

          {/* Refresh */}
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            aria-label="Refresh leaderboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gold/30 text-gold bg-gold/10 hover:bg-gold/20 text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            {refreshing
              ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              : <RefreshCw className="w-4 h-4" aria-hidden />}
            Refresh
          </button>
        </div>
      </ImageBanner>

      {/* View toggle */}
      <div
        className="inline-flex rounded-xl border border-muted/30 bg-muted/10 p-1 gap-1 w-full sm:w-auto"
        role="tablist"
        aria-label="Leaderboard scope"
      >
        {([
          { id: 'friends', label: 'Friends', icon: Users },
          { id: 'global',  label: 'Global',  icon: Globe },
        ] as { id: View; label: string; icon: typeof Globe }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold uppercase tracking-wider text-sm transition-all
              ${view === id
                ? 'bg-gold/20 text-gold border border-gold/40 neon-box-gold'
                : 'text-muted-foreground hover:text-foreground'}
            `}
          >
            <Icon className="w-4 h-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {/* My rank card (pinned, only when logged in) */}
      {loggedIn && myEntry && !loading && (
        <div className="rounded-2xl border border-primary/30 glass-effect p-4 flex items-center gap-4 neon-box-pink animate-scale-in">
          <RankBadge rank={myEntry.rank} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Your rank</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold neon-text-pink text-primary">{myEntry.username}</span>
              <FlameRow days={myEntry.current_streak} />
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-extrabold neon-text-pink text-primary tabular-nums">{myEntry.current_streak}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">days</p>
          </div>
        </div>
      )}

      {/* Leaderboard list */}
      {loading ? (
        <ul className="space-y-3" aria-label="Loading leaderboard">
          {Array.from({ length: 6 }).map((_, i) => <li key={i}><LeaderboardRowSkeleton /></li>)}
        </ul>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-muted/30 p-12 text-center text-muted-foreground">
          <Flame className="w-10 h-10 mx-auto mb-3 opacity-30 flame-glow" aria-hidden />
          {view === 'friends' ? (
            <>
              <p className="font-semibold">No friends yet.</p>
              <p className="text-sm mt-1">Add friends in the Social tab to see their streaks here.</p>
            </>
          ) : (
            <>
              <p className="font-semibold">No data yet.</p>
              <p className="text-sm mt-1">Be the first! Create an account and start your streak.</p>
            </>
          )}
        </div>
      ) : (
        <>
          <ul className="space-y-3" role="list" aria-label={`${view === 'global' ? 'Global' : 'Friends'} leaderboard`}>
            {entries.map((entry) => (
              <LeaderboardRow key={entry.id} entry={entry} rank={entry.rank} />
            ))}
          </ul>

          {/* Summary footer */}
          <div className="rounded-xl border border-muted/15 bg-muted/5 p-4 flex flex-wrap gap-6 justify-center text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{entries.length}</strong>{' '}
              {view === 'global' ? 'users ranked' : 'friends tracked'}
            </span>
            <span>
              Top streak:{' '}
              <strong className={streakTier(entries[0]?.current_streak ?? 0).color}>
                {entries[0]?.current_streak ?? 0} days
              </strong>
            </span>
            <span>
              Avg streak:{' '}
              <strong className="text-foreground">
                {Math.round(entries.reduce((s, e) => s + e.current_streak, 0) / (entries.length || 1))} days
              </strong>
            </span>
          </div>
        </>
      )}

      {/* How-to note */}
      <div className="rounded-xl border border-muted/15 bg-muted/5 p-5 text-xs text-muted-foreground space-y-1.5">
        <p className="font-bold text-foreground uppercase tracking-wider text-xs">How the leaderboard updates</p>
        <p>Your streak is pushed to the board every time you open this tab or the Dashboard. Friends appear automatically once you&apos;re connected in the Social tab. Global rankings refresh in real-time as users sync.</p>
      </div>
    </div>
  );
}
