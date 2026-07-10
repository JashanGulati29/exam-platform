import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import api from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-cyan-500 shadow-glow">
            <KeyRound size={22} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Reset your password</h1>
          <p className="mt-1 text-sm text-slate-400">We&apos;ll email you a reset token</p>
        </div>

        {sent ? (
          <div className="glass-card text-center text-sm text-slate-300">
            If an account exists for <span className="text-slate-100">{email}</span>, a reset link is on its way.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card space-y-4">
            <div>
              <label className="label-text">Email</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Send reset link
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-slate-400">
          <Link to="/login" className="font-medium text-accent-400 hover:text-accent-300">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
