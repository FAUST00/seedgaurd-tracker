'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Flame, TrendingUp, Award, Calendar, Clock, Users, ChevronRight, Quote } from 'lucide-react';
import { syncWithCloud, getStreakFromCloud, getUser } from '@/lib/sync';

interface DashboardStats {
  currentStreak: number;
  totalDays: number;
  longestStreak: number;
  relapses: number;
}

interface TimerParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// ── 25 motivational quotes (PMO recovery · Stoic · Discipline) ──────────────
const QUOTES = [
  { text: 'You have power over your mind, not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius' },
  { text: 'The first and greatest victory is to conquer yourself.', author: 'Plato' },
  { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
  { text: 'We suffer more in imagination than in reality.', author: 'Seneca' },
  { text: 'He who conquers himself is the mightiest warrior.', author: 'Confucius' },
  { text: 'Difficulties strengthen the mind, as labor does the body.', author: 'Seneca' },
  { text: 'What we do in life echoes in eternity.', author: 'Marcus Aurelius' },
  { text: 'The successful warrior is the average man with laser-like focus.', author: 'Bruce Lee' },
  { text: 'We become what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'If it is not right, do not do it; if it is not true, do not say it.', author: 'Marcus Aurelius' },
  { text: 'Self-control is the chief element in self-respect, and self-respect is the chief element in courage.', author: 'Thucydides' },
  { text: 'The cave you fear to enter holds the treasure you seek.', author: 'Joseph Campbell' },
  { text: 'Real freedom is not freedom from responsibility — it is the freedom that comes from mastering yourself.', author: '' },
  { text: 'Waste no more time arguing what a good man should be. Be one.', author: 'Marcus Aurelius' },
  { text: 'The more you sweat in training, the less you bleed in battle.', author: 'Sun Tzu' },
  { text: 'One day or day one. You decide.', author: '' },
  { text: 'Every battle is won before it is ever fought.', author: 'Sun Tzu' },
  { text: 'You will continue to suffer if you have an emotional reaction to everything that is said to you. True power is sitting back and observing with logic.', author: 'Bruce Lee' },
  { text: 'Conquer the angry one by not getting angry; conquer the wicked by goodness; conquer the miser by generosity; conquer the liar by truth.', author: 'Buddha' },
  { text: 'Between stimulus and response there is a space. In that space is our power to choose our response.', author: 'Viktor Frankl' },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', author: 'Marcus Aurelius' },
  { text: 'Strength does not come from physical capacity. It comes from an indomitable will.', author: 'Mahatma Gandhi' },
  { text: 'Make the most of yourself, for that is all there is of you.', author: 'Ralph Waldo Emerson' },
  { text: 'Your future self is watching you right now through your memories. Make him proud.', author: '' },
] as const;

async function resolveStreakStart(): Promise<Date> {
  try {
    const cloudStart = await getStreakFromCloud();
    if (cloudStart) {
      if (typeof window !== 'undefined') localStorage.setItem('seedguard_streak_start', cloudStart);
      return new Date(cloudStart);
    }
    const local = typeof window !== 'undefined' ? localStorage.getItem('seedguard_streak_start') : null;
    if (local) return new Date(local);

    const relapses = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('seedguard_relapses') || '[]' : '[]');
    if (relapses.length > 0) {
      const latest = [...relapses].sort((a: any, b: any) =>
        new Date(b.relapse_time).getTime() - new Date(a.relapse_time).getTime()
      )[0];
      const d = new Date(latest.relapse_time);
      localStorage.setItem('seedguard_streak_start', d.toISOString());
      return d;
    }
    const profile = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('seedguard_profile') || 'null' : 'null');
    if (profile?.created_at) {
      const d = new Date(profile.created_at);
      localStorage.setItem('seedguard_streak_start', d.toISOString());
      return d;
    }
  } catch {}
  const now = new Date().toISOString();
  if (typeof window !== 'undefined') {
    localStorage.setItem('seedguard_streak_start', now);
    localStorage.setItem('seedguard_first_day', now);
  }
  return new Date(now);
}

