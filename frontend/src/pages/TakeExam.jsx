import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flag, ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react';
import Timer from '../components/Timer';
import QuestionNavigator from '../components/QuestionNavigator';
import ProctoringWebcam from '../components/ProctoringWebcam';
import api from '../api/client';

export default function TakeExam() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [paper, setPaper] = useState(null); // { attempt, exam, questions, savedAnswers }
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> { response, isMarkedForReview }
  const [submitting, setSubmitting] = useState(false);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    api.get(`/attempts/${attemptId}/paper`).then(({ data }) => {
      setPaper(data);
      const initial = {};
      data.savedAnswers.forEach((a) => {
        initial[a.question_id] = { response: a.response, isMarkedForReview: a.is_marked_for_review };
      });
      setAnswers(initial);
    });
  }, [attemptId]);

  // periodic heartbeat so the backend / live proctor dashboard knows this
  // attempt is still connected
  useEffect(() => {
    const interval = setInterval(() => {
      api.post(`/attempts/${attemptId}/heartbeat`).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [attemptId]);

  const questions = paper?.questions || [];
  const currentQuestion = questions[currentIndex];

  const deadline = useMemo(() => {
    if (!paper) return null;
    const byDuration = new Date(paper.attempt.started_at).getTime() + paper.exam.duration_minutes * 60 * 1000;
    const byExamEnd = new Date(paper.exam.end_time).getTime();
    return Math.min(byDuration, byExamEnd);
  }, [paper]);

  const persistAnswer = useCallback(
    (questionId, response, isMarkedForReview) => {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        api.put(`/attempts/${attemptId}/answers`, { questionId, response, isMarkedForReview }).catch(() => {});
      }, 600); // debounce so we don't fire a request on every keystroke
    },
    [attemptId]
  );

  function updateResponse(questionId, response) {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: { ...prev[questionId], response } };
      persistAnswer(questionId, response, next[questionId]?.isMarkedForReview || false);
      return next;
    });
  }

  function toggleMarkForReview(questionId) {
    setAnswers((prev) => {
      const current = prev[questionId] || {};
      const next = { ...prev, [questionId]: { ...current, isMarkedForReview: !current.isMarkedForReview } };
      persistAnswer(questionId, current.response, next[questionId].isMarkedForReview);
      return next;
    });
  }

  function statusOf(question) {
    const a = answers[question.id];
    if (!a) return 'unanswered';
    if (a.isMarkedForReview) return 'review';
    const hasResponse = a.response !== undefined && a.response !== null && a.response !== '';
    return hasResponse ? 'answered' : 'unanswered';
  }

  const handleSubmit = useCallback(
    async (autoSubmitted = false) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        await api.post(`/attempts/${attemptId}/submit`, { autoSubmitted });
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        navigate('/results', { replace: true });
      } finally {
        setSubmitting(false);
      }
    },
    [attemptId, navigate, submitting]
  );

  const logViolation = useCallback(
    ({ eventType, metadata }) => {
      api.post(`/proctoring/attempts/${attemptId}/events`, { eventType, metadata }).catch(() => {});
    },
    [attemptId]
  );

  if (!paper) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading your exam...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-ink-900/70 px-6 backdrop-blur-xl">
        <div>
          <h1 className="font-display text-base font-semibold text-white">{paper.exam.title}</h1>
          <p className="text-xs text-slate-500">Question {currentIndex + 1} of {questions.length}</p>
        </div>
        <div className="flex items-center gap-3">
          {deadline && <Timer deadline={deadline} onExpire={() => handleSubmit(true)} />}
          <button onClick={() => handleSubmit(false)} disabled={submitting} className="btn-primary">
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Submit Exam
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-5 overflow-hidden p-5 lg:grid-cols-[1fr_300px]">
        <div className="overflow-y-auto pr-1">
          {currentQuestion && (
            <div className="glass-card">
              <div className="mb-4 flex items-center justify-between">
                <span className="badge bg-accent-500/15 text-accent-400 capitalize">{currentQuestion.type.replace('_', ' ')}</span>
                <span className="text-xs text-slate-500">{currentQuestion.marks} mark(s)</span>
              </div>
              <p className="mb-5 whitespace-pre-line text-sm leading-relaxed text-slate-100">{currentQuestion.statement}</p>

              <QuestionInput
                question={currentQuestion}
                value={answers[currentQuestion.id]?.response}
                onChange={(val) => updateResponse(currentQuestion.id, val)}
              />

              <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
                <button
                  onClick={() => toggleMarkForReview(currentQuestion.id)}
                  className={`btn-secondary ${answers[currentQuestion.id]?.isMarkedForReview ? '!border-warning/40 !text-warning' : ''}`}
                >
                  <Flag size={14} /> {answers[currentQuestion.id]?.isMarkedForReview ? 'Unmark' : 'Mark for Review'}
                </button>
                <div className="flex gap-2">
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    className="btn-secondary"
                  >
                    <ChevronLeft size={15} /> Previous
                  </button>
                  <button
                    disabled={currentIndex === questions.length - 1}
                    onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                    className="btn-primary"
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5 overflow-y-auto pl-1">
          {paper.exam.proctoring_enabled && (
            <ProctoringWebcam
              onViolation={logViolation}
              maxTabSwitches={paper.exam.max_tab_switches}
              onMaxTabSwitchesExceeded={() => handleSubmit(true)}
            />
          )}
          <QuestionNavigator
            questions={questions}
            currentIndex={currentIndex}
            statusOf={statusOf}
            onJump={setCurrentIndex}
          />
        </div>
      </div>
    </div>
  );
}

function QuestionInput({ question, value, onChange }) {
  if (question.type === 'mcq') {
    const options = question.options || [];
    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
              value?.[0] === opt.id ? 'border-accent-500/50 bg-accent-500/10 text-white' : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]'
            }`}
          >
            <input type="radio" name={question.id} checked={value?.[0] === opt.id} onChange={() => onChange([opt.id])} />
            {opt.text}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'true_false') {
    return (
      <div className="flex gap-3">
        {['true', 'false'].map((v) => (
          <label
            key={v}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm capitalize transition ${
              value === v ? 'border-accent-500/50 bg-accent-500/10 text-white' : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]'
            }`}
          >
            <input type="radio" name={question.id} checked={value === v} onChange={() => onChange(v)} className="hidden" />
            {v}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'coding') {
    return (
      <textarea
        rows={12}
        spellCheck={false}
        className="input-field font-mono text-xs"
        value={value || question.starter_code || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  // short_answer
  return <textarea rows={6} className="input-field" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
}
