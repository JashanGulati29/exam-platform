import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Percent, ArrowRight } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import StatCard from '../components/StatCard';
import ScoreTrendChart from '../components/charts/ScoreTrendChart';
import api from '../api/client';

export default function StudentDashboard() {
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [exams, setExams] = useState([]);

  useEffect(() => {
    api.get('/analytics/student/overview').then((r) => setOverview(r.data));
    api.get('/analytics/student/performance-trend').then((r) => setTrend(r.data.data));
    api.get('/exams').then((r) => setExams(r.data.exams));
  }, []);

  const upcoming = exams
    .filter((e) => new Date(e.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 4);

  return (
    <AppLayout title="My Dashboard">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={CalendarClock} label="Upcoming Exams" value={overview?.upcomingExams ?? '—'} tone="accent" />
        <StatCard icon={CheckCircle2} label="Completed Exams" value={overview?.completedExams ?? '—'} tone="success" />
        <StatCard
          icon={Percent}
          label="Average Score"
          value={overview ? `${overview.averageScorePercent}%` : '—'}
          tone="cyan"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="glass-card lg:col-span-2">
          <p className="mb-4 font-display text-sm font-semibold text-white">Performance Trend</p>
          {trend.length ? <ScoreTrendChart data={trend} /> : <EmptyState text="Take an exam to see your trend here." />}
        </div>

        <div className="glass-card">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-sm font-semibold text-white">Upcoming Exams</p>
            <Link to="/exams" className="text-xs text-accent-400 hover:text-accent-300">
              View all
            </Link>
          </div>
          {upcoming.length ? (
            <ul className="space-y-3">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-100">{e.title}</p>
                    <p className="text-xs text-slate-500">{new Date(e.start_time).toLocaleString()}</p>
                  </div>
                  <ArrowRight size={15} className="text-slate-500" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState text="No upcoming exams scheduled." />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function EmptyState({ text }) {
  return <div className="flex h-48 items-center justify-center text-sm text-slate-500">{text}</div>;
}
