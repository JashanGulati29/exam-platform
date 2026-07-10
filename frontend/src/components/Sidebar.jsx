import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpenCheck, FileQuestion,
  ClipboardList, BarChart3, ShieldCheck, Users,
  GraduationCap, Bell, UserCircle, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LINKS_BY_ROLE = {
  admin: [
    { to: '/',             label: 'Dashboard',     icon: LayoutDashboard },
    { to: '/exams',        label: 'Exams',          icon: BookOpenCheck },
    { to: '/questions',    label: 'Question Bank',  icon: FileQuestion },
    { to: '/users',        label: 'Users',          icon: Users },
    { to: '/analytics',    label: 'Analytics',      icon: BarChart3 },
    { to: '/notifications',label: 'Notifications',  icon: Bell },
    { to: '/profile',      label: 'My Profile',     icon: UserCircle },
  ],
  examiner: [
    { to: '/',             label: 'Dashboard',      icon: LayoutDashboard },
    { to: '/exams',        label: 'Exams',          icon: BookOpenCheck },
    { to: '/questions',    label: 'Question Bank',  icon: FileQuestion },
    { to: '/evaluations',  label: 'Evaluations',    icon: ClipboardList },
    { to: '/notifications',label: 'Notifications',  icon: Bell },
    { to: '/profile',      label: 'My Profile',     icon: UserCircle },
  ],
  student: [
    { to: '/',             label: 'Dashboard',      icon: LayoutDashboard },
    { to: '/exams',        label: 'My Exams',       icon: BookOpenCheck },
    { to: '/results',      label: 'Results',        icon: BarChart3 },
    { to: '/notifications',label: 'Notifications',  icon: Bell },
    { to: '/profile',      label: 'My Profile',     icon: UserCircle },
  ],
};

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const links = LINKS_BY_ROLE[user?.role] || [];

  const content = (
    <div className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-cyan-500 shadow-glow">
          <GraduationCap size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-base font-bold leading-none text-white">ProctorEd</p>
          <p className="text-[11px] text-slate-500">Exam &amp; Proctoring Suite</p>
        </div>
        {/* close button on mobile */}
        {onClose && (
          <button onClick={onClose} className="ml-auto text-slate-400 lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-accent-500/15 text-white shadow-[inset_0_0_0_1px_rgba(99,102,241,0.4)]'
                  : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="glass-card !p-3 text-xs text-slate-400">
        <div className="mb-1.5 flex items-center gap-1.5 text-success">
          <ShieldCheck size={14} />
          <span className="font-medium">Proctoring active</span>
        </div>
        Live integrity monitoring is running for all scheduled exams.
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-ink-900/60 backdrop-blur-xl lg:flex lg:flex-col">
        {content}
      </aside>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={onClose}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 h-full w-64 border-r border-white/[0.06] bg-ink-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
