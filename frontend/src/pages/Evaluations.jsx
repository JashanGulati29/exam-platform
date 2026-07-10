import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import api from '../api/client';

export default function Evaluations() {
  const [pending, setPending] = useState([]);

  async function load() {
    const { data } = await api.get('/attempts/evaluations/pending');
    setPending(data.pending);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppLayout title="Pending Evaluations">
      <div className="space-y-4">
        {pending.map((p) => (
          <EvaluationCard key={p.answer_id} item={p} onGraded={load} />
        ))}
        {!pending.length && (
          <div className="glass-card flex h-32 items-center justify-center text-sm text-slate-500">
            <CheckCircle2 className="mr-2 text-success" size={16} /> Nothing pending review. Great work!
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function EvaluationCard({ item, onGraded }) {
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleGrade() {
    if (marks === '') return;
    setSaving(true);
    try {
      await api.post(`/attempts/answers/${item.answer_id}/grade`, {
        marksAwarded: Number(marks),
        feedback,
        isCorrect: Number(marks) >= item.marks * 0.5,
      });
      onGraded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-card">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>{item.student_name} &middot; {item.exam_title}</span>
        <span>Max marks: {item.marks}</span>
      </div>
      <p className="mb-3 text-sm font-medium text-slate-100">{item.statement}</p>
      <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300 whitespace-pre-line">
        {typeof item.response === 'string' ? item.response : JSON.stringify(item.response)}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr_auto] sm:items-end">
        <div>
          <label className="label-text">Marks Awarded</label>
          <input type="number" min={0} max={item.marks} step="0.5" className="input-field" value={marks} onChange={(e) => setMarks(e.target.value)} />
        </div>
        <div>
          <label className="label-text">Feedback</label>
          <input className="input-field" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional feedback for the student" />
        </div>
        <button onClick={handleGrade} disabled={saving || marks === ''} className="btn-primary">
          {saving ? 'Saving...' : 'Submit Grade'}
        </button>
      </div>
    </div>
  );
}
