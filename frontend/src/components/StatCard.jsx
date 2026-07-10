import React from 'react';

const TONES = {
  accent: 'from-accent-500/20 to-accent-500/5 text-accent-400',
  cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400',
  success: 'from-success/20 to-success/5 text-success',
  warning: 'from-warning/20 to-warning/5 text-warning',
  danger: 'from-danger/20 to-danger/5 text-danger',
};

export default function StatCard({ icon: Icon, label, value, sublabel, tone = 'accent' }) {
  return (
    <div className="glass-card flex items-start justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-2 font-display text-2xl font-bold text-white">{value}</p>
        {sublabel && <p className="mt-1 text-xs text-slate-500">{sublabel}</p>}
      </div>
      {Icon && (
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${TONES[tone]}`}>
          <Icon size={20} />
        </div>
      )}
    </div>
  );
}
