'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Flame, TrendingUp, Award, Calendar, Shield, Clock, Users } from 'lucide-react';

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

function getStreakStart(): Date {
  try {
    const start = (typeof window!=='undefined'?localStorage:null)?.getItem('seedguard_streak_start');
    if (start) return new Date(start);

    // Compatibility: try old relapse keys from legacy HTML version
    const relapses = JSON.parse((typeof window!=='undefined'?localStorage:null)?.getItem('seedguard_relapses') || '[]');
    if (relapses.length > 0) {
      const latest = [...relapses].sort(
        (a: { relapse_time: string }, b: { relapse_time: string }) =>
          new Date(b.relapse_time).getTime() - new Date(a.relapse_time).getTime()
      )[0];
      const d = new Date(latest.relapse_time);
      localStorage.setItem('seedguard_streak_start', d.toISOString());
      return d;
    }

    const profile = JSON.parse((typeof window!=='undefined'?localStorage:null)?.getItem('seedguard_profile') || 'null');
    if (profile?.created_at) {
      const d = new Date(profile.created_at);
      localStorage.setItem('seedguard_streak_start', d.toISOString());
      return d;
    }
  } catch {}

  const now = new Date().toISOString();
  localStorage.setItem('seedguard_streak_start', now);
  // Also set first-day if not already set
  if (!(typeof window!=='undefined'?localStorage:null)?.getItem('seedguard_first_day')) {
    localStorage.setItem('seedguard_first_day', now);
  }
  return new Date(now);
}

