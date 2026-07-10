import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Trophy, Download } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import api from '../api/client';

export default function ExamResults() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [exam, setExam] = useState(null);

  useEffect(() => {
    api.get(`/exams/${examId}`).then((r) => setExam(r.data.exam));
    api.get(`/results/exam/${examId}`).then((r) => setResults(r.data.results));
  }, [examId]);

  function downloadCSV(endpoint, filename) {
    const token = localStorage.getItem('accessToken');
    const base = import.meta.env.VITE_API_URL || '/api';
    const a = document.createElement('a');
    // We pass the token as a query param for file downloads since we can't set
    // an Authorization header on a plain anchor tag.
    a.href = `${base}${endpoint}?token=${token}`;
    a.download = filename;
    a.click();
  }

  return (
    <AppLayout title="Exam Results">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ChevronLeft size={15} /> Back
      </button>

      {exam && (
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">{exam.title}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => downloadCSV(`/export/exams/${examId}/results.csv`, `${exam.title}_results.csv`)}
              className="btn-secondary"
            >
              <Download size={14} /> Results CSV
            </button>
            <button
              onClick={() => downloadCSV(`/export/exams/${examId}/proctoring.csv`, `${exam.title}_proctoring.csv`)}
              className="btn-secondary"
            >
              <Download size={14} /> Proctoring CSV
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Accuracy</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {results.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    {r.rank === 1 && <Trophy size={13} className="text-warning" />}
                    #{r.rank ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-100">{r.student_name}</td>
                <td className="px-4 py-3 text-slate-400">{r.total_score} / {r.max_score}</td>
                <td className="px-4 py-3 text-slate-400">{r.accuracy ?? '—'}%</td>
                <td className="px-4 py-3">
                  {r.is_pass ? (
                    <span className="badge bg-success/15 text-success">Pass</span>
                  ) : (
                    <span className="badge bg-danger/15 text-danger">Fail</span>
                  )}
                </td>
              </tr>
            ))}
            {!results.length && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">No results yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
