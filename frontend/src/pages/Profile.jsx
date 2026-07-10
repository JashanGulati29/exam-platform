import React, { useState } from 'react';
import { User, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

export default function Profile() {
  const { user, login } = useAuth();
  const toast = useToast();

  const [nameForm, setNameForm] = useState({ fullName: user?.fullName || user?.full_name || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingName, setSavingName] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  async function handleNameSave(e) {
    e.preventDefault();
    setSavingName(true);
    try {
      await api.patch(`/users/${user.id}`, { fullName: nameForm.fullName });
      toast('Display name updated.', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update name.', 'error');
    } finally {
      setSavingName(false);
    }
  }

  async function handlePwSave(e) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      toast('New passwords do not match.', 'error');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast('Password must be at least 8 characters.', 'error');
      return;
    }
    setSavingPw(true);
    try {
      // Re-authenticate then update: the simplest approach for a self-service
      // password change is to call the change-password endpoint; here we reuse
      // the reset-password endpoint after verifying the current password server-side.
      // For a production build, add a dedicated PATCH /auth/change-password route.
      await api.patch(`/auth/change-password`, {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast('Password changed successfully.', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to change password.', 'error');
    } finally {
      setSavingPw(false);
    }
  }

  const initials = (user?.fullName || user?.full_name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <AppLayout title="My Profile">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Avatar + role */}
        <div className="glass-card flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-cyan-500 text-xl font-bold text-white shadow-glow">
            {initials}
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-white">{user?.fullName || user?.full_name}</p>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-accent-500/15 px-2.5 py-0.5 text-xs font-medium capitalize text-accent-400">
              {user?.role}
            </span>
          </div>
          {user?.isEmailVerified && (
            <span className="ml-auto flex items-center gap-1 text-xs text-success">
              <CheckCircle2 size={13} /> Verified
            </span>
          )}
        </div>

        {/* Update display name */}
        <div className="glass-card">
          <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-white">
            <User size={16} className="text-accent-400" /> Account Details
          </h3>
          <form onSubmit={handleNameSave} className="space-y-4">
            <div>
              <label className="label-text">Display Name</label>
              <input
                required
                className="input-field"
                value={nameForm.fullName}
                onChange={(e) => setNameForm({ fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="label-text">Email</label>
              <input className="input-field cursor-not-allowed opacity-50" value={user?.email} disabled />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={savingName} className="btn-primary">
                {savingName && <Loader2 size={14} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Change password */}
        <div className="glass-card">
          <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-white">
            <Lock size={16} className="text-accent-400" /> Change Password
          </h3>
          <form onSubmit={handlePwSave} className="space-y-4">
            <div>
              <label className="label-text">Current Password</label>
              <input
                type="password"
                required
                className="input-field"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              />
            </div>
            <div>
              <label className="label-text">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="input-field"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              />
            </div>
            <div>
              <label className="label-text">Confirm New Password</label>
              <input
                type="password"
                required
                className="input-field"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={savingPw} className="btn-primary">
                {savingPw && <Loader2 size={14} className="animate-spin" />}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
