'use client';

import { useState, useEffect } from 'react';
import { User, Shield, Copy, Check, LogOut, Edit2, Ghost } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_SEEDGUARD_API_URL || 'http://localhost:3001';

interface Account {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
  color?: string;
  streak?: number;
  // add other fields as needed
}

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<'loading' | 'create' | 'login' | 'profile'>('loading');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Create form
  const [createUsername, setCreateUsername] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');

  // Login form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('seedguard_token');
    const savedAccount = localStorage.getItem('seedguard_account');

    if (savedToken && savedAccount) {
      setToken(savedToken);
      setAccount(JSON.parse(savedAccount));
      setStep('profile');
      fetchProfile(savedToken);
    } else {
      setStep('create');
    }
  }, []);

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const profile = data.profile || data.user || data;
        setAccount(profile);
        localStorage.setItem('seedguard_account', JSON.stringify(profile));
      }
    } catch (e) {
      console.log('Backend sync failed, using local data');
    }
  };

  const handleCreate = async () => {
    // ... (similar to login, using /api/signup)
    // I'll keep it short for now - use similar pattern as login
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
      setAccount(data.user);
      setToken(data.token);
      setStep('profile');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) {
      setError('Username and password required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('seedguard_token', data.token);
      localStorage.setItem('seedguard_account', JSON.stringify(data.user));

      setAccount(data.user);
      setToken(data.token);
      setStep('profile');

      // Sync full profile
      await fetchProfile(data.token);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('seedguard_token');
    localStorage.removeItem('seedguard_account');
    setAccount(null);
    setToken(null);
    setStep('login');
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-5xl font-bold text-center mb-8 text-cyan-400">ACCOUNT</h1>

      {step === 'create' && (
        <div className="max-w-md mx-auto space-y-4">
          <h2 className="text-2xl text-center">Create Account</h2>
          <input type="text" placeholder="Username" value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
          <input type="email" placeholder="Email (optional)" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
          <input type="password" placeholder="Password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
          <button onClick={handleCreate} disabled={loading} className="w-full bg-purple-600 py-3 rounded">CREATE ACCOUNT</button>
          <button onClick={() => setStep('login')} className="w-full text-zinc-400">Already have an account? Login</button>
        </div>
      )}

      {step === 'login' && (
        <div className="max-w-md mx-auto space-y-4">
          <h2 className="text-2xl text-center">LOGIN</h2>
          <input type="text" placeholder="Username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
          <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
          <button onClick={handleLogin} disabled={loading} className="w-full bg-teal-600 py-3 rounded">LOGIN</button>
          <button onClick={() => setStep('create')} className="w-full text-zinc-400">Create new account</button>
          {error && <p className="text-red-500 text-center">{error}</p>}
        </div>
      )}

      {step === 'profile' && account && (
        <div className="max-w-md mx-auto text-center">
          <h2>Welcome, {account.username}</h2>
          <button onClick={logout} className="mt-6 text-red-500">Logout</button>
          {/* Your existing profile cards / streak etc. go here */}
        </div>
      )}
    </div>
  );
}
