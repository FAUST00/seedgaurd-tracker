import Link from 'next/link';
import { Shield, ArrowRight, Trophy, Flame } from 'lucide-react';
import { ART } from '@/lib/assets';

/**
 * Landing page.
 * Hero background: hero-city.jpg (pixel-art city + huge magenta sun).
 * Placed as the full-page background via ImageBanner-style CSS overlay.
 */
export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 text-foreground page-entry overflow-hidden">
      {/* Solid blocker — hides the global SynthBackground (CSS sun/grid/stars) on this page only */}
      <div className="absolute inset-0 bg-background pointer-events-none" aria-hidden />
      {/* Hero city wallpaper — fills the screen, covers the blocker */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-80 pointer-events-none"
        style={{ backgroundImage: `url(${ART.heroCity})` }}
        aria-hidden
      />
      {/* Bottom-fade: keeps content readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent pointer-events-none" aria-hidden />

      {/* Content */}
      <div className="relative w-full max-w-sm space-y-8 flex flex-col items-center text-center">
        {/* Shield logo */}
        <div className="rounded-full bg-primary/10 p-5 neon-box-pink animate-scale-in">
          <Shield className="h-14 w-14 text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.8)]" aria-hidden />
        </div>

        <h1 className="text-5xl font-display font-extrabold tracking-tight neon-text-cyan text-secondary uppercase italic">
          SeedGuard
        </h1>

        <p className="text-muted-foreground pb-4 text-lg leading-relaxed">
          Your private tracker to reclaim your freedom and build discipline.
          <span className="block mt-2 text-sm text-secondary/70">Sync across all your devices with a free account.</span>
        </p>

        <Link
          href="/dashboard"
          className="group inline-flex items-center justify-center gap-2 w-full h-14 px-6 text-xl font-extrabold bg-primary/20 text-primary rounded-xl border border-primary/40 hover:bg-primary/30 hover:scale-105 active:scale-95 transition-all neon-box-pink uppercase tracking-widest shadow-lg"
        >
          Start Tracking Now
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden />
        </Link>

        <div className="flex gap-4 w-full">
          <Link
            href="/account"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-secondary/30 text-secondary text-sm font-bold hover:bg-secondary/10 transition-all"
          >
            Sign In / Sign Up
          </Link>
          <Link
            href="/benefits"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-muted/40 text-muted-foreground text-sm hover:bg-muted/20 transition-all"
          >
            Journey
          </Link>
        </div>

        {/* Feature grid */}
        <div className="w-full mt-4 pt-6 border-t border-primary/10 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Features</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { icon: '📊', label: 'Streak Tracking', sub: 'Build daily momentum', accent: 'primary' },
              { icon: '☁️', label: 'Cloud Sync',      sub: 'Any device, always', accent: 'secondary' },
              { icon: '🏆', label: 'Leaderboards',    sub: 'Friends + Global', accent: 'gold' },
              { icon: '💬', label: 'Direct Messages', sub: 'Chat with friends', accent: 'accent' },
            ].map(({ icon, label, sub }) => (
              <div
                key={label}
                className="rounded-xl glass-effect p-3 border border-muted/20 hover:border-primary/30 transition-colors text-left"
              >
                <div className="font-bold mb-0.5 text-foreground">{icon} {label}</div>
                <div className="text-muted-foreground">{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard teaser */}
        <Link
          href="/streaks"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gold/30 text-gold bg-gold/5 hover:bg-gold/15 text-sm font-bold transition-all neon-hover"
        >
          <Trophy className="w-4 h-4" aria-hidden />
          View Streak Leaderboard
          <Flame className="w-4 h-4 flame-glow" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
