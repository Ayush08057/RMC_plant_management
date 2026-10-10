import React from 'react';

export default function StatusBadge({ status, text, size = 'sm' }) {
  const norm = (status || text || '').toString().toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (
    norm.includes('pass') ||
    norm.includes('success') ||
    norm.includes('complete') ||
    norm.includes('approved') ||
    norm.includes('active') ||
    norm.includes('online') ||
    norm.includes('paid') ||
    norm.includes('optimal') ||
    norm.includes('delivered') ||
    norm.includes('healthy') ||
    norm.includes('on duty') ||
    norm.includes('ok')
  ) {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-300';
    dotColor = 'bg-emerald-500';
  } else if (
    norm.includes('pend') ||
    norm.includes('load') ||
    norm.includes('route') ||
    norm.includes('good') ||
    norm.includes('warn') ||
    norm.includes('assigned')
  ) {
    styles = 'bg-amber-50 text-amber-800 border-amber-300';
    dotColor = 'bg-amber-500';
  } else if (
    norm.includes('fail') ||
    norm.includes('overdue') ||
    norm.includes('delay') ||
    norm.includes('maint') ||
    norm.includes('reject') ||
    norm.includes('cancel') ||
    norm.includes('suspend') ||
    norm.includes('deactivate')
  ) {
    styles = 'bg-rose-50 text-rose-700 border-rose-300';
    dotColor = 'bg-rose-500';
  } else if (
    norm.includes('dispatch') ||
    norm.includes('arrive') ||
    norm.includes('standby') ||
    norm.includes('unload') ||
    norm.includes('info')
  ) {
    styles = 'bg-cyan-50 text-cyan-800 border-cyan-300';
    dotColor = 'bg-cyan-600';
  } else if (norm.includes('admin') || norm.includes('master') || norm.includes('enforce')) {
    styles = 'bg-purple-50 text-purple-700 border-purple-300';
    dotColor = 'bg-purple-500';
  }

  const sizeClasses = size === 'xs' 
    ? 'text-[10px] px-2 py-0.5' 
    : size === 'lg' 
      ? 'text-xs px-3.5 py-1 font-bold' 
      : 'text-[11px] px-2.5 py-0.5 font-bold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border shadow-2xs ${sizeClasses} ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0 animate-pulse`} />
      <span className="capitalize whitespace-nowrap">{text || status}</span>
    </span>
  );
}
