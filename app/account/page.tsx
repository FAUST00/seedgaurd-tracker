'use client';

import { useState, useEffect } from 'react';
import { User, Shield, Copy, Check, LogOut } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_SEEDGUARD_API_URL || 'http://localhost:3001';

interface Account {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
  color?: string;
  streak?: number;
}

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [step, setStep] = useState<'loading' | 'create' | 'login' | 'profile'>('loading');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [createUsername, setCreateUsername] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('seedguard_account');
    if (saved) {
      setAccount(JSON.parse(saved));
      setStep('profile');
    } else {
      setStep('create');
    }
  }, []);

  const restoreUserData = (user: any) => {
    if (user.streakStart) localStorage.setItem('seedguard_streak_start', user.streakStart);
    if (user.stats) localStorage.setItem('seedguard_stats', JSON.stringify(user.stats));
    if (user.history) localStorage.setItem('seedguard_history', JSON.stringify(user.history));
    if (user.settings) localStorage.setItem('seedguard_settings', JSON.stringify(user.settings));
    if (user.friends) localStorage.setItem('seedguard_friends', JSON.stringify(user.friends));
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: createUsername, email: createEmail, password: createPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      localStorage.setItem('seedguard_token', data.token);
      localStorage.setItem('seedguard_account', JSON.stringify(data.user));
      restoreUserData(data.user);
      setAccount(data.user);
      setStep('profile');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      localStorage.setItem('seedguard_token', data.token);
      localStorage.setItem('seedguard_account', JSON.stringify(data.user));
      restoreUserData(data.user);
      setAccount(data.user);
      setStep('profile');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('seedguard_token');
    localStorage.removeItem('seedguard_account');
    localStorage.removeItem('seedguard_streak_start');
    localStorage.removeItem('seedguard_stats');
    localStorage.removeItem('seedguard_history');
    localStorage.removeItem('seedguard_settings');
    localStorage.removeItem('seedguard_friends');
    setAccount(null);
    setStep('create');
  };

  const getFriendCode = () => {
    if (!account) return '';
    const start = localStorage.getItem('seedguard_streak_start');
    const streak = start ? Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 86400000)) : 0;
    const payload = {
      id: account.id,
      username: account.username,
      isAnonymous: false,
      streak: streak,
      streakStart: start || new Date().toISOString(),
      shared: new Date().toISOString()
    };
    return btoa(JSON.stringify(payload));
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getFriendCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === 'loading') return <div className="text-center py-20">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold text-center mb-10">Account</h1>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {step === 'create' && (
          <div className="space-y-4">
            <h2 className="text-2xl text-center">Create Account</h2>
            <input type="text" placeholder="Username" value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
            <input type="email" placeholder="Email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
            <input type="password" placeholder="Password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
            <button onClick={handleCreate} disabled={loading} className="w-full py-3 bg-green-600 rounded">Create Account</button>
            <button onClick={() => setStep('login')} className="w-full text-gray-400">Already have account? Login</button>
          </div>
        )}

        {step === 'login' && (
          <div className="space-y-4">
            <h2 className="text-2xl text-center">Login</h2>
            <input type="text" placeholder="Username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
            <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
            <button onClick={handleLogin} disabled={loading} className="w-full py-3 bg-blue-600 rounded">Login</button>
            <button onClick={() => setStep('create')} className="w-full text-gray-400">Create new account</button>
          </div>
        )}

        {step === 'profile' && account && (
          <div className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-sm p-8 space-y-6 text-center animate-scale-in">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30 text-primary mb-2">
              <User className="w-8 h-8" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-wider text-primary neon-text-pink">
                Welcome back, {account.username}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Account created on {new Date(account.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Friend Code Section */}
            <div className="rounded-lg bg-zinc-950 p-4 border border-zinc-800 text-left space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-secondary neon-text-cyan flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Your Friend Code
              </label>
              <p className="text-xs text-muted-foreground">
                Share this code with friends so they can add you to their leaderboard.
              </p>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  readOnly
                  value={getFriendCode()}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono select-all focus:outline-none"
                />
                <button
                  onClick={copyCode}
                  className="px-4 py-2 bg-primary/20 border border-primary/50 text-primary rounded text-xs font-semibold hover:bg-primary/30 transition-all flex items-center gap-1 whitespace-nowrap"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full py-3 bg-destructive/10 border border-destructive/50 text-destructive rounded-lg hover:bg-destructive/20 transition-all font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
