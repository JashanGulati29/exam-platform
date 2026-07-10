import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import api from '../api/client';

export default function Results() {
  const [results, setResults] = useState([]);

  useEffect(() => {
    api.get('/results/me').then((r) => setResults(r.data.results));
  }, []);

  return (
    <AppLayout title="My Results">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.map((r) => {
          const percentage = r.max_score > 0 ? Math.round((r.total_score / r.max_score) * 100) : 0;
          return (
            <div key={r.id} className="glass-card flex flex-col">
              <div className="mb-3 flex items-start justify-between">
                <h3 className="font-display text-base font-semibold text-white">{r.exam_title}</h3>
                {r.is_pass ? (
                  <span className="badge flex items-center gap-1 bg-success/15 text-success">
                    <CheckCircle2 size={12} /> Pass
                  </span>
                ) : (
                  <span className="badge flex items-center gap-1 bg-danger/15 text-danger">
                    <XCircle size={12} /> Fail
                  </span>
                )}
              </div>

              <div className="mb-4 flex items-end gap-2">
                <span className="font-display text-3xl font-bold text-white">{r.total_score}</span>
                <span className="mb-1 text-sm text-slate-500">/ {r.max_score} marks</span>
              </div>

              <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-500 to-cyan-400"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{percentage}% accuracy</span>
                {r.rank && (
                  <span className="flex items-center gap-1 text-accent-400">
                    <Award size={12} /> Rank #{r.rank}
                  </span>
                )}
              </div>

              <Link
                to={`/results/${r.id}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                View breakdown <ArrowRight size={13} />
              </Link>
            </div>
          );
        })}
        {!results.length && (
          <div className="col-span-full flex h-40 items-center justify-center text-sm text-slate-500">
            No results yet. Complete an exam to see your performance here.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
