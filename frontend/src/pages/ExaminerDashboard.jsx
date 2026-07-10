import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, BookOpenCheck, ClipboardList, ArrowRight } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import StatCard from '../components/StatCard';
import api from '../api/client';

export default function ExaminerDashboard() {
  const [overview, setOverview] = useState(null);
  const [pending, setPending] = useState([]);

  useEffect(() => {
    api.get('/analytics/examiner/overview').then((r) => setOverview(r.data));
    api.get('/attempts/evaluations/pending').then((r) => setPending(r.data.pending));
  }, []);

  return (
    <AppLayout title="Examiner Dashboard">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={FileQuestion} label="Questions Created" value={overview?.questionsCreated ?? '—'} tone="accent" />
        <StatCard icon={BookOpenCheck} label="Exams Conducted" value={overview?.examsConducted ?? '—'} tone="cyan" />
        <StatCard
          icon={ClipboardList}
          label="Pending Evaluations"
          value={overview?.pendingEvaluations ?? '—'}
          tone="warning"
        />
      </div>

      <div className="glass-card">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-sm font-semibold text-white">Pending Subjective Evaluations</p>
          <Link to="/evaluations" className="text-xs text-accent-400 hover:text-accent-300">
            Review all
          </Link>
        </div>
        {pending.length ? (
          <ul className="divide-y divide-white/[0.06]">
            {pending.slice(0, 6).map((p) => (
              <li key={p.answer_id} className="flex items-center justify-between py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-100">{p.statement}</p>
                  <p className="text-xs text-slate-500">
                    {p.student_name} &middot; {p.exam_title}
                  </p>
                </div>
                <Link to="/evaluations" className="ml-3 shrink-0 text-slate-500 hover:text-accent-400">
                  <ArrowRight size={15} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-slate-500">
            No pending evaluations. You&apos;re all caught up.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
