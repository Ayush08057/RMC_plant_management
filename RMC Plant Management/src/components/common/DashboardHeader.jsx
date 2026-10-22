import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LogOut,
  User,
  ChevronDown,
  ShieldCheck,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SYSTEM_ROLE_PROFILES, ROLE_ROUTES } from '../../data/mockUsers';
import defaultLogo from '../../assets/logo.png';

export default function DashboardHeader({ title, subtitle, roleTheme = 'amber' }) {
  const navigate = useNavigate();
  const { user, logout, switchRole } = useAuth();
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleQuickSwitchRole = (targetRole) => {
    setShowSwitchMenu(false);
    setMobileMenuOpen(false);
    const destination = switchRole(targetRole);
    navigate(destination);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-900/40 text-purple-300 border-purple-600/40';
      case 'Plant Manager':
        return 'bg-amber-900/40 text-amber-300 border-amber-600/40';
      case 'Accountant':
        return 'bg-emerald-900/40 text-emerald-300 border-emerald-600/40';
      case 'Dispatcher':
        return 'bg-blue-900/40 text-blue-300 border-blue-600/40';
      case 'QC Engineer':
        return 'bg-cyan-900/40 text-cyan-300 border-cyan-600/40';
      case 'Site Supervisor':
        return 'bg-orange-900/40 text-orange-300 border-orange-600/40';
      case 'Driver':
        return 'bg-yellow-900/40 text-yellow-300 border-yellow-600/40';
      case 'Owner / Director':
        return 'bg-rose-900/40 text-rose-300 border-rose-600/40';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200 border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">

          {/* Left: Brand & Plant Identity */}
          <div className="flex items-center gap-3">
            <Link to={ROLE_ROUTES[user?.role] || '/'} className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-xs transition-transform group-hover:scale-105">
                <img 
                  src={defaultLogo} 
                  alt="SM ConcreTech" 
                  className="w-full h-full object-cover scale-[1.04]" 
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultLogo;
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-amber-600 uppercase tracking-wider group-hover:text-amber-500 transition-colors">
                    SM CONCRETECH
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-300 font-bold">
                    RMC OPS
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-800 tracking-tight">
                  {title || 'Plant Management System'}
                </div>
              </div>
            </Link>
          </div>

          {/* Center/Right Desktop Controls */}
          <div className="hidden md:flex items-center gap-3">

            {/* Active User Information Card */}
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-extrabold text-xs flex items-center justify-center shadow-sm">
                {user?.avatar || 'AD'}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>{user?.name || 'Administrator'}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${getRoleBadgeColor(user?.role)}`}>
                    {user?.role || 'Admin'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                  <span className="font-mono">{user?.employeeId || 'ADM-001'}</span>
                  <span>•</span>
                  <span className="truncate max-w-[140px]">{user?.plantLocation || 'Main Plant'}</span>
                </div>
              </div>
            </div>

            {/* Quick Switch Role Tester Dropdown — Exclusively available to Admin Authority */}
            {(user?.role === 'Admin' || user?.isMasterAdmin || user?.originalAdminUser) && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Admin Authority: Switch role view to test other role dashboards"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin: Access Role</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showSwitchMenu && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border border-slate-200 shadow-2xl py-2 z-50">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                      Switch Active Session to Role:
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {SYSTEM_ROLE_PROFILES.map((profile) => (
                        <button
                          key={profile.role}
                          onClick={() => handleQuickSwitchRole(profile.role)}
                          className={`w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between transition-colors ${profile.role === user?.role ? 'bg-amber-50/60 font-semibold' : ''
                            }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-semibold text-slate-800 truncate">
                              {profile.title}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {profile.route}
                            </div>
                          </div>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${getRoleBadgeColor(profile.role)}`}>
                            {profile.role}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/50 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${getRoleBadgeColor(user?.role)}`}>
              {user?.role}
            </span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800 space-y-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs font-bold text-white">{user?.name}</div>
              <div className="text-[11px] text-slate-400 font-mono">{user?.employeeId} • {user?.plantLocation}</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 px-1">Switch Role View:</div>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {SYSTEM_ROLE_PROFILES.map((profile) => (
                  <button
                    key={profile.role}
                    onClick={() => handleQuickSwitchRole(profile.role)}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-left text-[11px]"
                  >
                    <div className="font-semibold text-slate-200 truncate">{profile.title}</div>
                    <div className="text-amber-400 text-[10px]">{profile.role}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-red-950/60 text-red-300 border border-red-800/60 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out Session</span>
            </button>
          </div>
        )}

      </div>
    </header>
  );
}
