'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user);
    });
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email || `${username}@example.com`, // fallback if no email
          password,
        });
        if (error) throw error;
        setUser(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email || `${username}@example.com`,
          password,
          options: { data: { username } }
        });
        if (error) throw error;
        setError('Check your email to confirm account (or use a real email)');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => supabase.auth.signOut();

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-center">Account</h1>

      {user ? (
        <div className="text-center">
          <p>Logged in as: {user.user_metadata?.username || user.email}</p>
          <button onClick={logout} className="mt-6 bg-red-600 px-6 py-3 rounded">Logout</button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-2xl text-center">{isLogin ? 'Login' : 'Create Account'}</h2>
          
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 bg-zinc-900 rounded"
          />
          <input
            type="email"
            placeholder="Email (recommended)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-zinc-900 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-zinc-900 rounded"
          />

          <button 
            onClick={handleAuth} 
            disabled={loading}
            className="w-full bg-purple-600 py-4 rounded font-medium"
          >
            {loading ? 'Processing...' : (isLogin ? 'LOGIN' : 'CREATE ACCOUNT')}
          </button>

          <button onClick={() => setIsLogin(!isLogin)} className="w-full text-zinc-400">
            {isLogin ? "Don't have an account? Create one" : "Already have an account? Login"}
          </button>

          {error && <p className="text-red-500 text-center">{error}</p>}
        </div>
      )}
    </div>
  );
}
