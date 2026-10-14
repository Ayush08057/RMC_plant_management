import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, CheckCircle2, X } from 'lucide-react';
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

  return (
    <div className="app-shell relative h-screen max-h-screen w-screen max-w-full overflow-hidden bg-[#F5F9FF] text-[#123B6D] flex flex-col antialiased selection:bg-[#246BCE] selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={!sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
      />

      {/* Main Content Layout - Header strictly pinned at the top */}
      <div className={`relative z-10 flex-1 h-screen max-h-screen flex flex-col transition-all duration-300 w-full max-w-full min-w-0 overflow-hidden ${
        sidebarOpen ? 'md:pl-64' : 'md:pl-[68px]'
      }`}>
        {/* Top Header Bar - Fixed strictly to the upper part */}
        <Header 
          onOpenSidebar={() => setSidebarOpen(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        {/* Clean Enterprise Login Success Floating Toast Notification */}
        {loginToast && (
          <div className="fixed top-16 right-3 sm:right-6 z-50 max-w-sm w-[calc(100vw-24px)] animate-slide-in pointer-events-auto">
            <div className="bg-white rounded-xl border border-[#D4E4F7] p-3.5 shadow-md flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EAF3FF] text-[#1D5FA7] flex items-center justify-center shrink-0 border border-[#D4E4F7]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#123B6D] bg-[#EAF3FF] px-2 py-0.5 rounded border border-[#D4E4F7]">
                    AUTHENTICATED
                  </span>
                  <span className="text-[10px] text-[#1D5FA7] font-mono">Just Now</span>
                </div>
                <div className="text-xs font-bold text-[#123B6D] mt-1">
                  {loginToast.title || 'User login successfully'}
                </div>
                <p className="text-[11px] font-medium text-[#1D5FA7] truncate mt-0.5">
                  Welcome, {loginToast.userName || user?.name || 'Authorized User'} {loginToast.role ? `(${loginToast.role})` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLoginToast(null)}
                className="text-[#1D5FA7] hover:text-[#123B6D] p-1 rounded-lg hover:bg-[#EAF3FF] transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Admin Master Mode Inspection Indicator Banner */}
        {Boolean(user?.isMasterAdmin || user?.originalAdminUser) && user?.role !== ROLES.ADMIN && (
          <div className="px-3 sm:px-4 pt-2 shrink-0 animate-fadeIn">
            <div className="bg-[#EAF3FF] border border-[#D4E4F7] text-[#123B6D] px-3.5 py-1.5 rounded-xl flex items-center justify-between shadow-2xs text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#246BCE] shrink-0" />
                <span className="text-[11px] font-medium text-[#123B6D] truncate">
                  Master Admin Clearance Active • Viewing <strong className="font-semibold text-[#123B6D]">{user?.role}</strong> Portal
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const returnPath = switchRole(ROLES.ADMIN);
                  if (returnPath) navigate(returnPath);
                }}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EAF3FF] text-[#123B6D] border border-[#D4E4F7] text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Return to Admin Console</span>
              </button>
            </div>
          </div>
        )}

        {/* Professional Enterprise Page Title Bar - Clean & Compact */}
        {(title || actions) && (
          <div className="px-3 sm:px-4 pt-1.5 pb-0.5 shrink-0">
            <div className="bg-white border border-[#D4E4F7] rounded-lg px-3 py-1.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="text-xs sm:text-[13px] font-bold text-[#123B6D] tracking-tight truncate leading-tight">
                      {title}
                    </h1>
                    {badge && (
                      <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-[#EAF3FF] text-[#1D5FA7] border border-[#D4E4F7] shrink-0">
                        {badge}
                      </span>
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-[10px] sm:text-[10.5px] text-[#1D5FA7] font-normal truncate mt-0.5 leading-tight">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {actions && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Page Inner Content - Only this area scrolls vertically */}
        <main className="flex-1 min-h-0 min-w-0 w-full max-w-full px-3 sm:px-4 py-1.5 sm:py-2 overflow-y-auto overflow-x-hidden flex flex-col">
          {children}
        </main>

        {/* Pinned Operational Footer - Display Active Logged In Session Below */}
        <footer className="border-t border-[#D4E4F7] py-1.5 px-3 sm:px-4 bg-white text-center text-[10px] text-[#1D5FA7] w-full max-w-full shrink-0 shadow-2xs">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#246BCE] shrink-0" />
              <div className="text-[#123B6D] font-medium truncate text-[11px] flex items-center gap-1.5">
                <span className="text-[#1D5FA7] hidden sm:inline">Active Session:</span>
                <strong className="text-[#123B6D] font-semibold truncate">{user?.name || 'Administrator'}</strong>
                {user?.role && (
                  <span className="px-1.5 py-0.2 rounded bg-[#EAF3FF] text-[#1D5FA7] border border-[#D4E4F7] text-[10px] font-mono font-medium shrink-0">
                    {user.role}
                  </span>
                )}
                {user?.employeeId && (
                  <span className="text-[#1D5FA7] font-mono text-[10px] hidden md:inline">
                    [{user.employeeId}]
                  </span>
                )}
                <span className="text-[#D4E4F7] hidden lg:inline">•</span>
                <span className="text-[#1D5FA7] text-[10px] hidden lg:inline">
                  Plant: {user?.plant || user?.plantLocation || 'Main Plant Unit #01'}
                </span>
              </div>
            </div>
            <div className="font-mono text-[10px] text-[#1D5FA7] font-medium truncate flex items-center gap-2">
              <span className="hidden sm:inline text-[#1D5FA7] font-medium">● SCADA Connected</span>
              <span>SM CONCRETECH Enterprise v2.4</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
