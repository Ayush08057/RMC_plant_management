import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Factory, ShieldCheck, ArrowLeft, CheckCircle2, X } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../data/mockUsers';

export default function AppLayout({ 
  children, 
  title, 
  subtitle, 
  badge = null,
  activeTab = 'dashboard', 
  onSelectTab = () => {},
  actions = null,
}) {
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );
  const [loginToast, setLoginToast] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('rmc_login_toast');
      if (raw) {
        const data = JSON.parse(raw);
        if (Date.now() - (data.timestamp || 0) < 15000) {
          setLoginToast({
            title: data.title || 'User login successfully',
            userName: data.userName || user?.name,
            role: data.role || user?.role,
          });
        }
        sessionStorage.removeItem('rmc_login_toast');
      } else if (location.state?.loginSuccess) {
        setLoginToast({
          title: 'User login successfully',
          userName: location.state.userName || user?.name,
          role: location.state.userRole || user?.role,
        });
      }
    } catch {
      // ignore
    }
  }, [location.state, user]);

  useEffect(() => {
    if (!loginToast) return;
    const timer = setTimeout(() => {
      setLoginToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [loginToast]);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const syncSidebarToViewport = (event) => setSidebarOpen(event.matches);

    desktopQuery.addEventListener('change', syncSidebarToViewport);
    return () => desktopQuery.removeEventListener('change', syncSidebarToViewport);
  }, []);

  const isHomePage = !activeTab || activeTab === 'dashboard';

  return (
    <div className="app-shell relative h-screen max-h-screen w-screen max-w-full overflow-hidden bg-slate-100/70 text-slate-900 flex flex-col antialiased selection:bg-cyan-600 selection:text-white">
      {/* Background Subtle Mesh Radial Ambient Glow */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-70 transition-opacity duration-700"
        style={{
          background: `
            radial-gradient(ellipse at 15% 10%, rgba(6, 182, 212, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 85% 90%, rgba(59, 130, 246, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.04) 0%, transparent 60%)
          `
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 concrete-grid-bg opacity-30" />

      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
      />

      {/* Main Content Layout - Header strictly pinned at the top */}
      <div className={`relative z-10 flex-1 h-screen max-h-screen flex flex-col transition-all duration-300 w-full max-w-full min-w-0 overflow-hidden ${
        sidebarOpen ? 'md:pl-64' : 'md:pl-0'
      }`}>
        {/* Top Header Bar - Fixed strictly to the upper part */}
        <Header 
          onOpenSidebar={() => setSidebarOpen(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        {/* Professional Login Success Floating Toast Notification */}
        {loginToast && (
          <div className="fixed top-16 right-3 sm:right-6 z-50 max-w-sm w-[calc(100vw-24px)] animate-slide-in pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-emerald-300 p-3.5 shadow-2xl shadow-emerald-950/20 flex items-start gap-3 ring-4 ring-emerald-500/10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md ring-2 ring-emerald-300/50">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    AUTHENTICATED
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Just Now</span>
                </div>
                <div className="text-xs font-black text-slate-900 mt-1">
                  {loginToast.title || 'User login successfully'}
                </div>
                <p className="text-[11px] font-semibold text-slate-600 truncate mt-0.5">
                  Welcome back, {loginToast.userName || user?.name || 'Authorized User'} {loginToast.role ? `(${loginToast.role})` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLoginToast(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Admin Master Mode Inspection Indicator Banner */}
        {Boolean(user?.isMasterAdmin || user?.originalAdminUser) && user?.role !== ROLES.ADMIN && (
          <div className="px-2.5 sm:px-3.5 pt-1.5 shrink-0 animate-fadeIn">
            <div className="bg-gradient-to-r from-[#091538] via-[#0d2a7a] to-[#1d52ce] text-white px-3 py-1.5 rounded-xl border border-blue-400/40 flex items-center justify-between shadow-md shadow-blue-950/20 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0 shadow-xs shadow-cyan-300" />
                <span className="text-[11px] font-medium text-blue-100 truncate">
                  Master Admin Clearance Active • Viewing <strong className="text-white font-bold">{user?.role}</strong> Portal
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const returnPath = switchRole(ROLES.ADMIN);
                  if (returnPath) navigate(returnPath);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/30 text-[10px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Return to Admin Console</span>
              </button>
            </div>
          </div>
        )}

        {/* Operational Page Header Banner - Reference Styled Royal Navy Hero Card */}
        {(title || subtitle) && (
          <div className="px-2.5 sm:px-3.5 pt-2 pb-1 shrink-0">
            <div className="bg-gradient-to-br from-[#091538] via-[#0d2a7a] to-[#1d52ce] text-white rounded-2xl md:rounded-3xl p-3 sm:p-4 shadow-xl shadow-blue-950/25 border border-blue-500/30 relative overflow-hidden backdrop-blur-xl">
              {/* Subtle Ambient Glow & Industrial Factory Watermark */}
              <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-blue-400/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/[0.08] pointer-events-none hidden md:block">
                <Factory className="w-28 h-28" />
              </div>
              
              <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0 relative z-10">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {badge && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/15 text-blue-100 border border-white/25 shadow-2xs tracking-wide flex items-center gap-1.5 backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse shadow-xs shadow-cyan-300/50" />
                        <span>{badge}</span>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[9px] text-blue-100/90 font-mono font-bold bg-white/10 border border-white/20 tracking-widest uppercase backdrop-blur-md">
                      RMC ENTERPRISE MODULE
                    </span>
                  </div>
                  
                  <h1 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-snug truncate drop-shadow-sm">
                    {title}
                  </h1>
                  
                  {subtitle && (
                    <p className="text-[11px] sm:text-xs text-blue-100/85 font-medium truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>

                {actions && (
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page Inner Content - Only this area scrolls vertically */}
        <main className="flex-1 min-h-0 min-w-0 w-full max-w-full px-2 sm:px-3 py-1.5 overflow-y-auto overflow-x-hidden flex flex-col">
          {children}
        </main>

        {/* Pinned Operational Footer - Display Active Logged In Session Below */}
        <footer className="border-t border-slate-200 py-1.5 px-3 bg-white text-center text-[10px] text-slate-500 w-full max-w-full shrink-0 shadow-2xs">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="text-slate-700 font-semibold truncate text-[11px] flex items-center gap-1.5">
                <span className="text-slate-500 hidden sm:inline">Active Session:</span>
                <strong className="text-slate-900 font-bold truncate">{user?.name || 'Administrator'}</strong>
                {user?.role && (
                  <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-mono font-bold shrink-0">
                    {user.role}
                  </span>
                )}
                {user?.employeeId && (
                  <span className="text-slate-500 font-mono text-[10px] hidden md:inline">
                    [{user.employeeId}]
                  </span>
                )}
                <span className="text-slate-300 hidden lg:inline">•</span>
                <span className="text-slate-500 text-[10px] hidden lg:inline">
                  Plant: {user?.plant || user?.plantLocation || 'Main Plant Unit #01'}
                </span>
              </div>
            </div>
            <div className="font-mono text-[10px] text-slate-500 font-bold truncate flex items-center gap-2">
              <span className="hidden sm:inline text-emerald-600 font-semibold">● SCADA Connected</span>
              <span>SM CONCRETECH Enterprise v2.4</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
