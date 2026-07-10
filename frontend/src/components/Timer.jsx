import React, { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

// Counts down from `durationSeconds`, calling onExpire exactly once when it
// hits zero (used to trigger auto-submit). Survives re-renders by tracking
// the actual deadline rather than decrementing a counter, so it stays
// accurate even if the tab was throttled in the background.
export default function Timer({ deadline, onExpire }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));
  const expiredRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const msLeft = Math.max(0, deadline - Date.now());
      setRemaining(msLeft);
      if (msLeft <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const isLow = totalSeconds <= 300; // last 5 minutes

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 font-mono text-sm font-semibold transition ${
        isLow ? 'border-danger/40 bg-danger/10 text-danger' : 'border-white/10 bg-white/[0.04] text-slate-100'
      }`}
    >
      <Clock size={15} />
      {hours > 0 && `${pad(hours)}:`}
      {pad(minutes)}:{pad(seconds)}
    </div>
  );
}
