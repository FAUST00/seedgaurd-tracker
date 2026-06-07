'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, LogOut, Shield, User } from 'lucide-react';

interface Account {
  id: string;
  username: string;
  isAnonymous: boolean;
  createdAt: string;
  color: string;
  remote?: boolean;
  email?: string;
}

const API_URL = (process.env.NEXT_PUBLIC_SEEDGUARD_API_URL || process.env.SEEDGUARD_API_URL || '').replace(/\/$/, '');
const COLORS = ['#ff00ff', '#00ffff', '#7c3aed', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#f97316'];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getStreakDays(): number {
  try {
    const start = localStorage.getItem('seedguard_streak_start');
    if (!start) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 86400000));
  } catch {
    return 0;
  }
}

function saveLocalAccount(account: Account, token?: string) {
  localStorage.setItem('seedguard_account', JSON.stringify(account));
  if (token) localStorage.setItem('seedguard_auth_token', token);
  if (!localStorage.getItem('seedguard_streak_start')) {
    localStorage.setItem('seedguard_streak_start', new Date().toISOString());
  }
}

function buildFriendCode(account: Account): string {
  const payload = {
    id: account.id,
    username: account.username,
    isAnonymous: account.isAnonymous,
    streak: getStreakDays(),
    streakStart: localStorage.getItem('seedguard_streak_start') || new Date().toISOString(),
    shared: new Date().toISOString(),
  };
  return btoa(JSON.stringify(payload));
}

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('seedguard_account');
      if (saved) {
        const parsed = JSON.parse(saved) as Account;
        setAccount(parsed);
        setFriendCode(buildFriendCode(parsed));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const createLocalFallback = (reason: string) => {
    const localAccount: Account = {
      id: generateId(),
      username: username.trim(),
      isAnonymous: false,
      createdAt: new Date().toISOString(),
      color: randomColor(),
      email: email.trim(),
      remote: false,
    };

    saveLocalAccount(localAccount);
    setAccount(localAccount);
    setFriendCode(buildFriendCode(localAccount));
    setMessage(`Backend unavailable, so this account was saved locally. ${reason}`);
  };

  const handleCreateAccount = async () => {
    setError('');
    setMessage('');

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUsername) {
      setError('Enter a username.');
      return;
    }
    if (!cleanEmail) {
      setError('Enter an email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);

    if (!API_URL) {
      createLocalFallback('No backend URL is configured.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanUsername,
          username: cleanUsername,
          email: cleanEmail,
          password,
          goalDays: 90,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Could not create account.');
      }

      const remoteAccount: Account = {
        id: data.user.id,
        username: data.user.username,
        isAnonymous: false,
        createdAt: data.user.createdAt,
        color: randomColor(),
        email: data.user.email,
        remote: true,
      };

      saveLocalAccount(remoteAccount, data.token);
      setAccount(remoteAccount);
      setFriendCode(buildFriendCode(remoteAccount));
      setMessage('Account created with the backend and saved on this device.');
    } catch (err) {
      createLocalFallback(err instanceof Error ? err.message : 'Network request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setLoginError('');
    setMessage('');

    const cleanUsername = loginUsername.trim();

    if (!cleanUsername) {
      setLoginError('Enter your username.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Enter your password.');
      return;
    }
    if (!API_URL) {
      setLoginError('Backend URL is not configured.');
      return;
    }

    setLoginSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password: loginPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Login failed. Check your username and password.');
      }

      const remoteAccount: Account = {
        id: data.user.id,
        username: data.user.username,
        isAnonymous: false,
        createdAt: data.user.createdAt,
        color: randomColor(),
        email: data.user.email,
        remote: true,
      };

      saveLocalAccount(remoteAccount, data.token);
      setAccount(remoteAccount);
      setFriendCode(buildFriendCode(remoteAccount));
      setMessage(`Logged in as ${remoteAccount.username}.`);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(friendCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteAccount = () => {
    if (!confirm('Remove this account from this device?')) return;
    localStorage.removeItem('seedguard_account');
    localStorage.removeItem('seedguard_auth_token');
    setAccount(null);
    setFriendCode('');
    setMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Shield className="w-8 h-8 text-primary animate-bounce-subtle neon-text-pink" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-lg page-entry">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-widest uppercase italic neon-text-cyan text-secondary">
            Account
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Create a password-backed account. If the backend is down, SeedGuard saves it locally.
          </p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-sm p-8 space-y-5 animate-scale-in">
          <h2 className="text-lg font-bold uppercase tracking-wider text-primary neon-text-pink">
            Create Account
          </h2>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              maxLength={20}
              className="w-full rounded-lg border border-muted/30 bg-background/50 px-4 py-3 text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-muted/30 bg-background/50 px-4 py-3 text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleCreateAccount()}
              className="w-full rounded-lg border border-muted/30 bg-background/50 px-4 py-3 text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {message && <p className="text-xs text-muted-foreground">{message}</p>}

          <button
            onClick={handleCreateAccount}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-primary/20 text-primary border border-primary/50 rounded-lg hover:bg-primary/30 disabled:opacity-60 transition-all font-bold uppercase tracking-wider neon-text-pink"
          >
            <User className="w-5 h-5" />
            {submitting ? 'Creating...' : 'Create Account'}
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-secondary/20 bg-background/50 backdrop-blur-sm p-8 space-y-5 animate-scale-in">
          <h2 className="text-lg font-bold uppercase tracking-wider text-secondary neon-text-cyan">
            Login
          </h2>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Username</label>
            <input
              type="text"
              value={loginUsername}
              onChange={(event) => setLoginUsername(event.target.value)}
              className="w-full rounded-lg border border-muted/30 bg-background/50 px-4 py-3 text-foreground focus:outline-none focus:border-secondary/50"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleLogin()}
              className="w-full rounded-lg border border-muted/30 bg-background/50 px-4 py-3 text-foreground focus:outline-none focus:border-secondary/50"
            />
          </div>

          {loginError && <p className="text-xs text-destructive">{loginError}</p>}

          <button
            onClick={handleLogin}
            disabled={loginSubmitting}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-secondary/10 text-secondary border border-secondary/50 rounded-lg hover:bg-secondary/20 disabled:opacity-60 transition-all font-bold uppercase tracking-wider neon-text-cyan"
          >
            <User className="w-5 h-5" />
            {loginSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-lg space-y-8 page-entry">
      <div>
        <h1 className="text-4xl font-extrabold tracking-widest uppercase italic neon-text-cyan text-secondary">
          Account
        </h1>
        <p className="text-muted-foreground text-lg mt-2">
          {account.remote ? 'Backend account saved on this device.' : 'Local-only account saved on this device.'}
        </p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-sm p-8 space-y-6 animate-scale-in">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-extrabold text-2xl flex-shrink-0 border-2"
            style={{
              backgroundColor: `${account.color}20`,
              borderColor: `${account.color}50`,
              color: account.color,
            }}
          >
            {account.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-xl truncate block">{account.username}</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {account.remote ? 'Synced backend account' : 'Local fallback account'}
            </p>
          </div>
        </div>

        {message && <p className="text-xs text-muted-foreground">{message}</p>}

        <div className="rounded-lg border border-primary/15 bg-background/60 p-4 text-center">
          <p className="text-3xl font-extrabold text-primary neon-text-pink">{getStreakDays()}</p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Current Streak</p>
        </div>
      </div>

      <div className="rounded-xl border border-secondary/20 bg-background/50 backdrop-blur-sm p-8 space-y-4 animate-scale-in">
        <h2 className="text-lg font-bold uppercase tracking-wider text-secondary neon-text-cyan">Your Friend Code</h2>
        <div className="rounded-lg border border-secondary/20 bg-background/80 p-3 font-mono text-xs text-muted-foreground break-all select-all">
          {friendCode}
        </div>
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-secondary/50 text-secondary bg-secondary/10 hover:bg-secondary/20 transition-all font-medium uppercase tracking-wider text-sm"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>

      <button
        onClick={handleDeleteAccount}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg border border-destructive/50 text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all font-medium uppercase tracking-wider text-sm"
      >
        <LogOut className="w-4 h-4" />
        Remove From This Device
      </button>
    </div>
  );
}
