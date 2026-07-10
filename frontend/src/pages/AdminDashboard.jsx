import React, { useEffect, useState } from 'react';
import { BookOpenCheck, Users, Activity, ShieldAlert, TrendingUp } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import StatCard from '../components/StatCard';
import PassFailChart from '../components/charts/PassFailChart';
import api from '../api/client';

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [passFail, setPassFail] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);

  useEffect(() => {
    api.get('/analytics/admin/overview').then((r) => setOverview(r.data));
    api.get('/analytics/admin/pass-fail').then((r) => setPassFail(r.data.data));
    api.get('/analytics/admin/top-performers').then((r) => setTopPerformers(r.data.data));
  }, []);

  return (
    <AppLayout title="Admin Dashboard">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={BookOpenCheck} label="Total Exams" value={overview?.totalExams ?? '—'} tone="accent" />
        <StatCard icon={Users} label="Total Students" value={overview?.totalStudents ?? '—'} tone="cyan" />
        <StatCard icon={Activity} label="Active Exams" value={overview?.activeExams ?? '—'} tone="success" />
        <StatCard
          icon={TrendingUp}
          label="Completion Rate"
          value={overview ? `${overview.completionRate}%` : '—'}
          tone="warning"
        />
        <StatCard
          icon={ShieldAlert}
          label="Proctoring Alerts (24h)"
          value={overview?.proctoringAlertsLast24h ?? '—'}
          tone="danger"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="glass-card lg:col-span-2">
          <p className="mb-4 font-display text-sm font-semibold text-white">Pass / Fail Rate by Exam</p>
          {passFail.length ? <PassFailChart data={passFail} /> : <EmptyState text="No completed exams yet." />}
        </div>

        <div className="glass-card">
          <p className="mb-4 font-display text-sm font-semibold text-white">Top Performers</p>
          {topPerformers.length ? (
            <ul className="space-y-3">
              {topPerformers.slice(0, 6).map((p, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-100">{p.full_name}</p>
                    <p className="text-xs text-slate-500">{p.exam_title}</p>
                  </div>
                  <span className="badge bg-success/15 text-success">
                    {p.total_score}/{p.max_score}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState text="No results yet." />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function EmptyState({ text }) {
  return <div className="flex h-48 items-center justify-center text-sm text-slate-500">{text}</div>;
}
