import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AppLayout from '../components/AppLayout';
import api from '../api/client';

export default function Analytics() {
  const [difficulty, setDifficulty] = useState([]);
  const [proctoringReport, setProctoringReport] = useState([]);

  useEffect(() => {
    api.get('/analytics/admin/question-difficulty').then((r) => setDifficulty(r.data.data));
    api.get('/analytics/admin/proctoring-report').then((r) => setProctoringReport(r.data.data));
  }, []);

  return (
    <AppLayout title="Analytics">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="glass-card">
          <p className="mb-4 font-display text-sm font-semibold text-white">Question Difficulty Analysis</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={difficulty} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="difficulty" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit="%" />
              <Tooltip contentStyle={{ background: '#0F1526', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="correct_rate" name="Correct Rate" fill="#22D3EE" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <p className="mb-4 font-display text-sm font-semibold text-white">Proctoring Violation Report</p>
          <div className="space-y-2">
            {proctoringReport.map((row, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm">
                <span className="capitalize text-slate-200">{row.event_type.replace('_', ' ')}</span>
                <div className="flex items-center gap-3">
                  <span className={`badge ${row.severity === 'high' ? 'bg-danger/15 text-danger' : row.severity === 'medium' ? 'bg-warning/15 text-warning' : 'bg-white/10 text-slate-300'}`}>
                    {row.severity}
                  </span>
                  <span className="text-slate-400">{row.count}</span>
                </div>
              </div>
            ))}
            {!proctoringReport.length && (
              <div className="flex h-32 items-center justify-center text-sm text-slate-500">No proctoring events recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
