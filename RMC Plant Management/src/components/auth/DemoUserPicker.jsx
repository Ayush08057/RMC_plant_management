import React from 'react';
import { ShieldCheck, UserCheck, Sparkles, ChevronRight } from 'lucide-react';
import { SYSTEM_ADMIN, SYSTEM_ROLE_PROFILES } from '../../data/mockUsers';

export default function DemoUserPicker({ onSelectUser, activeRole }) {
  const rolePresets = [
    { role: 'Admin', label: 'Admin', email: 'smconcretech@gmail.com', password: 'sm1234', badge: 'ROOT' },
    { role: 'Plant Manager', label: 'Plant Mgr', email: 'plantmanager@smconcretech.com', password: 'sm1234', badge: 'OPS' },
    { role: 'Accountant', label: 'Accounts', email: 'accountant@smconcretech.com', password: 'sm1234', badge: 'FIN' },
    { role: 'Dispatcher', label: 'Dispatcher', email: 'dispatcher@smconcretech.com', password: 'sm1234', badge: 'LOG' },
    { role: 'QC Engineer', label: 'QC Tech', email: 'qc@smconcretech.com', password: 'sm1234', badge: 'LAB' },
    { role: 'Site Supervisor', label: 'Supervisor', email: 'sitesupervisor@smconcretech.com', password: 'sm1234', badge: 'SITE' },
    { role: 'Driver', label: 'Driver', email: 'driver@smconcretech.com', password: 'sm1234', badge: 'FLEET' },
    { role: 'Owner / Director', label: 'Director', email: 'owner@smconcretech.com', password: 'sm1234', badge: 'EXEC' },
  ];

  return (
    <div className="w-full mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            1-Click Demo Role Launcher
          </span>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
          Auto-fill Credentials
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
                  : 'bg-slate-900/40 hover:bg-slate-800/80 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-mono font-bold px-1 rounded ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
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

      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Password: <strong className="text-slate-200">sm1234</strong></span>
        </span>
        <span className="text-slate-500">Click any role to populate</span>
      </div>
    </div>
  );
}
