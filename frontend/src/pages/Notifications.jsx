import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import api from '../api/client';

const TYPE_TONE = {
  exam_reminder: 'bg-accent-500/15 text-accent-400',
  result_announced: 'bg-success/15 text-success',
  proctoring_alert: 'bg-danger/15 text-danger',
  general: 'bg-white/10 text-slate-300',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  async function load() {
    const { data } = await api.get('/notifications');
    setNotifications(data.notifications);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleMarkAllRead() {
    await api.patch('/notifications/read-all');
    load();
  }

  async function handleMarkRead(id) {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <AppLayout title="Notifications">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {unread > 0 ? `${unread} unread` : 'All caught up'}
          </p>
          {unread > 0 && (
            <button onClick={handleMarkAllRead} className="btn-secondary">
              <CheckCheck size={14} /> Mark all as read
            </button>
          )}
        </div>

        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && handleMarkRead(n.id)}
              className={`glass-card cursor-pointer transition hover:bg-white/[0.06] ${
                !n.is_read ? 'border-accent-500/30' : 'border-white/[0.06]'
              }`}
            >
              <div className="flex items-start gap-3">
                <Bell
                  size={15}
                  className={`mt-0.5 shrink-0 ${n.is_read ? 'text-slate-500' : 'text-accent-400'}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${n.is_read ? 'text-slate-400' : 'text-white'}`}>
                      {n.title}
                    </p>
                    <span className={`badge shrink-0 text-[10px] capitalize ${TYPE_TONE[n.type]}`}>
                      {n.type.replace('_', ' ')}
                    </span>
                  </div>
                  {n.message && (
                    <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-600">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {!n.is_read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500" />
                )}
              </div>
            </div>
          ))}

          {!notifications.length && (
            <div className="glass-card flex h-40 flex-col items-center justify-center gap-2 text-slate-500">
              <Bell size={28} className="opacity-40" />
              <p className="text-sm">No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
