'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_SEEDGUARD_API_URL || 'https://seedguard-api.onrender.com';

export default function AccountPage() {
  const [step, setStep] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setLoggedInUser(data.user);
      localStorage.setItem('seedguard_user', JSON.stringify(data.user));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setLoggedInUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto text-white">
      <h1 className="text-4xl font-bold text-center mb-8">ACCOUNT</h1>

      {loggedInUser ? (
        <div className="text-center">
          <p>Logged in as {loggedInUser.username}</p>
          <button onClick={() => { localStorage.clear(); setLoggedInUser(null); }} className="mt-6 text-red-500">Logout</button>
        </div>
      ) : (
        <>
          {step === 'login' ? (
            <div className="space-y-4">
              <h2>Login</h2>
              <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
              <button onClick={handleLogin} disabled={loading} className="w-full bg-teal-600 py-3 rounded">LOGIN</button>
              <button onClick={() => setStep('create')} className="text-zinc-400">Create account</button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2>Create Account</h2>
              <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
              <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-zinc-900 rounded" />
              <button onClick={handleCreate} disabled={loading} className="w-full bg-purple-600 py-3 rounded">CREATE ACCOUNT</button>
              <button onClick={() => setStep('login')} className="text-zinc-400">Back to login</button>
            </div>
          )}
          {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        </>
      )}
    </div>
  );
}
