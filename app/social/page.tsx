'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Trophy, Plus, Trash2, Ghost, Crown, Medal, Shield, ClipboardPaste } from 'lucide-react';

interface Account {
  id: string;
  username: string;
  isAnonymous: boolean;
  color: string;
}

interface Friend {
  id: string;
  username: string;
  isAnonymous: boolean;
  streak: number;
  streakStart: string;
  lastUpdated: string;
  addedAt: string;
  color: string;
}

interface FriendCodePayload {
  id: string;
  username: string;
  isAnonymous: boolean;
  streak: number;
  streakStart: string;
  shared: string;
}

const RANK_COLORS = [
  { border: 'border-yellow-400/50', text: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Crown },
  { border: 'border-zinc-300/50', text: 'text-zinc-300', bg: 'bg-zinc-300/10', icon: Medal },
  { border: 'border-amber-600/50', text: 'text-amber-600', bg: 'bg-amber-600/10', icon: Medal },
];

function getMyStreak(): number {
  try {
    const start = localStorage.getItem('seedguard_streak_start');
    if (!start) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 86400000));
  } catch {
    return 0;
  }
}

function formatDate(iso: string): string {
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

function staleDays(iso: string): number {
  try {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  } catch {
    return 0;
  }
}

function randomFriendColor(): string {
  const colors = ['#ff00ff','#00ffff','#7c3aed','#f59e0b','#10b981','#ef4444','#3b82f6','#f97316'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export default function SocialPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const [codeInput, setCodeInput] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  useEffect(() => {
    const acc = localStorage.getItem('seedguard_account');
    if (acc) setAccount(JSON.parse(acc));

    const f = localStorage.getItem('seedguard_friends');
    if (f) setFriends(JSON.parse(f));

    setLoading(false);
  }, []);

  const saveFriends = (list: Friend[]) => {
    setFriends(list);
    localStorage.setItem('seedguard_friends', JSON.stringify(list));
  };

  const handleAddFriend = () => {
    setAddError('');
    setAddSuccess('');
    const raw = codeInput.trim();
    if (!raw) { setAddError('Paste a friend code first.'); return; }
    let payload: FriendCodePayload;
    try { payload = JSON.parse(atob(raw)); }
    catch { setAddError('Invalid code — make sure you copied the full code.'); return; }
    if (!payload.id || !payload.username || typeof payload.streak !== 'number') { setAddError('Code is corrupted or from an incompatible version.'); return; }
    if (account && payload.id === account.id) { setAddError("That's your own code! Share it with someone else."); return; }
    const existing = friends.find((f) => f.id === payload.id);
    if (existing) {
      const updated = friends.map((f) => f.id === payload.id ? { ...f, streak: payload.streak, streakStart: payload.streakStart, lastUpdated: payload.shared } : f);
      saveFriends(updated); setCodeInput(''); setAddSuccess(`Updated ${payload.username}'s streak to ${payload.streak} days.`); return;
    }
    const newFriend: Friend = { id: payload.id, username: payload.username, isAnonymous: payload.isAnonymous ?? false, streak: payload.streak, streakStart: payload.streakStart, lastUpdated: payload.shared, addedAt: new Date().toISOString(), color: randomFriendColor() };
    saveFriends([...friends, newFriend]); setCodeInput(''); setAddSuccess(`Added ${payload.username} (${payload.streak} days) to your leaderboard!`);
    setTimeout(() => setAddSuccess(''), 4000);
  };

  const handleRemoveFriend = (id: string) => { saveFriends(friends.filter((f) => f.id !== id)); };

  if (loading) return (<div className="flex items-center justify-center min-h-screen"><Shield className="w-8 h-8 text-primary animate-bounce-subtle neon-text-pink" /></div>);

  const myStreak = getMyStreak();
  const leaderboard: Array<{ id: string; username: string; isAnonymous: boolean; streak: number; color: string; isMe: boolean; lastUpdated?: string; }> = [
    ...(account ? [{ id: account.id, username: account.username, isAnonymous: account.isAnonymous, streak: myStreak, color: account.color, isMe: true }] : []),
    ...friends.map((f) => ({ ...f, isMe: false })),
  ].sort((a, b) => b.streak - a.streak);

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl space-y-8 page-entry">
      <div>>
        <h1 className="text-4xl font-extrabold tracking-widest uppercase italic neon-text-cyan text-secondary flex items-center gap-3">
          <Users className="w-9 h-9" />
          Social
        </h1>
        <p className="text-muted-foreground text-lg mt-2">
          Add friends via their code and track each other&apos;s streaks anonymously.
        </p>
      </div>

      {!account && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 backdrop-blur-sm p-6 flex items-start gap-4 animate-scale-in">
          <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-primary mb-1">You need an account to share your streak</p>
            <p className="text-sm text-muted-foreground mb-3">
              Create one (anonymous is fine) to generate a friend code others can add.
            </p>
            <Link
              href="/account"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary text-sm font-medium hover:bg-primary/30 transition-all neon-text-pink"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}

      {/* ── Add Friend ── */}
      <div className="rounded-xl border border-secondary/20 bg-background/50 backdrop-blur-sm p-8 space-y-4 animate-scale-in [animation-delay:50ms]">
        <h2 className="text-lg font-bold uppercase tracking-wider text-secondary neon-text-cyan flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add a Friend
        </h2>
        <p className="text-sm text-muted-foreground">
          Ask your friend to copy their code from their Account page, then paste it here.
        </p>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <ClipboardPaste className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value);
                setAddError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
              placeholder="Paste friend code here…"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-muted/30 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/30 transition-all text-sm font-mono"
            />
          </div>
          <button
            onClick={handleAddFriend}
            className="px-5 py-3 rounded-lg border border-secondary/50 text-secondary bg-secondary/10 hover:bg-secondary/20 transition-all font-bold uppercase tracking-wider text-sm whitespace-nowrap"
          >
            Add
          </button>
        </div>

        {addError && <p className="text-sm text-destructive">{addError}</p>}
        {addSuccess && <p className="text-sm text-secondary neon-text-cyan">{addSuccess}</p>}
      </div>

      {/* ── Leaderboard ── */}
      <div className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-sm p-8 space-y-4 animate-scale-in [animation-delay:100ms]">
        <h2 className="text-lg font-bold uppercase tracking-wider text-primary neon-text-pink flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Streak Leaderboard
        </h2>

        {leaderboard.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-muted/30 rounded-xl">
            <Ghost className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>No one on the board yet.</p>
            <p className="mt-1 text-xs">Create an account and add friends using their codes.</p>
          </div>
        )}

        {leaderboard.length > 0 && (
          <div className="space-y-3">
            {leaderboard.map((entry, rank) => {
              const rankStyle = RANK_COLORS[rank] ?? { border: 'border-muted/20', text: 'text-muted-foreground', bg: 'bg-muted/5', icon: null };
              const RankIcon = rankStyle.icon;
              const friend = friends.find((f) => f.id === entry.id);
              const stale = friend ? staleDays(friend.lastUpdated) : 0;
              return (
                <div key={entry.id} className={`rounded-xl border ${rankStyle.border} ${rankStyle.bg} backdrop-blur-sm p-4 flex items-center gap-4 transition-all hover:scale-[1.01]`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm ${rankStyle.text}`}>
                    {RankIcon && rank < 3 ? <RankIcon className="w-5 h-5" /> : <span>#{rank + 1}</span>}
                  </div>
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-base border-2" style={{backgroundColor:`${entry.color}20`,borderColor:`${entry.color}50`,color:entry.color}}>
                    {entry.isAnonymous?'?':entry.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold truncate">{entry.username}</span>
                      {entry.isMe && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold uppercase tracking-wider">You</span>}
                      {entry.isAnonymous && <Ghost className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                      {!entry.isMe && stale >= 3 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground uppercase tracking-wider">Last updated {stale}d ago</span>}
                    </div>
                    {!entry.isMe && friend && <p className="text-xs text-muted-foreground mt-0.5">Added {formatDate(friend.addedAt)}</p>}
                  </div>
                  <div className="flex-shrink-0 text-right"><p className={`text-2xl font-extrabold ${rankStyle.text}`}>{entry.streak}</p><p className="text-xs text-muted-foreground uppercase tracking-wider">days</p></div>
                  {!entry.isMe && (
                    <button onClick={() => handleRemoveFriend(entry.id)} className="flex-shrink-0 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all" title="Remove friend">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="rounded-xl border border-muted/15 bg-background/30 backdrop-blur-sm p-6 space-y-3 text-sm text-muted-foreground animate-scale-in [animation-delay:150ms]">
        <h3 className="font-bold uppercase tracking-wider text-foreground text-xs">How Friend Codes Work</h3>
        <ol className="list-decimal list-inside space-y-2 leading-relaxed">
          <li>You (or a friend) go to <strong className="text-foreground">Account</strong> and copy a Friend Code.</li>
          <li>The other person pastes it here under &ldquo;Add a Friend.&rdquo;</li>
          <li>The code captures your streak at that moment — to update it, share a fresh code.</li>
          <li>All data stays on each person&rsquo;s device. Nothing is sent to a server.</li>
        </ol>
      </div>
    </div>
  );
}
