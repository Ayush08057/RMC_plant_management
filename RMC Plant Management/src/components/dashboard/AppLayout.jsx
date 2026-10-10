import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ 
  children, 
  title, 
  subtitle, 
  badge = null,
  activeTab = 'dashboard', 
  onSelectTab = () => {},
  actions = null,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const syncSidebarToViewport = (event) => setSidebarOpen(event.matches);

    desktopQuery.addEventListener('change', syncSidebarToViewport);
    return () => desktopQuery.removeEventListener('change', syncSidebarToViewport);
  }, []);

  return (
    <div className="app-shell relative min-h-screen w-full max-w-full overflow-x-hidden bg-slate-100/70 text-slate-900 flex flex-col antialiased selection:bg-cyan-600 selection:text-white">
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

      {/* Main Content Layout - Full Page Width Container */}
      <div className={`relative z-10 flex-1 flex flex-col transition-all duration-300 w-full max-w-full min-w-0 overflow-x-hidden ${
        sidebarOpen ? 'md:pl-64' : 'md:pl-0'
      }`}>
        {/* Top Header Bar */}
        <Header 
          onOpenSidebar={() => setSidebarOpen(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        {/* Operational Page Header Banner - Premium Executive Card Layout */}
        {(title || subtitle) && (
          <div className="px-3 sm:px-4 pt-3 pb-1">
            <div className="bg-gradient-to-r from-white via-slate-50/80 to-amber-50/40 rounded-2xl md:rounded-3xl border border-slate-200/90 px-4 sm:px-6 py-4 sm:py-5 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden backdrop-blur-md">
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500" />
              
              {/* Decorative Ambient Background Glows */}
              <div className="absolute -top-12 -right-12 w-56 h-56 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 right-36 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 relative z-10">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {badge && (
                      <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-100/90 text-amber-950 border border-amber-300/80 shadow-2xs tracking-wide flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-xs shadow-amber-500/50" />
                        <span>{badge}</span>
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full text-[10px] text-slate-800 font-mono font-black bg-slate-200/80 border border-slate-300/80 tracking-widest uppercase shadow-2xs">
                      RMC ENTERPRISE MODULE
                    </span>
                  </div>
                  
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                    {title}
                  </h1>
                  
                  {subtitle && (
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-4xl leading-relaxed font-medium">
                      {subtitle}
                    </p>
                  )}
                </div>

                {actions && (
                  <div className="flex items-center gap-2 flex-wrap shrink-0 mt-2 sm:mt-0">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page Inner Content - Full Width Flush Container */}
        <main className="flex-1 w-full max-w-full px-2 sm:px-3.5 md:px-4 py-3 space-y-3.5 sm:space-y-4 overflow-x-hidden min-w-0">
          {children}
        </main>

        {/* Operational Footer - Full Width */}
        <footer className="border-t border-slate-200 py-4 px-4 sm:px-6 bg-white text-center text-xs text-slate-500 w-full max-w-full">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-slate-700 font-semibold truncate">Plant Network SCADA Synchronized</span>
            </div>
            <div className="font-mono text-[10px] sm:text-[11px] text-slate-500 font-bold truncate">
              SM CONCRETECH • RMC OPS Enterprise v2.4
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
