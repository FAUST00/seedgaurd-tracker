'use client';

import { useState, useEffect } from 'react';
import { User, LogOut, Copy, Check, Shield } from 'lucide-react';
import { signIn, signUp, signOut, getUser, getProfile, updateProfile, migrateLocalToCloud } from '@/lib/sync';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const router = useRouter();
  const [step, setStep] = useState<'loading' | 'auth' | 'profile'>('loading');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateResults, setMigrateResults] = useState<string[]>([]);

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (user) {
        const p = await getProfile();
        setProfile(p ?? { username: user.email });
        setStep('profile');
      } else {
        setStep('auth');
      }
    }
    init();
  }, []);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') {
        await signUp(email, password, username);
        setMessage('✅ Account created! Check your email to confirm, then log in.');
      } else {
        await signIn(email, password);
        const p = await getProfile();
        const user = await getUser();
        setProfile(p ?? { username: user?.email });
        setStep('profile');
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOut();
    setProfile(null);
    setStep('auth');
    router.push('/');
  }

  async function handleMigrate() {
    setMigrating(true);
    try {
      const results = await migrateLocalToCloud();
      setMigrateResults(results);
    } catch (err: any) {
      setMigrateResults([`❌ ${err.message}`]);
    } finally {
      setMigrating(false);
    }
  }

  function copyFriendCode() {
    if (!profile) return;
    const streak = (() => {
      try {
        const s = localStorage.getItem('seedguard_streak_start');
        return s ? Math.max(0, Math.floor((Date.now() - new Date(s).getTime()) / 86400000)) : 0;
      } catch { return 0; }
    })();
    const code = btoa(JSON.stringify({
      id: profile.id,
      username: profile.username,
      isAnonymous: false,
      streak,
      streakStart: localStorage.getItem('seedguard_streak_start') ?? new Date().toISOString(),
      shared: new Date().toISOString(),
    }));
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Shield className="w-8 h-8 text-primary animate-pulse neon-text-pink" />
      </div>
    );
  }

  if (step === 'profile' && profile) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-2xl space-y-8 page-entry">
        <div>
          <h1 className="text-4xl font-extrabold tracking-widest uppercase italic neon-text-cyan text-secondary">Account</h1>
          <p className="text-muted-foreground text-lg mt-2">Manage your SeedGuard cloud account.</p>
        </div>

        {/* Profile Card */}
        <div className="rounded-xl border border-primary/30 bg-background/60 backdrop-blur-sm p-8 space-y-6 animate-scale-in">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold neon-text-pink">{profile.username ?? 'Anonymous'}</p>
              <p className="text-sm text-muted-foreground">Cloud account active ✅</p>
            </div>
          </div>

          <button
            onClick={copyFriendCode}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-secondary/50 text-secondary bg-secondary/10 hover:bg-secondary/20 transition-all font-medium uppercase tracking-wider"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Copied!' : 'Copy Friend Code'}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-destructive/50 text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all font-medium uppercase tracking-wider"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>

        {/* Migrate local data */}
        <div className="rounded-xl border border-accent/20 bg-background/50 backdrop-blur-sm p-8 space-y-4 animate-scale-in">
          <h2 className="text-lg font-bold uppercase tracking-wider text-accent">Import Local Data</h2>
          <p className="text-sm text-muted-foreground">If you used SeedGuard before creating an account, import your existing streaks and history into the cloud.</p>
          {migrateResults.length > 0 ? (
            <div className="space-y-2">
              {migrateResults.map((r, i) => (
                <div key={i} className="bg-background/80 rounded-lg px-4 py-2 text-sm text-white">{r}</div>
              ))}
            </div>
          ) : (
            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-accent/50 text-accent bg-accent/10 hover:bg-accent/20 transition-all font-medium uppercase tracking-wider"
            >
              {migrating ? 'Importing...' : '⬆️ Import My Local Data'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-cyan-400 tracking-widest">SEEDGUARD</h1>
          <p className="text-gray-500 mt-2 text-sm">Sign in to sync across all your devices.</p>
        </div>
        <div className="bg-gray-900 border border-cyan-900 rounded-2xl p-8 shadow-2xl">
          <div className="flex mb-6 bg-gray-800 rounded-lg p-1">
            <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'login' ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'}`}>Log In</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'signup' ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'}`}>Sign Up</button>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500" placeholder="YourUsername" />
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500" placeholder="••••••••" />
            </div>
            {error && <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}
            {message && <div className="bg-green-950 border border-green-800 rounded-lg px-4 py-3 text-green-400 text-sm">{message}</div>}
            <button type="submit" disabled={loading} className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-3 rounded-lg transition-all">
              {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
