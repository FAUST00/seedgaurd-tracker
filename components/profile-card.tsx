'use client';

/**
 * ProfileCard — mini hover card shown on leaderboard / friends rows.
 * Appears in a floating panel positioned relative to the trigger element.
 */

import { useEffect, useRef, useState } from 'react';
import { Flame, Trophy, Calendar, Ghost } from 'lucide-react';
import { streakTier, fmtDate } from '@/lib/streaks';
import type { StreakEntry } from '@/lib/streaks';

interface Props {
  entry: Pick<StreakEntry, 'id' | 'username' | 'avatar_url' | 'current_streak' | 'best_streak' | 'streak_start' | 'last_active' | 'isMe'>;
  children: React.ReactNode;  // the trigger element
}

export function ProfileCard({ entry, children }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<'right' | 'left'>('right');
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Position card so it doesn't go off-screen
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos(rect.left > window.innerWidth / 2 ? 'left' : 'right');
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!cardRef.current?.contains(e.target as Node) &&
          !triggerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const tier = streakTier(entry.current_streak);
  const initial = entry.username.charAt(0).toUpperCase();

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div
        tabIndex={0}
        role="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`View ${entry.username}'s profile`}
        className="cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen((v) => !v)}
      >
        {children}
      </div>

      {open && (
        <div
          ref={cardRef}
          role="dialog"
          aria-label={`${entry.username}'s profile`}
          className={`
            absolute top-0 z-50 w-60
            ${pos === 'right' ? 'left-full ml-3' : 'right-full mr-3'}
            glass-effect border border-primary/30 rounded-2xl p-5 shadow-2xl animate-scale-in
          `}
        >
          {/* Avatar */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-extrabold border-2 border-primary/50 bg-primary/15 ${tier.color}`}
            >
              {entry.avatar_url ? (
                <img
                  src={entry.avatar_url}
                  alt={`${entry.username} avatar`}
                  className="w-full h-full rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0">
              <p className={`font-bold truncate text-sm ${tier.color} ${entry.isMe ? 'neon-text-pink' : ''}`}>
                {entry.username}
              </p>
              {entry.isMe && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary uppercase tracking-wider">
                  You
                </span>
              )}
              {tier.label && (
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{tier.label}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 flame-glow" aria-hidden /> Current
              </span>
              <span className={`font-bold tabular-nums ${tier.color}`}>
                {entry.current_streak} days
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" aria-hidden /> Best
              </span>
              <span className="font-semibold tabular-nums">{entry.best_streak} days</span>
            </div>
            {entry.streak_start && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" aria-hidden /> Started
                </span>
                <span className="text-xs tabular-nums">{fmtDate(entry.streak_start)}</span>
              </div>
            )}
          </div>

          {/* Flame indicators */}
          {tier.flames > 0 && (
            <div className="mt-3 flex gap-1 justify-center" aria-label={`${tier.flames} flame rating`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Flame
                  key={i}
                  className={`w-4 h-4 transition-opacity ${i < tier.flames ? `${tier.color} flame-glow` : 'text-muted/30'}`}
                  aria-hidden
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
