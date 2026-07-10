import React, { useEffect, useState } from 'react';
import { Bell, LogOut, Moon, Sun, Menu, UserCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ title, onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = (user?.fullName || user?.full_name || user?.email || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-ink-900/50 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — visible only on mobile */}
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.08] lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={16} />
        </button>
        <h1 className="font-display text-base font-semibold text-white sm:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsDark((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.08]"
          title="Toggle theme"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <Link
          to="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.08]"
          title="Notifications"
        >
          <Bell size={16} />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" />
        </Link>

        <div className="mx-1 h-6 w-px bg-white/10" />

        <Link to="/profile" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-cyan-500 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="hidden text-sm sm:block">
            <p className="font-medium leading-none text-slate-100">{user?.fullName || user?.full_name}</p>
            <p className="mt-0.5 text-xs capitalize leading-none text-slate-500">{user?.role}</p>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-danger/20 hover:text-danger"
          title="Log out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
