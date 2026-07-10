import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: { icon: CheckCircle2, cls: 'text-success' },
  error:   { icon: XCircle,      cls: 'text-danger' },
  info:    { icon: Info,         cls: 'text-accent-400' },
  warning: { icon: AlertTriangle, cls: 'text-warning' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[999] flex flex-col gap-2">
        {toasts.map((t) => {
          const { icon: Icon, cls } = ICONS[t.type] || ICONS.info;
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border border-white/10 bg-ink-800/95 p-3.5 shadow-glass backdrop-blur-xl"
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${cls}`} />
              <p className="flex-1 text-sm text-slate-200">{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="shrink-0 text-slate-500 hover:text-slate-200">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.addToast;
}