function getFirstDay(): Date {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('seedguard_first_day') : null;
  if (stored) return new Date(stored);
  const now = new Date().toISOString();
  if (typeof window !== 'undefined') localStorage.setItem('seedguard_first_day', now);
  return new Date(now);
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({ currentStreak: 0, totalDays: 0, longestStreak: 0, relapses: 0 });
  const [timer, setTimer] = useState<TimerParts>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);
  const [hasAccount, setHasAccount] = useState(false);
  const [showStreakEdit, setShowStreakEdit] = useState(false);
  const [editDateInput, setEditDateInput] = useState('');
  const [streakDisplayDate, setStreakDisplayDate] = useState('');

  // ── Quote state — hourly base + manual offset ──────────────────────────────
  const [quoteOffset, setQuoteOffset] = useState(0);
  const hourlyBase = Math.floor(Date.now() / 3_600_000) % QUOTES.length;
  const currentQuoteIdx = (hourlyBase + quoteOffset) % QUOTES.length;
  const currentQuote = QUOTES[currentQuoteIdx];

  // Auto-advance quote every hour
  useEffect(() => {
    const id = setInterval(() => {
      // Force re-render so hourlyBase recomputes; offset stays
      setQuoteOffset(o => o); // triggers re-render
    }, 3_600_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('seedguard_stats') : null;
        if (saved) setStats(JSON.parse(saved));
      } catch {}
      const user = await getUser();
      setHasAccount(!!(user || (typeof window !== 'undefined' && localStorage.getItem('seedguard_account'))));

      const start = await resolveStreakStart();
      setStreakDisplayDate(start.toLocaleDateString());
      setLoading(false);
    }
    init();
  }, []);

  // Live timer
  useEffect(() => {
    const tick = async () => {
      const start = await resolveStreakStart();
      const totalSec = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
      setTimer({
        days: Math.floor(totalSec / 86400),
        hours: Math.floor((totalSec % 86400) / 3600),
        minutes: Math.floor((totalSec % 3600) / 60),
        seconds: totalSec % 60,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Sync stats when day changes
  useEffect(() => {
    if (loading) return;
    setStats(prev => {
      const firstDay = getFirstDay();
      const totalDays = Math.floor((Date.now() - firstDay.getTime()) / 86400000);
      const longestStreak = Math.max(prev.longestStreak, timer.days);
      const updated = { ...prev, currentStreak: timer.days, totalDays, longestStreak };
      if (typeof window !== 'undefined') localStorage.setItem('seedguard_stats', JSON.stringify(updated));
      return updated;
    });
    syncWithCloud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.days, loading]);

  const handleSaveStreak = async () => {
    if (!editDateInput) return;
    const d = new Date(editDateInput);
    if (isNaN(d.getTime())) return;
    if (typeof window !== 'undefined') localStorage.setItem('seedguard_streak_start', d.toISOString());
    await syncWithCloud(true);
    setStreakDisplayDate(d.toLocaleDateString());
    setShowStreakEdit(false);
    window.location.reload();
  };

  if (typeof window === 'undefined') return null;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl space-y-8 page-entry">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-widest uppercase italic neon-text-cyan text-secondary">Dashboard</h1>
          <p className="text-muted-foreground text-lg mt-2">Your journey to freedom starts here. Every second counts.</p>
        </div>
        {!hasAccount && (
          <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-all neon-text-pink">
            <Users className="w-4 h-4" />
            Sign In / Create Account
          </Link>
        )}
      </div>

      {/* Live Streak Timer */}
      <div className="rounded-xl border border-primary/30 bg-background/60 backdrop-blur-sm p-6 md:p-8 neon-box-pink animate-scale-in">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold uppercase tracking-widest text-primary neon-text-pink">Live Streak Timer</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#e87f9f' }}>Started: {streakDisplayDate}</span>
          <button
            onClick={() => { setShowStreakEdit(v => !v); const s = localStorage.getItem('seedguard_streak_start'); setEditDateInput(s ? new Date(s).toISOString().slice(0,10) : ''); }}
            style={{ background: 'transparent', border: '1px solid #a21caf', borderRadius: '6px', padding: '2px 10px', color: '#e87f9f', cursor: 'pointer', fontSize: '0.8rem' }}
          >✏️ Edit</button>
        </div>

        {showStreakEdit && (
          <div style={{ marginTop: '8px', marginBottom: '16px', padding: '12px', background: '#1a0a2e', border: '1px solid #7c3aed', borderRadius: '6px' }}>
            <p style={{ color: '#ddb4fe', fontSize: '0.8rem', marginBottom: '8px' }}>Set streak start date:</p>
            <input type="date" value={editDateInput} onChange={e => setEditDateInput(e.target.value)}
              style={{ background: '#1a0b2e', border: '1px solid #7c3aed', borderRadius: '6px', padding: '6px 10px', color: '#e2b4ff', width: '100%', marginBottom: '8px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSaveStreak} style={{ background: '#2c1aae', border: 'none', borderRadius: '6px', padding: '6px 16px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Save</button>
              <button onClick={() => setShowStreakEdit(false)} style={{ background: 'transparent', border: '1px solid #6b7280', borderRadius: '6px', padding: '6px 16px', color: '#9ca3af', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 md:gap-6">
          {[
            { value: timer.days, label: 'Days' },
            { value: pad(timer.hours), label: 'Hours' },
            { value: pad(timer.minutes), label: 'Minutes' },
            { value: pad(timer.seconds), label: 'Seconds' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-full rounded-xl border border-primary/25 bg-background/80 py-4 px-2 flex items-center justify-center">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-primary neon-text-pink tabular-nums leading-none">{value}</span>
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-semibold">{label}</span>
            </div>
           ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative overflow-hidden rounded-xl border border-primary/20 bg-background/50 backdrop-blur-sm p-5 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 animate-scale-in">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-start justify-between">
            <div><p className="text-xs text-muted-foreground mb-1">Current Streak</p><p className="text-3xl font-bold text-primary neon-text-pink">{timer.days}</p><p className="text-xs text-muted-foreground mt-1">days clean</p></div>
            <div className="rounded-full bg-primary/10 p-2"><Flame className="w-5 h-5 text-primary" /></div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-secondary/20 bg-background/50 backdrop-blur-sm p-5 hover:border-secondary/50 transition-all duration-300 hover:shadow-lg animate-scale-in [animation-delay:50ms]">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-start justify-between">
            <div><p className="text-xs text-muted-foreground mb-1">Total Days</p><p className="text-3xl font-bold text-secondary neon-text-cyan">{stats.totalDays}</p><p className="text-xs text-muted-foreground mt-1">tracked</p></div>
            <div className="rounded-full bg-secondary/10 p-2"><Calendar className="w-5 h-5 text-secondary" /></div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-accent/20 bg-background/50 backdrop-blur-sm p-5 hover:border-accent/50 transition-all duration-300 hover:shadow-lg animate-scale-in [animation-delay:100ms]">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-start justify-between">
            <div><p className="text-xs text-muted-foreground mb-1">Longest Streak</p><p className="text-3xl font-bold text-accent">{stats.longestStreak}</p><p className="text-xs text-muted-foreground mt-1">personal best</p></div>
            <div className="rounded-full bg-accent/10 p-2"><TrendingUp className="w-5 h-5 text-accent" /></div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-destructive/20 bg-background/50 backdrop-blur-sm p-5 hover:border-destructive/50 transition-all duration-300 hover:shadow-lg animate-scale-in [animation-delay:150ms]">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-start justify-between">
            <div><p className="text-xs text-muted-foreground mb-1">Relapses</p><p className="text-3xl font-bold text-destructive">{stats.relapses}</p><p className="text-xs text-muted-foreground mt-1">logged</p></div>
            <div className="rounded-full bg-destructive/10 p-2"><Award className="w-5 h-5 text-destructive" /></div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/history" className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-sm p-8 text-center hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group animate-scale-in [animation-delay:200ms]">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-4 group-hover:scale-110 transition-transform">
            <Flame className="w-7 h-7 text-primary drop-shadow-[0_0_8px_rgba(255,0,255,0.6)]" />
          </div>
          <h3 className="font-bold text-lg mb-2 uppercase tracking-wider">Log Entry</h3>
          <p className="text-sm text-muted-foreground">Record a victory or log a relapse to keep your streak accurate.</p>
        </Link>
        <Link href="/social" className="rounded-xl border border-secondary/20 bg-background/50 backdrop-blur-sm p-8 text-center hover:border-secondary/50 transition-all duration-300 hover:shadow-lg hover:shadow-secondary/10 group animate-scale-in [animation-delay:250ms]">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-7 h-7 text-secondary drop-shadow-[0_0_8px_rgba(0,255,255,0.6)]" />
          </div>
          <h3 className="font-bold text-lg mb-2 uppercase tracking-wider">Leaderboard</h3>
          <p className="text-sm text-muted-foreground">Compare streaks with friends and see the community rankings.</p>
        </Link>
      </div>

      {/* ** motivational quote **/}
      <div className="rounded-xl border border-secondary/30 bg-background/50 backdrop-blur-sm p-6 md:p-8 animate-scale-in [animation-delay:300ms] neon-box-cyan">
        <div className="flex items-center gap-2 mb-4">
          <Quote className="w-4 h-4 text-secondary/70" aria-hidden />
          <p className="text-xs text-secondary/70 uppercase tracking-widest font-bold">Daily Wisdom</p>
          <span className="ml-auto text-xs text-muted-foreground/50 tabular-nums">{currentQuoteIdx + 1} / {QUOTES.length}</span>
        </div>

        <blockquote className="text-base md:text-lg text-foreground leading-relaxed italic mb-3 min-h-[4rem]">
          &ldquo;{currentQuote.text}&rdquo;
        </blockquote>

        {currentQuote.author ? (
          <p className="text-sm text-secondary font-semibold neon-text-cyan">— {currentQuote.author}</p>
        ) : null}

        <button
          onClick={() => setQuoteOffset(o => (o + 1) % QUOTES.length)}
          className="mt-5 inline-flex items-center gap-1.5 text-xs text-secondary/70 hover:text-secondary font-bold uppercase tracking-wider transition-colors"
          aria-label="Next quote"
        >
          Next Quote <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inspirational footer */}
      <div className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/5 to-secondary/5 backdrop-blur-sm p-8 text-center animate-scale-in [animation-delay:350ms]">
        <p className="text-lg text-foreground leading-relaxed">
          Every second <span className="font-bold text-primary neon-text-pink">you hold</span> is a victory.
          <span className="block mt-4 text-muted-foreground text-base">This is your space to build the discipline and freedom you deserve.</span>
        </p>
      </div>
    </div>
  );
}