function getFirstDay(): Date {
  const stored = (typeof window!=='undefined'?localStorage:null)?.getItem('seedguard_first_day');
  if (stored) return new Date(stored);
  const now = new Date().toISOString();
  localStorage.setItem('seedguard_first_day', now);
  return new Date(now);
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    currentStreak: 0,
    totalDays: 0,
    longestStreak: 0,
    relapses: 0,
  });
  const [timer, setTimer] = useState<TimerParts>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);
  const [hasAccount, setHasAccount] = useState(false);

  const [showStreakEdit, setShowStreakEdit] = useState(false);
  const [editDateInput, setEditDateInput] = useState('');

  // Load initial stats
  useEffect(() => {
    try {
      const saved = (typeof window!=='undefined'?localStorage:null)?.getItem('seedguard_stats');
      if (saved) {
        setStats(JSON.parse(saved));
      }
    } catch {}
    setHasAccount(!!(typeof window!=='undefined'?localStorage:null)?.getItem('seedguard_account'));
    setLoading(false);
  }, []);

  // Live timer — ticks every second
  useEffect(() => {
    const tick = () => {
      const start = getStreakStart();
      const totalSec = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;
      setTimer({ days, hours, minutes, seconds });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Sync streak days into stats (only triggers when day count changes)
  useEffect(() => {
    if (loading) return;

    setStats(prev => {
      const firstDay = getFirstDay();
      const totalDays = Math.floor((Date.now() - firstDay.getTime()) / 86400000);
      const longestStreak = Math.max(prev.longestStreak, timer.days);
      const updated: DashboardStats = {
        ...prev,
        currentStreak: timer.days,
        totalDays,
        longestStreak,
      };
      localStorage.setItem('seedguard_stats', JSON.stringify(updated));
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.days, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-bounce-subtle text-primary neon-text-pink">
          <Shield className="w-8 h-8" />
        </div>
      </div>
    );
  }

  const handleSaveStreak = () => {
    if (!editDateInput) return;
    const d = new Date(editDateInput);
    if (isNaN(d.getTime())) return;
    localStorage.setItem('seedguard_streak_start', String(d.getTime()));
    setShowStreakEdit(false);
    window.location.reload();
  };
  if (typeof window === 'undefined') return null;
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl space-y-8 page-entry">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-widest uppercase italic neon-text-cyan text-secondary">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Your journey to freedom starts here. Every second counts.
          </p>
        </div>
        {!hasAccount && (
          <Link
            href="/account"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-all neon-text-pink"
          >
            <Users className="w-4 h-4" />
            Create Account
          </Link>
        )}
      </div>

      {/* ── Live Streak Timer ── */}
      <div className="rounded-xl border border-primary/30 bg-background/60 backdrop-blur-sm p-6 md:p-8 neon-box-pink animate-scale-in">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold uppercase tracking-widest text-primary neon-text-pink">
            Live Streak Timer
          </h2>
        </div>
          <div style={{display:'flex',alignItems:'center',gap:'12px',marginTop:'8px'}}>
            <span style={{fontSize:'1.1rem',fontWeight:'bold',color:'#e879f9'}}>Day {timer.days + 1}</span>
            <button onClick={()=>{setShowStreakEdit(v=>!v);setEditDateInput(start?new Date(Number(start)).toISOString().slice(0,16):'');}} style={{background:'transparent',border:'1px solid #a21caf',borderRadius:'6px',padding:'2px 10px',color:'#e879f9',cursor:'pointer',fontSize:'0.8rem'}}>✏️ Edit Streak</button>
          </div>
          {showStreakEdit&&(<div style={{marginTop:'10px',padding:'12px',background:'#1a0a2e',border:'1px solid #7c3aed',borderRadius:'10px'}}>
            <p style={{color:'#d8b4fe',fontSize:'0.85rem',marginBottom:'8px'}}>Set streak start date &amp; time:</p>
            <input type="datetime-local" value={editDateInput} onChange={e=>setEditDateInput(e.target.value)} style={{background:'#0f0718',border:'1px solid #7c3aed',borderRadius:'6px',padding:'6px 10px',color:'#f3e8ff',width:'100%',marginBottom:'8px'}} />
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={handleSaveStreak} style={{background:'#7c3aed',border:'none',borderRadius:'6px',padding:'6px 16px',color:'white',cursor:'pointer',fontWeight:600}}>Save</button>
              <button onClick={()=>setShowStreakEdit(false)} style={{background:'transparent',border:'1px solid #6b7280',borderRadius:'6px',padding:'6px 16px',color:'#9ca3af',cursor:'pointer'}}>Cancel</button>
            </div>
          </div>)}

        <div className="grid grid-cols-4 gap-2 md:gap-6">
          {(
            [
              { value: timer.days, label: 'Days' },
              { value: pad(timer.hours), label: 'Hours' },
              { value: pad(timer.minutes), label: 'Minutes' },
              { value: pad(timer.seconds), label: 'Seconds' },
            ] as const
          ).map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-full rounded-xl border border-primary/25 bg-background/80 py-4 px-2 flex items-center justify-center">
                <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-mono text-primary neon-text-pink tabular-nums leading-none">
                  {value}
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Streak */}
        <div className="group relative overflow-hidden rounded-xl border border-primary/20 bg-background/50 backdrop-blur-sm p-5 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 animate-scale-in">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Streak</p>
                <p className="text-3xl font-bold text-primary neon-text-pink">{timer.days}</p>
                <p className="text-xs text-muted-foreground mt-1">days clean</p>
              </div>
              <div className="rounded-full bg-primary/10 p-2">
                <Flame className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(255,0,255,0.6)]" />
              </div>
            </div>
          </div>
        </div>
        {/* Total Days */}
        <div className="group relative overflow-hidden rounded-xl border border-secondary/20 bg-background/50 backdrop-blur-sm p-5 hover:border-secondary/50 transition-all duration-300 hover:shadow-lg hover:shadow-secondary/20 animate-scale-in [animation-delay:50ms]">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Days</p>
                <p className="text-3xl font-bold text-secondary neon-text-cyan">{stats.totalDays}</p>
                <p className="text-xs text-muted-foreground mt-1">tracked</p>
              </div>
              <div className="rounded-full bg-secondary/10 p-2">
                <Calendar className="w-5 h-5 text-secondary drop-shadow-[0_0_8px_rgba(0,255,255,0.6)]" />
              </div>
            </div>
          </div>
        </div>
        {/* Longest Streak */}
        <div className="group relative overflow-hidden rounded-xl border border-accent/20 bg-background/50 backdrop-blur-sm p-5 hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-accent/20 animate-scale-in [animation-delay:100ms]">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Longest Streak</p>
                <p className="text-3xl font-bold text-accent">{stats.longestStreak}</p>
                <p className="text-xs text-muted-foreground mt-1">personal best</p>
              </div>
              <div className="rounded-full bg-accent/10 p-2">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
            </div>
          </div>
        </div>
        {/* Relapses */}
        <div className="group relative overflow-hidden rounded-xl border border-destructive/20 bg-background/50 backdrop-blur-sm p-5 hover:border-destructive/50 transition-all duration-300 hover:shadow-lg hover:shadow-destructive/20 animate-scale-in [animation-delay:150ms]">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Relapses</p>
                <p className="text-3xl font-bold text-destructive">{stats.relapses}</p>
                <p className="text-xs text-muted-foreground mt-1">logged</p>
              </div>
              <div className="rounded-full bg-destructive/10 p-2">
                <Award className="w-5 h-5 text-destructive" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/history" className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-sm p-8 text-center hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group animate-scale-in [animation-delay:200ms]">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4 group-hover:scale-110 transition-transform">
            <Flame className="w-7 h-7 text-primary drop-shadow-[0_0_8px_rgba(255,0,255,0.6)]" />
          </div>
          <h3 className="font-bold text-lg mb-2 uppercase tracking-wider">Log Entry</h3>
          <p className="text-sm text-muted-foreground">Record a victory or log a relapse to keep your streak accurate.</p>
        </Link>
        <Link href="/social" className="rounded-xl border border-secondary/20 bg-background/50 backdrop-blur-sm p-8 text-center hover:border-secondary/50 transition-all duration-300 hover:shadow-lg hover:shadow-secondary/10 group animate-scale-in [animation-delay:250ms]">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary/10 mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-7 h-7 text-secondary drop-shadow-[0_0_8px_rgba(0,255,255,0.6)]" />
          </div>
          <h3 className="font-bold text-lg mb-2 uppercase tracking-wider">Leaderboard</h3>
          <p className="text-sm text-muted-foreground">Compare streaks with friends and see the community rankings.</p>
        </Link>
      </div>
      <div className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/5 to-secondary/5 backdrop-blur-sm p-8 text-center animate-scale-in [animation-delay:300ms]">
        <p className="text-lg text-foreground leading-relaxed">
          <span className="font-bold text-primary neon-text-pink">Every second</span> you hold is a victory.
          <span className="block mt-4 text-muted-foreground text-base">
            This is your space to build the discipline and freedom you deserve.
          </span>
        </p>
      </div>
    </div>
  );
}
