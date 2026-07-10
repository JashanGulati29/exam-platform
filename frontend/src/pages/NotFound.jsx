import React from 'react';
import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.04] border border-white/[0.08]">
        <SearchX size={36} className="text-slate-400" />
      </div>
      <h1 className="font-display text-5xl font-bold text-white">404</h1>
      <p className="mt-3 text-slate-400">This page doesn&apos;t exist or you don&apos;t have permission to view it.</p>
      <Link to="/" className="btn-primary mt-8">
        Go to Dashboard
      </Link>
    </div>
  );
}
