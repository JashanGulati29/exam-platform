import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import api from '../api/client';

const ROLE_TONE = { admin: 'bg-accent-500/15 text-accent-400', examiner: 'bg-cyan-500/15 text-cyan-400', student: 'bg-white/10 text-slate-300' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const { data } = await api.get('/users', { params: roleFilter ? { role: roleFilter } : {} });
    setUsers(data.users);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  async function toggleActive(user) {
    await api.patch(`/users/${user.id}`, { isActive: !user.is_active });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this user account? This cannot be undone.')) return;
    await api.delete(`/users/${id}`);
    load();
  }

  return (
    <AppLayout title="Users">
      <div className="mb-5 flex items-center justify-between">
        <select className="input-field w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="examiner">Examiner</option>
          <option value="student">Student</option>
        </select>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-slate-100">{u.full_name}</td>
                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                <td className="px-4 py-3"><span className={`badge capitalize ${ROLE_TONE[u.role]}`}>{u.role}</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(u)} className={`badge ${u.is_active ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                    {u.is_active ? 'Active' : 'Disabled'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button onClick={() => handleDelete(u.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && <CreateUserModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </AppLayout>
  );
}

function CreateUserModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'student' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/users', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create user.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-sm p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-white">Add User</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
          <div>
            <label className="label-text">Full Name</label>
            <input required className="input-field" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="label-text">Email</label>
            <input type="email" required className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label-text">Temporary Password</label>
            <input type="password" required minLength={8} className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label-text">Role</label>
            <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="student">Student</option>
              <option value="examiner">Examiner</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Creating...' : 'Create User'}</button>
        </form>
      </div>
    </div>
  );
}
