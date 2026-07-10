import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronLeft } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import api from '../api/client';

export default function CreateExam() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    durationMinutes: 60,
    startTime: '',
    endTime: '',
    instructions: 'Ensure a stable internet connection and a working webcam before starting. Do not switch tabs or exit fullscreen during the exam.',
    negativeMarking: false,
    randomizeQuestions: false,
    fullscreenRequired: true,
    proctoringEnabled: true,
    maxTabSwitches: 3,
  });
  const [sections, setSections] = useState([{ title: 'Section 1', questionIds: [] }]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  useEffect(() => {
    api.get('/questions', { params: { pageSize: 100 } }).then((r) => setQuestions(r.data.questions));
    api.get('/users', { params: { role: 'student', pageSize: 100 } }).then((r) => setStudents(r.data.users));
  }, []);

  function toggleQuestion(sectionIdx, questionId) {
    setSections((prev) =>
      prev.map((s, idx) => {
        if (idx !== sectionIdx) return s;
        const has = s.questionIds.includes(questionId);
        return { ...s, questionIds: has ? s.questionIds.filter((id) => id !== questionId) : [...s.questionIds, questionId] };
      })
    );
  }

  function addSection() {
    setSections((prev) => [...prev, { title: `Section ${prev.length + 1}`, questionIds: [] }]);
  }

  function removeSection(idx) {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/exams', {
        ...form,
        sections,
        studentIds: selectedStudentIds,
        status: 'scheduled',
      });
      navigate(`/exams`, { replace: true });
      return data;
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Create Exam">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ChevronLeft size={15} /> Back
      </button>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="glass-card space-y-4">
            <h3 className="font-display text-sm font-semibold text-white">Exam Details</h3>
            <div>
              <label className="label-text">Title</label>
              <input required className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label-text">Description</label>
              <textarea rows={2} className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label-text">Duration (min)</label>
                <input type="number" min={5} className="input-field" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label-text">Start Time</label>
                <input type="datetime-local" required className="input-field" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div>
                <label className="label-text">End Time</label>
                <input type="datetime-local" required className="input-field" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label-text">Instructions Page Content</label>
              <textarea rows={3} className="input-field" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
            </div>
          </div>

          {sections.map((section, sIdx) => (
            <div key={sIdx} className="glass-card">
              <div className="mb-3 flex items-center justify-between">
                <input
                  className="input-field !w-auto !py-1.5 font-medium"
                  value={section.title}
                  onChange={(e) => {
                    const next = [...sections];
                    next[sIdx] = { ...section, title: e.target.value };
                    setSections(next);
                  }}
                />
                {sections.length > 1 && (
                  <button type="button" onClick={() => removeSection(sIdx)} className="text-slate-500 hover:text-danger">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <p className="mb-2 text-xs text-slate-500">{section.questionIds.length} question(s) selected</p>
              <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-white/[0.06] p-2">
                {questions.map((q) => (
                  <label key={q.id} className="flex cursor-pointer items-start gap-2 rounded-lg p-1.5 text-sm hover:bg-white/[0.04]">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={section.questionIds.includes(q.id)}
                      onChange={() => toggleQuestion(sIdx, q.id)}
                    />
                    <span className="text-slate-300">{q.statement} <span className="text-xs text-slate-500">({q.marks} marks)</span></span>
                  </label>
                ))}
                {!questions.length && <p className="p-2 text-xs text-slate-500">No questions in the bank yet.</p>}
              </div>
            </div>
          ))}
          <button type="button" onClick={addSection} className="btn-secondary">
            <Plus size={15} /> Add Section
          </button>
        </div>

        <div className="space-y-5">
          <div className="glass-card space-y-3">
            <h3 className="font-display text-sm font-semibold text-white">Exam Settings</h3>
            <Toggle label="Negative Marking" checked={form.negativeMarking} onChange={(v) => setForm({ ...form, negativeMarking: v })} />
            <Toggle label="Randomize Questions" checked={form.randomizeQuestions} onChange={(v) => setForm({ ...form, randomizeQuestions: v })} />
            <Toggle label="Require Fullscreen" checked={form.fullscreenRequired} onChange={(v) => setForm({ ...form, fullscreenRequired: v })} />
            <Toggle label="Enable AI Proctoring" checked={form.proctoringEnabled} onChange={(v) => setForm({ ...form, proctoringEnabled: v })} />
            <div>
              <label className="label-text">Max Tab Switches Allowed</label>
              <input type="number" min={0} className="input-field" value={form.maxTabSwitches} onChange={(e) => setForm({ ...form, maxTabSwitches: Number(e.target.value) })} />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="mb-3 font-display text-sm font-semibold text-white">Enroll Students</h3>
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {students.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-sm hover:bg-white/[0.04]">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(s.id)}
                    onChange={() =>
                      setSelectedStudentIds((prev) => (prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]))
                    }
                  />
                  <span className="text-slate-300">{s.full_name} <span className="text-xs text-slate-500">({s.email})</span></span>
                </label>
              ))}
              {!students.length && <p className="text-xs text-slate-500">No students found.</p>}
            </div>
            <p className="mt-2 text-xs text-slate-500">{selectedStudentIds.length} student(s) selected</p>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Creating exam...' : 'Create & Schedule Exam'}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-sm text-slate-300">
      {label}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-accent-500' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-4' : 'left-0.5'}`} />
      </button>
    </label>
  );
}
