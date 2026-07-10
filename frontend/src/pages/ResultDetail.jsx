import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, XCircle, MinusCircle, Award } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import api from '../api/client';

const TYPE_LABEL = { mcq: 'MCQ', true_false: 'True / False', short_answer: 'Short Answer', coding: 'Coding' };

export default function ResultDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/results/${id}`).then((r) => setData(r.data));
  }, [id]);

  if (!data) {
    return (
      <AppLayout title="Result Details">
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">Loading…</div>
      </AppLayout>
    );
  }

  const { result, answers } = data;
  const percentage = result.max_score > 0 ? Math.round((result.total_score / result.max_score) * 100) : 0;

  return (
    <AppLayout title="Result Details">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ChevronLeft size={15} /> Back
      </button>

      {/* Summary card */}
      <div className="glass-card mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">{result.exam_title}</h2>
            <p className="mt-1 text-sm text-slate-400">
              Submitted {new Date(result.generated_at).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {result.rank && (
              <div className="flex items-center gap-1.5 text-sm text-accent-400">
                <Award size={16} /> Rank #{result.rank}
              </div>
            )}
            <div className="text-right">
              <p className="font-display text-3xl font-bold text-white">
                {result.total_score}
                <span className="ml-1 text-base font-normal text-slate-400">/ {result.max_score}</span>
              </p>
              <span
                className={`badge mt-1 ${
                  result.is_pass ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                }`}
              >
                {result.is_pass ? 'Pass' : 'Fail'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Score</span>
            <span>{percentage}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all ${
                result.is_pass
                  ? 'bg-gradient-to-r from-success to-cyan-400'
                  : 'bg-gradient-to-r from-danger/80 to-danger'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="space-y-3">
        {answers.map((a, idx) => {
          const status =
            a.is_correct === true ? 'correct' : a.is_correct === false ? 'incorrect' : 'pending';

          const STATUS_STYLES = {
            correct: { icon: CheckCircle2, cls: 'text-success', border: 'border-success/20', bg: 'bg-success/5' },
            incorrect: { icon: XCircle, cls: 'text-danger', border: 'border-danger/20', bg: 'bg-danger/5' },
            pending: { icon: MinusCircle, cls: 'text-slate-500', border: 'border-white/[0.06]', bg: '' },
          };
          const { icon: Icon, cls, border, bg } = STATUS_STYLES[status];

          return (
            <div key={a.id} className={`glass-card border ${border} ${bg}`}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Icon size={16} className={`mt-0.5 shrink-0 ${cls}`} />
                  <div>
                    <span className="text-xs text-slate-500">
                      Q{idx + 1} &middot; {TYPE_LABEL[a.type] || a.type}
                    </span>
                    <p className="mt-0.5 text-sm text-slate-100">{a.statement}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <span
                    className={
                      a.marks_awarded === null
                        ? 'text-slate-500'
                        : Number(a.marks_awarded) >= 0
                        ? 'text-success'
                        : 'text-danger'
                    }
                  >
                    {a.marks_awarded !== null ? `${a.marks_awarded > 0 ? '+' : ''}${a.marks_awarded}` : 'Pending'}
                  </span>
                  <span className="text-slate-500"> / {a.max_marks}</span>
                </div>
              </div>

              {/* Student's response */}
              <div className="ml-6 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Your Answer</p>
                <p className="text-sm text-slate-300">
                  {a.response === null || a.response === undefined
                    ? 'Not answered'
                    : typeof a.response === 'object'
                    ? JSON.stringify(a.response)
                    : String(a.response)}
                </p>
              </div>

              {a.examiner_feedback && (
                <div className="ml-6 mt-2 rounded-lg border border-accent-500/20 bg-accent-500/5 p-2.5">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-accent-400">Examiner Feedback</p>
                  <p className="text-sm text-slate-300">{a.examiner_feedback}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
