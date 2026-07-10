import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, Wifi, Eye } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import api from '../api/client';
import { getSocket } from '../api/socket';

const SEVERITY_TONE = { low: 'bg-white/10 text-slate-300', medium: 'bg-warning/15 text-warning', high: 'bg-danger/15 text-danger' };

export default function LiveProctoring() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [liveAttempts, setLiveAttempts] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    api.get(`/proctoring/exams/${examId}/live`).then((r) => setLiveAttempts(r.data.liveAttempts));

    const socket = getSocket();
    socket.emit('join:proctor-dashboard', { examId });

    function handleEvent(evt) {
      if (evt.examId !== examId) return;
      setRecentEvents((prev) => [evt, ...prev].slice(0, 30));
      setLiveAttempts((prev) =>
        prev.map((a) => (a.attempt_id === evt.attemptId ? { ...a, violation_count: a.violation_count + 1 } : a))
      );
    }
    socket.on('proctoring:event', handleEvent);

    const poll = setInterval(() => {
      api.get(`/proctoring/exams/${examId}/live`).then((r) => setLiveAttempts(r.data.liveAttempts));
    }, 15000);

    return () => {
      socket.off('proctoring:event', handleEvent);
      clearInterval(poll);
    };
  }, [examId]);

  return (
    <AppLayout title="Live Proctoring">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ChevronLeft size={15} /> Back
      </button>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="glass-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-white">Active Test Takers</h3>
            <span className="flex items-center gap-1.5 text-xs text-success"><Wifi size={13} /> {liveAttempts.length} online</span>
          </div>
          <div className="space-y-2">
            {liveAttempts.map((a) => (
              <div key={a.attempt_id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">{a.student_name}</p>
                  <p className="text-xs text-slate-500">
                    Started {new Date(a.started_at).toLocaleTimeString()} &middot; {a.tab_switch_count} tab switch(es)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {a.violation_count > 0 ? (
                    <span className={`badge ${SEVERITY_TONE[a.max_severity] || SEVERITY_TONE.low}`}>
                      {a.violation_count} violation{a.violation_count !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="badge bg-success/15 text-success">Clean</span>
                  )}
                  <Eye size={14} className="text-slate-500" />
                </div>
              </div>
            ))}
            {!liveAttempts.length && (
              <div className="flex h-32 items-center justify-center text-sm text-slate-500">No students currently taking this exam.</div>
            )}
          </div>
        </div>

        <div className="glass-card">
          <h3 className="mb-4 font-display text-sm font-semibold text-white">Live Event Feed</h3>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto">
            {recentEvents.map((evt, idx) => (
              <div key={idx} className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-xs">
                <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warning" />
                <div>
                  <p className="capitalize text-slate-200">{evt.event_type.replace('_', ' ')}</p>
                  <p className="text-slate-500">{new Date(evt.occurred_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            {!recentEvents.length && <p className="text-xs text-slate-500">Listening for events...</p>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
