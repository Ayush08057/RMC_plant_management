import React from 'react';
import { Clock, ShieldCheck, CheckCircle2, User, Cpu } from 'lucide-react';

export default function ActivityTimeline({ title = 'Recent Plant Activity', activities = [] }) {
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'system':
        return <Cpu className="w-3.5 h-3.5 text-blue-400" />;
      case 'security':
        return <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <User className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white/92 backdrop-blur-md border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow w-full max-w-full overflow-hidden min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-cyan-700" />
          <span>{title}</span>
        </h3>
        <span className="text-[10px] text-slate-400 font-mono">LIVE LOG</span>
      </div>

      <div className="space-y-4">
        {activities.map((item, idx) => (
          <div key={item.id || idx} className="flex items-start gap-2.5 sm:gap-3 relative min-w-0">
            {/* Timeline connector bar */}
            {idx !== activities.length - 1 && (
              <span className="absolute left-3.5 top-6 bottom-0 w-px bg-slate-200" />
            )}

            {/* Icon Node */}
            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 z-10 shadow-2xs">
              {getIcon(item.type)}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-semibold text-slate-800 truncate">{item.user}</span>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">{item.time}</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">{item.action}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
