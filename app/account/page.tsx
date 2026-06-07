{step === 'login' && (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold text-center">LOGIN</h2>
    <input
      type="text"
      placeholder="Username"
      value={loginUsername}
      onChange={(e) => setLoginUsername(e.target.value)}
      className="w-full p-3 rounded bg-zinc-900 border border-zinc-700"
    />
    <input
      type="password"
      placeholder="Password"
      value={loginPassword}
      onChange={(e) => setLoginPassword(e.target.value)}
      className="w-full p-3 rounded bg-zinc-900 border border-zinc-700"
    />
    <button 
      onClick={handleLogin}
      disabled={loading}
      className="w-full bg-teal-600 hover:bg-teal-700 py-3 rounded font-medium disabled:opacity-50"
    >
      {loading ? 'LOGGING IN...' : 'LOGIN'}
    </button>
    <button 
      onClick={() => setStep('create')}
      className="w-full text-zinc-400 hover:text-white"
    >
      Create new account
    </button>
    {error && <p className="text-red-500 text-center">{error}</p>}
  </div>
)}
