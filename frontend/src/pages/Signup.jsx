import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form.fullName, form.email, form.password);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="glass-card w-full max-w-sm text-center">
          <CheckCircle2 className="mx-auto mb-3 text-success" size={36} />
          <h2 className="font-display text-lg font-bold text-white">Check your email</h2>
          <p className="mt-2 text-sm text-slate-400">
            We&apos;ve sent a verification link to <span className="text-slate-200">{form.email}</span>. Verify your
            account, then sign in.
          </p>
          <button onClick={() => navigate('/login')} className="btn-primary mt-5 w-full">
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-cyan-500 shadow-glow">
            <GraduationCap size={24} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-slate-400">Student accounts can sign up here directly</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card space-y-4">
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
          )}
          <div>
            <label className="label-text">Full name</label>
            <input
              required
              className="input-field"
              placeholder="Jane Doe"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Email</label>
            <input
              type="email"
              required
              className="input-field"
              placeholder="you@university.edu"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="input-field"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Create account
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent-400 hover:text-accent-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
