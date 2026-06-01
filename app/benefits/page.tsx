import { CheckCircle, Brain, Zap, Eye, Heart, Trophy, Shield } from 'lucide-react';

interface Benefit {
  icon: React.ReactNode;
  title: string;
  description: string;
  timeline: string;
  color: 'primary' | 'secondary' | 'accent';
}

const weekBenefits: Benefit[] = [
  {
    icon: <Brain className="w-7 h-7" />,
    title: 'Mental Clarity',
    description:
      'Brain fog lifts as dopamine receptors begin resetting. Thoughts become sharper and decision-making improves noticeably.',
    timeline: 'Week 2–4',
    color: 'primary',
  },
  {
    icon: <Zap className="w-7 h-7" />,
    title: 'Increased Energy',
    description:
      'Physical energy and motivation return as your brain chemistry rebalances. Morning fatigue decreases dramatically.',
    timeline: 'Week 3–6',
    color: 'secondary',
  },
  {
    icon: <Eye className="w-7 h-7" />,
    title: 'Better Focus',
    description:
      'Concentration and attention span recover. Tasks that felt impossible now feel manageable and even enjoyable.',
    timeline: 'Week 2–8',
    color: 'accent',
  },
];

const monthBenefits: Benefit[] = [
  {
    icon: <Heart className="w-7 h-7" />,
    title: 'Emotional Stability',
    description:
      'Mood swings level out and emotional resilience builds. Anxiety and irritability fade as your nervous system stabilizes.',
    timeline: 'Month 1–3',
    color: 'primary',
  },
  {
    icon: <Trophy className="w-7 h-7" />,
    title: 'Self-Respect',
    description:
      'Genuine, earned confidence returns as you keep your commitments to yourself. Pride replaces shame, day by day.',
    timeline: 'Month 1–3',
    color: 'secondary',
  },
  {
    icon: <Shield className="w-7 h-7" />,
    title: 'Relationship Healing',
    description:
      'Trust rebuilds and emotional connections deepen. You show up fully present for the people who matter most.',
    timeline: 'Month 2–6',
    color: 'accent',
  },
];

const colorMap = {
  primary: {
    border: 'border-primary/20 hover:border-primary/50',
    icon: 'bg-primary/10 text-primary group-hover:bg-primary/20',
    badge: 'bg-primary/10 text-primary neon-text-pink',
    check: 'text-primary',
    glow: 'hover:shadow-primary/10',
  },
  secondary: {
    border: 'border-secondary/20 hover:border-secondary/50',
    icon: 'bg-secondary/10 text-secondary group-hover:bg-secondary/20',
    badge: 'bg-secondary/10 text-secondary neon-text-cyan',
    check: 'text-secondary',
    glow: 'hover:shadow-secondary/10',
  },
  accent: {
    border: 'border-accent/20 hover:border-accent/50',
    icon: 'bg-accent/10 text-accent group-hover:bg-accent/20',
    badge: 'bg-accent/10 text-accent',
    check: 'text-accent',
    glow: 'hover:shadow-accent/10',
  },
};

