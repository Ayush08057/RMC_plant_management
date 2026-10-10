import React from 'react';

export default function LoadingSkeleton({ type = 'card', count = 1 }) {
  const items = Array.from({ length: count });

  if (type === 'kpi') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse shadow-sm">
            <div className="h-3 w-24 bg-slate-100 rounded mb-4" />
            <div className="h-8 w-32 bg-slate-200 rounded mb-3" />
            <div className="h-2.5 w-40 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-4 shadow-sm">
        <div className="h-4 w-48 bg-slate-200 rounded" />
        <div className="space-y-2">
          {items.map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-xl w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-white border border-slate-200 animate-pulse shadow-sm" />
      ))}
    </div>
  );
}
