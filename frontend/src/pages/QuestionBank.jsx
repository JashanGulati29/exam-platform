import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Pencil, UploadCloud, X } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import api from '../api/client';

const TYPE_LABELS = {
  mcq: 'MCQ',
  true_false: 'True / False',
  short_answer: 'Short Answer',
  coding: 'Coding',
};
const DIFFICULTY_TONE = { easy: 'bg-success/15 text-success', medium: 'bg-warning/15 text-warning', hard: 'bg-danger/15 text-danger' };

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [filters, setFilters] = useState({ type: '', difficulty: '', search: '' });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    const params = {};
    if (filters.type) params.type = filters.type;
    if (filters.difficulty) params.difficulty = filters.difficulty;
    if (filters.search) params.search = filters.search;
    const { data } = await api.get('/questions', { params });
    setQuestions(data.questions);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type, filters.difficulty]);

  async function handleSearch(e) {
    e.preventDefault();
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    await api.delete(`/questions/${id}`);
    load();
  }

  return (
    <AppLayout title="Question Bank">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input-field pl-9"
            placeholder="Search questions..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </form>
        <select
          className="input-field w-auto"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className="input-field w-auto"
          value={filters.difficulty}
          onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary">
          <Plus size={16} /> New Question
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Statement</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Difficulty</th>
              <th className="px-4 py-3 font-medium">Marks</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {questions.map((q) => (
              <tr key={q.id} className="hover:bg-white/[0.02]">
                <td className="max-w-md truncate px-4 py-3 text-slate-200">{q.statement}</td>
                <td className="px-4 py-3 text-slate-400">{TYPE_LABELS[q.type]}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${DIFFICULTY_TONE[q.difficulty]}`}>{q.difficulty}</span>
                </td>
                <td className="px-4 py-3 text-slate-400">{q.marks}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setEditing(q); setShowForm(true); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-accent-400"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!questions.length && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">
                  No questions found. Create your first question to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <QuestionFormModal
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </AppLayout>
  );
}

function QuestionFormModal({ initial, onClose, onSaved }) {
  const [type, setType] = useState(initial?.type || 'mcq');
  const [statement, setStatement] = useState(initial?.statement || '');
  const [difficulty, setDifficulty] = useState(initial?.difficulty || 'medium');
  const [marks, setMarks] = useState(initial?.marks || 1);
  const [negativeMarks, setNegativeMarks] = useState(initial?.negative_marks || 0);
  const [options, setOptions] = useState(
    initial?.options || [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }]
  );
  const [correctOptionId, setCorrectOptionId] = useState(
    Array.isArray(initial?.correct_answer) ? initial.correct_answer[0] : ''
  );
  const [trueFalseAnswer, setTrueFalseAnswer] = useState(initial?.correct_answer ?? 'true');
  const [shortAnswerKey, setShortAnswerKey] = useState(typeof initial?.correct_answer === 'string' ? initial.correct_answer : '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      let correctAnswer;
      let payloadOptions = null;
      if (type === 'mcq') {
        payloadOptions = options.filter((o) => o.text.trim());
        correctAnswer = [correctOptionId];
      } else if (type === 'true_false') {
        payloadOptions = ['True', 'False'];
        correctAnswer = trueFalseAnswer;
      } else {
        correctAnswer = shortAnswerKey;
      }

      const payload = { type, statement, difficulty, marks: Number(marks), negativeMarks: Number(negativeMarks), options: payloadOptions, correctAnswer };

      if (initial) {
        await api.patch(`/questions/${initial.id}`, payload);
      } else {
        await api.post('/questions', payload);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass-panel max-h-[90vh] w-full max-w-xl overflow-y-auto p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-white">{initial ? 'Edit Question' : 'New Question'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Type</label>
              <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label-text">Difficulty</label>
              <select className="input-field" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label-text">Question Statement</label>
            <textarea required rows={3} className="input-field" value={statement} onChange={(e) => setStatement(e.target.value)} />
          </div>

          {type === 'mcq' && (
            <div>
              <label className="label-text">Options (select the correct one)</label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={correctOptionId === opt.id}
                      onChange={() => setCorrectOptionId(opt.id)}
                    />
                    <input
                      className="input-field"
                      placeholder={`Option ${idx + 1}`}
                      value={opt.text}
                      onChange={(e) => {
                        const next = [...options];
                        next[idx] = { ...opt, text: e.target.value };
                        setOptions(next);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'true_false' && (
            <div>
              <label className="label-text">Correct Answer</label>
              <select className="input-field" value={trueFalseAnswer} onChange={(e) => setTrueFalseAnswer(e.target.value)}>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
          )}

          {(type === 'short_answer' || type === 'coding') && (
            <div>
              <label className="label-text">{type === 'coding' ? 'Reference Solution Notes' : 'Model Answer (for examiner reference)'}</label>
              <textarea rows={2} className="input-field" value={shortAnswerKey} onChange={(e) => setShortAnswerKey(e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Marks</label>
              <input type="number" min={0} step="0.5" className="input-field" value={marks} onChange={(e) => setMarks(e.target.value)} />
            </div>
            <div>
              <label className="label-text">Negative Marks</label>
              <input type="number" min={0} step="0.25" className="input-field" value={negativeMarks} onChange={(e) => setNegativeMarks(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <UploadCloud size={13} /> Need to add many at once? Use bulk import from the API.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Question'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
