import React from 'react';

// `statusOf(question)` returns one of: 'current' | 'answered' | 'review' | 'unanswered'
export default function QuestionNavigator({ questions, currentIndex, statusOf, onJump }) {
  const STYLES = {
    current: 'bg-accent-500 text-white shadow-glow border-accent-400',
    answered: 'bg-success/15 text-success border-success/40',
    review: 'bg-warning/15 text-warning border-warning/40',
    unanswered: 'bg-white/[0.03] text-slate-400 border-white/10',
  };

  return (
    <div className="glass-card">
      <p className="label-text">Questions</p>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, idx) => {
          const status = idx === currentIndex ? 'current' : statusOf(q);
          return (
            <button
              key={q.id}
              onClick={() => onJump(idx)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-semibold transition ${STYLES[status]}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-1.5 text-xs text-slate-400">
        <Legend swatch="bg-success/60" label="Answered" />
        <Legend swatch="bg-warning/60" label="Marked for review" />
        <Legend swatch="bg-white/20" label="Not answered" />
        <Legend swatch="bg-accent-500" label="Current question" />
      </div>
    </div>
  );
}

function Legend({ swatch, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${swatch}`} />
      {label}
    </div>
  );
}
