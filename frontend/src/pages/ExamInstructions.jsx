import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, Camera, Maximize, AlertCircle, Loader2 } from 'lucide-react';
import api from '../api/client';

export default function ExamInstructions() {
  const { examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api.get(`/exams/${examId}`).then((r) => setExam(r.data.exam));
  }, [examId]);

  async function handleBegin() {
    setStarting(true);
    try {
      if (exam.fullscreen_required && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
      let attemptId = location.state?.attemptId;
      if (!attemptId) {
        const { data } = await api.post(`/attempts/exams/${examId}/start`);
        attemptId = data.attempt.id;
      }
      navigate(`/attempts/${attemptId}`, { replace: true });
    } finally {
      setStarting(false);
    }
  }

  if (!exam) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading exam...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-panel w-full max-w-2xl p-8">
        <h1 className="font-display text-2xl font-bold text-white">{exam.title}</h1>
        <p className="mt-1 text-sm text-slate-400">
          Duration: {exam.duration_minutes} minutes &middot; Total marks: {exam.total_marks}
        </p>

        <div className="my-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-slate-300 whitespace-pre-line">
          {exam.instructions}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Requirement icon={Camera} label="Webcam access" active={exam.proctoring_enabled} />
          <Requirement icon={Maximize} label="Fullscreen mode" active={exam.fullscreen_required} />
          <Requirement icon={ShieldCheck} label="No tab switching" active={exam.proctoring_enabled} />
        </div>

        <label className="mb-6 flex items-start gap-2 text-sm text-slate-300">
          <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          I understand this exam is proctored. My webcam will be monitored, and tab switches, window changes, or
          exiting fullscreen will be flagged and may lead to disqualification.
        </label>

        {exam.proctoring_enabled && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            Make sure you are in a quiet, well-lit room and that you are the only person visible on camera throughout
            the exam.
          </div>
        )}

        <button onClick={handleBegin} disabled={!agreed || starting} className="btn-primary w-full">
          {starting ? <Loader2 size={16} className="animate-spin" /> : null}
          Begin Exam
        </button>
      </div>
    </div>
  );
}

function Requirement({ icon: Icon, label, active }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs ${active ? 'border-accent-500/30 bg-accent-500/10 text-accent-300' : 'border-white/10 text-slate-500'}`}>
      <Icon size={14} /> {label}
    </div>
  );
}