function BenefitCard({ benefit, delay }: { benefit: Benefit; delay: number }) {
  const c = colorMap[benefit.color];
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border ${c.border} bg-background/50 backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-lg ${c.glow} animate-scale-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className={`rounded-xl p-3 transition-all duration-300 ${c.icon}`}>
            {benefit.icon}
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${c.badge}`}>
            {benefit.timeline}
          </span>
        </div>
        <div>
          <h3 className="font-bold text-base uppercase tracking-wider mb-2">{benefit.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
        </div>
        <div className="pt-2 border-t border-muted/20">
          <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${c.check}`}>
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Verified improvement
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Benefits() {
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl page-entry">
      <div className="text-center mb-12 space-y-3">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-widest uppercase italic neon-text-cyan text-secondary">The Retention Journey</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">Every milestone you reach unlocks real, measurable changes in your mind and body. Here is exactly what to expect — week by week, then month by month.</p>
      </div>
      <section className="mb-14">
        <div className="flex items-center gap-4 mb-6"><h2 className="text-2xl font-bold uppercase tracking-wider text-primary neon-text-pink">Week by Week</h2><div className="flex-1 h-px bg-primary/20"/><span className="text-xs text-muted-foreground uppercase tracking-widest font-medium whitespace-nowrap">Days 1–60</span></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{weekBenefits.map((b,i)=>(<BenefitCard key={b.title} benefit={b} delay={i*60}/>))}</div>
      </section>
      <section className="mb-14">
        <div className="flex items-center gap-4 mb-6"><h2 className="text-2xl font-bold uppercase tracking-wider text-secondary neon-text-cyan">Month by Month</h2><div className="flex-1 h-px bg-secondary/20"/><span className="text-xs text-muted-foreground uppercase tracking-widest font-medium whitespace-nowrap">Month 1+</span></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{monthBenefits.map((b,i)=>(<BenefitCard key={b.title} benefit={b} delay={i*60}/>))}</div>
      </section>
      {/* ─────────── */}
      <section className="mb-14">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-2xl font-bold uppercase tracking-wider text-accent">
            Recovery Phases
          </h2>
          <div className="flex-1 h-px bg-accent/20" />
        </div>

        <div className="space-y-5">
          {/* Phase 1 */}
          <div className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-sm p-6 hover:border-primary/40 transition-all animate-scale-in">
            <div className="flex items-start gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center font-extrabold text-lg text-primary neon-text-pink">1</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap"><h3 className="font-bold text-lg uppercase tracking-wider">Days 1–7: Detox Phase</h3><span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-semibold tracking-wider">Hardest phase</span></div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">Intense urges and withdrawal-like symptoms are common. Your brain is beginning to heal. White-knuckle through this — it gets significantly easier after day 7.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">{'Sleep disruption,Intense urges,Irritability,Anxiety'.split(',').map(s=>(<div key={s} className="rounded-lg bg-primary/8 border border-primary/15 px-3 py-2 text-primary font-medium">{s}</div>))}</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-secondary/20 bg-background/50 backdrop-blur-sm p-6 hover:border-secondary/40 transition-all animate-scale-in [animation-delay:80ms]">
            <div className="flex items-start gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/15 flex items-center justify-center font-extrabold text-lg text-secondary neon-text-cyan">2</div>
              <div className="flex-1 min-w-0"><div className="flex items-center gap-3 mb-2"><h3 className="font-bold text-lg uppercase tracking-wider">Weeks 2–4: Adjustment Phase</h3><span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full uppercase font-semibold tracking-wider">Fog clears</span></div><p className="text-muted-foreground text-sm leading-relaxed mb-4">Urges decrease but flatness and anhedonia may hit hard. You&apos;re on the right path. Exercise and social connection are your best tools here.</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">{'Lower urges,Flatness,Better sleep,Energy returns'.split(',').map(s=>(<div key={s} className="rounded-lg bg-secondary/8 border border-secondary/15 px-3 py-2 text-secondary font-medium">{s}</div>))}</div></div></div></div>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="rounded-xl border border-accent/20 bg-background/50 backdrop-blur-sm p-6 hover:border-accent/40 transition-all animate-scale-in [animation-delay:160ms]"><div className="flex items-start gap-5"><div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center font-extrabold text-lg text-accent">3</div><div className="flex-1 min-w-0"><div className="flex items-center gap-3 mb-2"><h3 className="font-bold text-lg uppercase tracking-wider">Months 2–3: Rewiring Phase</h3><span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full uppercase font-semibold tracking-wider">Real gains</span></div><p className="text-muted-foreground text-sm leading-relaxed mb-4">Confidence builds. Urges become easier to resist. Life starts to feel genuinely enjoyable again.</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">{'Improved mood,Confidence,Motivation,Focus returns'.split(',').map(s=>(<div key={s} className="rounded-lg bg-accent/8 border border-accent/15 px-3 py-2 text-accent font-medium">{s}</div>))}</div></div></div></div>
          <div className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-sm p-6 hover:border-primary/40 transition-all animate-scale-in [animation-delay:240ms]"><div className="flex items-start gap-5"><div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center font-extrabold text-lg text-primary neon-text-pink">4</div><div className="flex-1 min-w-0"><div className="flex items-center gap-3 mb-2"><h3 className="font-bold text-lg uppercase tracking-wider">Months 3+: Reboot Phase</h3><span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-semibold tracking-wider neon-text-pink">Full recovery</span></div><p className="text-muted-foreground text-sm leading-relaxed mb-4">The brain has healed significantly. You&apos;ve rediscovered yourself. Relationships have rebuilt. The person you always wanted to be is now just who you are.</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">{'Full clarity,Genuine joy,Urge control,New identity'.split(',').map(s=>(<div key={s} className="rounded-lg bg-primary/8 border border-primary/15 px-3 py-2 text-primary font-medium">{s}</div>))}</div></div></div></div>
        </div>
      </section>
      <div className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/5 to-secondary/5 backdrop-blur-sm p-10 text-center space-y-5 animate-scale-in [animation-delay:320ms]">
        <h2 className="text-2xl font-bold uppercase tracking-wider leading-snug"><span className="text-primary neon-text-pink">Your journey matters.</span><br/><span className="text-secondary neon-text-cyan">Every day is a victory.</span></h2>
        <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">The path to freedom is not easy, but it is absolutely worth it. You have the strength. Use SeedGuard to track your progress, celebrate your wins, and learn from your setbacks.</p>
        <p className="text-sm text-muted-foreground pt-2">ðŸ’ª You are stronger than your urges. &nbsp; ðŸŒ± You deserve better. &nbsp; ðŸ”¥ Never give up.</p>
      </div>
    </div>
  );
}
