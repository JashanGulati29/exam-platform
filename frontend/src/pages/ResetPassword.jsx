import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    token: searchParams.get('token') || '',
    newPassword: '',
    confirm: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: form.token, newPassword: form.newPassword });
      toast('Password reset! You can now log in with your new password.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired token.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-cyan-500 shadow-glow">
            <KeyRound size={22} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Choose a new password</h1>
        </div>

        <form onSubmit={handleSubmit} className="glass-card space-y-4">
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}

          {!searchParams.get('token') && (
            <div>
              <label className="label-text">Reset Token</label>
              <input
                required
                className="input-field font-mono"
                placeholder="Paste the token from your email"
                value={form.token}
                onChange={(e) => setForm({ ...form, token: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="label-text">New Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                minLength={8}
                className="input-field pr-10"
                placeholder="At least 8 characters"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label-text">Confirm Password</label>
            <input
              type="password"
              required
              className="input-field"
              placeholder="Re-enter new password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Reset Password
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          <Link to="/login" className="font-medium text-accent-400 hover:text-accent-300">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
