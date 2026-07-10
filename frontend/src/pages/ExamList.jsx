import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users as UsersIcon, Clock, PlayCircle, Eye } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const STATUS_TONE = {
  draft: 'bg-white/10 text-slate-300',
  scheduled: 'bg-accent-500/15 text-accent-400',
  live: 'bg-success/15 text-success',
  completed: 'bg-slate-500/15 text-slate-400',
  archived: 'bg-slate-500/10 text-slate-500',
};

export default function ExamList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);

  useEffect(() => {
    api.get('/exams').then((r) => setExams(r.data.exams));
  }, []);

  const canManage = user.role === 'admin' || user.role === 'examiner';

  async function handleStartExam(examId) {
    const { data } = await api.post(`/attempts/exams/${examId}/start`);
    navigate(`/exams/${examId}/instructions`, { state: { attemptId: data.attempt.id } });
  }

  return (
    <AppLayout title={canManage ? 'Exams' : 'My Exams'}>
      {canManage && (
        <div className="mb-5 flex justify-end">
          <Link to="/exams/new" className="btn-primary">
            <Plus size={16} /> Create Exam
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {exams.map((e) => {
          const now = new Date();
          const start = new Date(e.start_time);
          const end = new Date(e.end_time);
          const isLive = now >= start && now <= end;

          return (
            <div key={e.id} className="glass-card flex flex-col">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-white">{e.title}</h3>
                <span className={`badge shrink-0 ${STATUS_TONE[e.status]}`}>{e.status}</span>
              </div>
              <p className="mb-4 line-clamp-2 text-sm text-slate-400">{e.description || 'No description provided.'}</p>

              <div className="mb-4 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} /> {start.toLocaleString()} &middot; {e.duration_minutes} min
                </div>
                {canManage && (
                  <div className="flex items-center gap-1.5">
                    <UsersIcon size={12} /> {e.enrolled_count} enrolled &middot; {e.completed_count} completed
                  </div>
                )}
              </div>

              <div className="mt-auto flex gap-2">
                {canManage ? (
                  <>
                    <Link to={`/exams/${e.id}/proctoring`} className="btn-secondary flex-1">
                      <Eye size={14} /> Live Monitor
                    </Link>
                    <Link to={`/exams/${e.id}/results`} className="btn-secondary flex-1">
                      Results
                    </Link>
                  </>
                ) : (
                  <button onClick={() => handleStartExam(e.id)} disabled={!isLive} className="btn-primary w-full">
                    <PlayCircle size={15} /> {isLive ? 'Start Exam' : now < start ? 'Not yet open' : 'Closed'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!exams.length && (
          <div className="col-span-full flex h-40 items-center justify-center text-sm text-slate-500">
            No exams to show yet.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
