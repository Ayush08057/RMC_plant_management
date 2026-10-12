import React from 'react';
import { ShieldCheck, UserCheck, Sparkles, ChevronRight } from 'lucide-react';
import { SYSTEM_ADMIN, SYSTEM_ROLE_PROFILES, OFFICIAL_ROLE_ACCOUNTS } from '../../data/mockUsers';

export default function DemoUserPicker({ onSelectUser, activeRole }) {
  const rolePresets = OFFICIAL_ROLE_ACCOUNTS.map((acc) => ({
    role: acc.role,
    label: acc.name.split(' ')[0],
    email: acc.email,
    password: acc.password,
    badge: acc.badge,
  }));

  return (
    <div className="w-full mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Role Quick Launcher
          </span>
        </div>
        <span className="text-[10px] font-mono text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200 font-semibold">
          Authorized Test Roles
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {rolePresets.map((preset) => {
          const isActive = activeRole === preset.role;
          return (
            <button
              key={preset.role}
              type="button"
              onClick={() => onSelectUser(preset.email, preset.password, preset.role)}
              className={`p-2 rounded-xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02]'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-mono font-bold px-1 rounded ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {preset.badge}
                </span>
              </div>
              <div className="text-[11px] font-bold mt-1.5 truncate">
                {preset.label}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span className="flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Role Pre-fills Active Credentials</span>
        </span>
        <span className="text-slate-400">Click to select role</span>
      </div>
    </div>
  );
}
