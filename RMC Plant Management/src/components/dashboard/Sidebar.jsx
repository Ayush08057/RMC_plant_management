import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  Building2, 
  Activity, 
  FileText, 
  Settings, 
  LogOut, 
  Gauge, 
  Truck, 
  Receipt, 
  CreditCard, 
  IndianRupee, 
  Navigation, 
  FlaskConical, 
  CheckCircle2, 
  HardHat, 
  Layers, 
  Bell, 
  User, 
  FileCheck2, 
  Calendar, 
  Clock, 
  ChevronDown, 
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_ROUTES } from '../../data/mockUsers';

export default function Sidebar({ isOpen, isCollapsed = false, onClose, activeTab, onSelectTab }) {
  const { user, logout, switchRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [expandedGroups, setExpandedGroups] = useState({});
  const [hoveredFlyout, setHoveredFlyout] = useState(null);
  const flyoutTimerRef = useRef(null);

  const getNavItemsForRole = (role) => {
    switch (role) {
      case ROLES.ADMIN:
        return [
          { id: 'dashboard', label: 'System Administration', icon: ShieldCheck },
          { 
            id: 'employees_group', 
            label: 'Employees', 
            icon: Users,
            children: [
              { id: 'employees', label: 'Directory Records', icon: Users },
              { id: 'attendance', label: 'Attendance System', icon: Clock },
              { id: 'shifts', label: 'Shifts & Roster', icon: Calendar },
              { id: 'payroll', label: 'Payroll Preparation', icon: Receipt },
            ]
          },
          { id: 'billing', label: 'Cash Memos & Billing', icon: Receipt },
          { id: 'approvals', label: 'Approvals Hub', icon: FileCheck2 },
          { id: 'reports', label: 'HR Reports', icon: FileText },
          { id: 'documents', label: 'Documents Vault', icon: ShieldCheck },
          { id: 'audit', label: 'Audit Logs', icon: FileText },
          { id: 'settings', label: 'Settings', icon: Settings },
        ];

      case ROLES.PLANT_MANAGER:
      case ROLES.PLANT_INCHARGE:
      case ROLES.OPERATOR:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { 
            id: 'employees_group', 
            label: 'Employees', 
            icon: Users,
            children: [
              { id: 'employees', label: 'Plant Crew', icon: Users },
              { id: 'attendance', label: 'Attendance', icon: Clock },
              { id: 'shifts', label: 'Shift Roster', icon: Calendar },
            ]
          },
          { id: 'daily-work', label: 'Daily Work', icon: Gauge },
          { id: 'leaves', label: 'Leave Reviews', icon: FileCheck2 },
          { id: 'reports', label: 'Plant Reports', icon: FileText },
        ];

      case ROLES.ACCOUNTANT:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'billing', label: 'Cash Memo & Invoicing', icon: Receipt },
          { id: 'purchases', label: 'Plant Material Purchase', icon: Layers },
          { 
            id: 'employees_group', 
            label: 'Employees & Payroll', 
            icon: Users,
            children: [
              { id: 'payroll', label: 'Payroll Preparation', icon: Receipt },
              { id: 'advances', label: 'Salary Advances', icon: IndianRupee },
              { id: 'loans', label: 'Company Loans', icon: CreditCard },
            ]
          },
          { id: 'otp_audit', label: 'Owner OTP Audit', icon: ShieldCheck },
          { id: 'reports', label: 'Payroll Reports', icon: FileCheck2 },
        ];

      case ROLES.DISPATCHER:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'attendance', label: 'My Attendance', icon: Clock },
          { id: 'daily-work', label: 'Daily Dispatch Work', icon: Navigation },
          { id: 'leaves', label: 'Leave Requests', icon: Calendar },
        ];

      case ROLES.QC_ENGINEER:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'attendance', label: 'My Attendance', icon: Clock },
          { id: 'daily-work', label: 'Daily QC Work', icon: FlaskConical },
          { id: 'leaves', label: 'Leave Requests', icon: Calendar },
          { id: 'documents', label: 'Certifications', icon: ShieldCheck },
        ];

      case ROLES.SITE_SUPERVISOR:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'attendance', label: 'Team Attendance', icon: Clock },
          { id: 'daily-work', label: 'Daily Site Pouring', icon: Gauge },
          { id: 'leaves', label: 'Team Leave Requests', icon: Calendar },
        ];

      case ROLES.DRIVER:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'attendance', label: 'Mobile Punch-In', icon: Clock },
          { id: 'daily-work', label: 'Trip Logs & TM Dispatches', icon: Truck },
          { id: 'leaves', label: 'Leave Requests', icon: Calendar },
        ];

      case ROLES.OWNER_DIRECTOR:
        return [
          { id: 'dashboard', label: 'Executive Cockpit', icon: Building2 },
          { id: 'billing', label: 'Revenue & Cash Flow', icon: IndianRupee },
          { id: 'payroll', label: 'Workforce & Payroll Costs', icon: Users },
          { id: 'approvals', label: 'High-Value Authorizations', icon: FileCheck2 },
          { id: 'audit', label: 'Governance & Audits', icon: ShieldCheck },
        ];

      default:
        return [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }];
    }
  };

  const navItems = getNavItemsForRole(user?.role);

  // Auto-expand group containing the activeTab
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children && item.children.some((child) => child.id === activeTab)) {
        setExpandedGroups((prev) => ({ ...prev, [item.id]: true }));
      }
    });
  }, [activeTab]);

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleMouseEnter = (info, event) => {
    if (!isCollapsed) return;
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current);
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredFlyout({
      ...info,
      top: rect.top,
      centerY: rect.top + rect.height / 2,
      left: rect.right + 8,
    });
  };

  const handleMouseLeave = () => {
    if (!isCollapsed) return;
    flyoutTimerRef.current = setTimeout(() => {
      setHoveredFlyout(null);
    }, 120);
  };

  const handleFlyoutMouseEnter = () => {
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current);
  };

  const handleFlyoutMouseLeave = () => {
    setHoveredFlyout(null);
  };

  const selectTab = (tabId) => {
    window.dispatchEvent(new Event('app:navigate'));
    if (onSelectTab) onSelectTab(tabId);
    if (window.innerWidth < 768 && onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`app-sidebar fixed top-0 bottom-0 left-0 z-50 h-screen max-h-screen bg-[#123B6D] text-white border-r border-[#1D5FA7]/40 shadow-xl flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed
            ? '-translate-x-full md:translate-x-0 w-64 md:w-[68px]'
            : (isOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 w-64')
        }`}
      >
        {isCollapsed ? (
          /* COLLAPSED MODE: STRICTLY ICONS */
          <>
            {/* Top: Logo Icon Only */}
            <div className="py-3 px-2 border-b border-[#1D5FA7]/30 flex items-center justify-center bg-[#123B6D] shrink-0">
              <Link 
                to={ROLE_ROUTES[user?.role] || '/'} 
                onMouseEnter={(e) => handleMouseEnter({ type: 'logo' }, e)}
                onMouseLeave={handleMouseLeave}
                className="w-11 h-11 rounded-xl bg-white border border-[#D4E4F7] shadow-2xs flex items-center justify-center shrink-0 hover:bg-[#F5F9FF] transition-colors cursor-pointer overflow-hidden p-0.5"
                title="SM CONCRETECH"
              >
                <img 
                  src="/logo.png" 
                  alt="SM ConcreTech" 
                  className="w-full h-full object-contain" 
                />
              </Link>
            </div>

            {/* Navigation Icons Only */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2 space-y-1 flex flex-col items-center">
              {navItems.map((item) => {
                if (item.children && item.children.length > 0) {
                  const isChildActive = item.children.some((child) => child.id === activeTab);
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectTab(item.children[0].id)}
                      onMouseEnter={(e) => handleMouseEnter({ type: 'group', item }, e)}
                      onMouseLeave={handleMouseLeave}
                      title={item.label}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer relative ${
                        isChildActive
                          ? 'bg-[#246BCE] text-white shadow-xs'
                          : 'text-[#EAF3FF]/80 hover:text-white hover:bg-[#1D5FA7]/40'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white ring-2 ring-[#123B6D]" />
                    </button>
                  );
                }

                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectTab(item.id)}
                    onMouseEnter={(e) => handleMouseEnter({ type: 'item', item }, e)}
                    onMouseLeave={handleMouseLeave}
                    title={item.label}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer relative ${
                      isActive
                        ? 'bg-[#246BCE] text-white shadow-xs'
                        : 'text-[#EAF3FF]/80 hover:text-white hover:bg-[#1D5FA7]/40'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                  </button>
                );
              })}

              {/* Master Admin Portals - Icons Only */}
              {Boolean(user?.isMasterAdmin || user?.role === ROLES.ADMIN || user?.originalAdminUser) && (
                <div className="w-full pt-2 mt-2 border-t border-[#1D5FA7]/30 flex flex-col items-center space-y-1">
                  {[
                    { role: ROLES.ADMIN, label: 'System Admin Console', path: '/admin', icon: ShieldCheck },
                    { role: ROLES.PLANT_MANAGER, label: 'Plant Manager Portal', path: '/plant-manager', icon: LayoutDashboard },
                    { role: ROLES.ACCOUNTANT, label: 'Accounts & Billing', path: '/accountant', icon: Receipt },
                    { role: ROLES.DISPATCHER, label: 'Logistics & Dispatch', path: '/dispatcher', icon: Navigation },
                    { role: ROLES.QC_ENGINEER, label: 'Concrete QC Lab', path: '/qc', icon: FlaskConical },
                    { role: ROLES.SITE_SUPERVISOR, label: 'Site Supervision', path: '/site-supervisor', icon: Gauge },
                    { role: ROLES.DRIVER, label: 'Driver Personal Portal', path: '/driver', icon: Truck },
                    { role: ROLES.OWNER_DIRECTOR, label: 'Executive Cockpit', path: '/owner', icon: Building2 },
                  ].map((portal) => {
                    const isCurrentRole = user?.role === portal.role || location.pathname === portal.path;
                    const PortalIcon = portal.icon;
                    return (
                      <button
                        key={portal.path}
                        type="button"
                        onClick={() => {
                          const nextPath = switchRole(portal.role);
                          if (nextPath) navigate(nextPath);
                          if (window.innerWidth < 768 && onClose) onClose();
                        }}
                        onMouseEnter={(e) => handleMouseEnter({ type: 'portal', label: portal.label, isCurrent: isCurrentRole }, e)}
                        onMouseLeave={handleMouseLeave}
                        title={portal.label}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                          isCurrentRole
                            ? 'bg-[#246BCE] text-white shadow-xs'
                            : 'text-[#EAF3FF]/80 hover:text-white hover:bg-[#1D5FA7]/40'
                        }`}
                      >
                        <PortalIcon className="w-5 h-5 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Footer - Icons Only */}
            <div className="p-2 border-t border-[#1D5FA7]/30 bg-[#0d2e57] shrink-0 flex flex-col items-center space-y-1.5">
              <div 
                onMouseEnter={(e) => handleMouseEnter({ type: 'user' }, e)}
                onMouseLeave={handleMouseLeave}
                className="w-9 h-9 rounded-lg bg-[#1D5FA7] text-white text-xs font-bold flex items-center justify-center shadow-2xs cursor-pointer border border-[#D4E4F7]/30"
                title={`${user?.name || 'User'} (${user?.role || ''})`}
              >
                {user?.avatar || 'US'}
              </div>
              <button
                type="button"
                onClick={logout}
                onMouseEnter={(e) => handleMouseEnter({ type: 'logout' }, e)}
                onMouseLeave={handleMouseLeave}
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#123B6D] hover:bg-[#1D5FA7] text-[#EAF3FF] hover:text-white border border-[#1D5FA7]/50 transition-colors cursor-pointer shadow-2xs"
                title="Sign Out Session"
              >
                <LogOut className="w-[18px] h-[18px]" />
              </button>
            </div>
          </>
        ) : (
          /* EXPANDED MODE: FULL SIDEBAR */
          <>
            {/* Top: Logo & System Identity */}
            <div className="py-3 px-3.5 border-b border-[#1D5FA7]/30 flex items-center justify-between bg-[#123B6D] shrink-0">
              <Link to={ROLE_ROUTES[user?.role] || '/'} className="flex items-center gap-2.5 w-full">
                <div className="w-11 h-11 rounded-xl bg-white border border-[#D4E4F7] shadow-2xs flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                  <img 
                    src="/logo.png" 
                    alt="SM ConcreTech" 
                    className="w-full h-full object-contain" 
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="sidebar-label text-xs font-bold tracking-wider text-white truncate">SM CONCRETECH</span>
                  </div>
                  <div className="text-[10px] font-semibold text-[#D4E4F7]/90 font-mono tracking-wider">
                    READY MIX CONCRETE
                  </div>
                  <div className="sidebar-label text-[10px] font-semibold truncate text-[#EAF3FF] mt-0.5">
                    {user?.role || 'Portal'}
                  </div>
                </div>
              </Link>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2 space-y-0.5">
              <div className="sidebar-label px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-[#D4E4F7]/80">
                Navigation
              </div>

              {navItems.map((item) => {
                // Group / Dropdown logic
                if (item.children && item.children.length > 0) {
                  const isExpanded = Boolean(expandedGroups[item.id]);
                  const isChildActive = item.children.some((child) => child.id === activeTab);
                  const Icon = item.icon;

                  return (
                    <div key={item.id} className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer group ${
                          isChildActive
                            ? 'bg-[#246BCE] text-white font-semibold shadow-xs'
                            : 'text-[#EAF3FF]/90 hover:text-white hover:bg-[#1D5FA7]/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`w-[18px] h-[18px] shrink-0 ${
                            isChildActive ? 'text-white' : 'text-[#D4E4F7] group-hover:text-white'
                          }`} />
                          <span className="sidebar-label truncate text-[11px]">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#1D5FA7]/60 text-[#EAF3FF] border border-[#D4E4F7]/20 font-semibold">
                            {item.children.length}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-[#D4E4F7] group-hover:text-white transition-transform" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-[#D4E4F7] group-hover:text-white transition-transform" />
                          )}
                        </div>
                      </button>

                      {/* Collapsible Children List */}
                      {isExpanded && (
                        <div className="pl-3 space-y-0.5 border-l border-[#1D5FA7]/40 ml-3 py-0.5 animate-fadeIn">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const isChildSelected = activeTab === child.id;

                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => selectTab(child.id)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                                  isChildSelected
                                    ? 'bg-[#1D5FA7] text-white font-semibold border border-[#D4E4F7]/30 shadow-2xs'
                                    : 'text-[#EAF3FF]/80 hover:text-white hover:bg-[#1D5FA7]/30 font-medium'
                                }`}
                              >
                                <ChildIcon className={`w-4 h-4 shrink-0 ${
                                  isChildSelected ? 'text-white' : 'text-[#D4E4F7]/70'
                                }`} />
                                <span className="sidebar-label truncate text-[11px]">{child.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Standard Navigation Item
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer group ${
                      isActive
                        ? 'bg-[#246BCE] text-white font-semibold shadow-xs'
                        : 'text-[#EAF3FF]/90 hover:text-white hover:bg-[#1D5FA7]/40 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`w-[18px] h-[18px] shrink-0 ${
                        isActive ? 'text-white' : 'text-[#D4E4F7] group-hover:text-white'
                      }`} />
                      <span className="sidebar-label truncate text-[11px]">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-[#1D5FA7]/60 text-[#EAF3FF] border border-[#D4E4F7]/20 font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Master Admin Cross-Role Operational Portals Hub */}
              {Boolean(user?.isMasterAdmin || user?.role === ROLES.ADMIN || user?.originalAdminUser) && (
                <div className="pt-2.5 mt-2.5 border-t border-[#1D5FA7]/30 space-y-1">
                  <div className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-[#D4E4F7]/80 flex items-center justify-between">
                    <span>Admin Portals</span>
                    <span className="px-1.5 py-0.2 rounded bg-[#1D5FA7]/60 text-[#EAF3FF] border border-[#D4E4F7]/20 text-[8px] font-semibold">ALL ACCESS</span>
                  </div>
                  <div className="space-y-0.5">
                    {[
                      { role: ROLES.ADMIN, label: 'System Admin Console', path: '/admin', icon: ShieldCheck },
                      { role: ROLES.PLANT_MANAGER, label: 'Plant Manager Portal', path: '/plant-manager', icon: LayoutDashboard },
                      { role: ROLES.ACCOUNTANT, label: 'Accounts & Billing', path: '/accountant', icon: Receipt },
                      { role: ROLES.DISPATCHER, label: 'Logistics & Dispatch', path: '/dispatcher', icon: Navigation },
                      { role: ROLES.QC_ENGINEER, label: 'Concrete QC Lab', path: '/qc', icon: FlaskConical },
                      { role: ROLES.SITE_SUPERVISOR, label: 'Site Supervision', path: '/site-supervisor', icon: Gauge },
                      { role: ROLES.DRIVER, label: 'Driver Personal Portal', path: '/driver', icon: Truck },
                      { role: ROLES.OWNER_DIRECTOR, label: 'Executive Cockpit', path: '/owner', icon: Building2 },
                    ].map((portal) => {
                      const isCurrentRole = user?.role === portal.role || location.pathname === portal.path;
                      const PortalIcon = portal.icon;
                      return (
                        <button
                          key={portal.path}
                          type="button"
                          onClick={() => {
                            const nextPath = switchRole(portal.role);
                            if (nextPath) navigate(nextPath);
                            if (window.innerWidth < 768 && onClose) onClose();
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            isCurrentRole
                              ? 'bg-[#246BCE] text-white font-semibold shadow-xs'
                              : 'text-[#EAF3FF]/80 hover:text-white hover:bg-[#1D5FA7]/40'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <PortalIcon className={`w-4 h-4 shrink-0 ${isCurrentRole ? 'text-white' : 'text-[#D4E4F7]'}`} />
                            <span className="truncate text-[11px]">{portal.label}</span>
                          </div>
                          {isCurrentRole && (
                            <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-white/20 text-white font-semibold">Active</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Profile & Logout Footer */}
            <div className="p-2.5 border-t border-[#1D5FA7]/30 bg-[#0d2e57] shrink-0 space-y-1.5">
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#123B6D] border border-[#1D5FA7]/50 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-[#1D5FA7] text-white text-[11px] font-bold flex items-center justify-center shrink-0 border border-[#D4E4F7]/30">
                  {user?.avatar || 'US'}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="sidebar-label text-xs font-semibold truncate leading-tight text-white flex items-center justify-between gap-1">
                    <span className="truncate">{user?.name || 'User'}</span>
                    {user?.role && (
                      <span className="px-1.5 py-0.2 rounded bg-[#1D5FA7]/60 text-[#EAF3FF] border border-[#D4E4F7]/30 text-[9px] font-mono font-medium shrink-0">
                        {user.role}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-[#D4E4F7]/90 font-mono truncate mt-0.5">
                    <span className="text-[#EAF3FF] font-semibold truncate">{user?.employeeId || 'EMP-01'}</span>
                    <span>•</span>
                    <span className="truncate text-[#D4E4F7]">{user?.plant || user?.plantLocation || 'Main Plant'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1D5FA7] hover:bg-[#246BCE] text-white border border-[#D4E4F7]/30 transition-colors cursor-pointer shadow-2xs"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out Session</span>
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Floating Hover Tooltips / Flyout Menus for Collapsed Icon Rail */}
      {isCollapsed && hoveredFlyout && (
        <>
          {/* Single Item Tooltip */}
          {hoveredFlyout.type === 'item' && (
            <div
              style={{ top: `${hoveredFlyout.centerY}px`, left: `${hoveredFlyout.left}px` }}
              className="fixed -translate-y-1/2 z-[9999] pointer-events-none animate-fadeIn"
            >
              <div className="bg-[#123B6D] text-white text-xs font-medium px-2.5 py-1 rounded-md shadow-lg border border-[#1D5FA7] whitespace-nowrap flex items-center gap-2">
                <span>{hoveredFlyout.item.label}</span>
                {hoveredFlyout.item.badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1D5FA7] text-white border border-[#D4E4F7]/40 font-semibold">
                    {hoveredFlyout.item.badge}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Group Flyout Menu with Sub-Links */}
          {hoveredFlyout.type === 'group' && (
            <div
              style={{
                top: `${Math.min(hoveredFlyout.top, typeof window !== 'undefined' ? window.innerHeight - 280 : 300)}px`,
                left: `${hoveredFlyout.left}px`
              }}
              onMouseEnter={handleFlyoutMouseEnter}
              onMouseLeave={handleFlyoutMouseLeave}
              className="fixed z-[9999] animate-fadeIn"
            >
              <div className="bg-white rounded-xl shadow-xl border border-[#D4E4F7] p-2 min-w-[200px] space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#123B6D] border-b border-[#D4E4F7] mb-1 flex items-center justify-between">
                  <span>{hoveredFlyout.item.label}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#EAF3FF] text-[#1D5FA7] border border-[#D4E4F7] font-semibold">
                    {hoveredFlyout.item.children.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {hoveredFlyout.item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildSelected = activeTab === child.id;
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => {
                          selectTab(child.id);
                          setHoveredFlyout(null);
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          isChildSelected
                            ? 'bg-[#EAF3FF] text-[#123B6D] font-semibold border border-[#D4E4F7]'
                            : 'text-[#123B6D]/80 hover:text-[#123B6D] hover:bg-[#F5F9FF]'
                        }`}
                      >
                        <ChildIcon className={`w-3.5 h-3.5 shrink-0 ${isChildSelected ? 'text-[#1D5FA7]' : 'text-[#1D5FA7]/60'}`} />
                        <span className="truncate">{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Master Admin Portal Tooltip */}
          {hoveredFlyout.type === 'portal' && (
            <div
              style={{ top: `${hoveredFlyout.centerY}px`, left: `${hoveredFlyout.left}px` }}
              className="fixed -translate-y-1/2 z-[9999] pointer-events-none animate-fadeIn"
            >
              <div className="bg-[#123B6D] text-white text-xs font-medium px-2.5 py-1 rounded-md shadow-lg border border-[#1D5FA7] whitespace-nowrap flex items-center gap-2">
                <span>{hoveredFlyout.label}</span>
                {hoveredFlyout.isCurrent && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#246BCE] text-white border border-[#D4E4F7]/40 font-semibold">
                    Active
                  </span>
                )}
              </div>
            </div>
          )}

          {/* User Profile Card */}
          {hoveredFlyout.type === 'user' && (
            <div
              style={{
                top: `${Math.max(10, hoveredFlyout.top - 40)}px`,
                left: `${hoveredFlyout.left}px`
              }}
              className="fixed z-[9999] pointer-events-none animate-fadeIn"
            >
              <div className="bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-xl border border-slate-800 min-w-[180px] space-y-1">
                <div className="font-semibold flex items-center justify-between gap-2">
                  <span className="truncate">{user?.name || 'User'}</span>
                  {user?.role && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                      {user.role}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                  <span className="text-blue-400 font-semibold">{user?.employeeId || 'EMP-01'}</span>
                  <span>•</span>
                  <span>{user?.plant || user?.plantLocation || 'Main Plant'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Logout Tooltip */}
          {hoveredFlyout.type === 'logout' && (
            <div
              style={{ top: `${hoveredFlyout.centerY}px`, left: `${hoveredFlyout.left}px` }}
              className="fixed -translate-y-1/2 z-[9999] pointer-events-none animate-fadeIn"
            >
              <div className="bg-slate-900 text-white text-xs font-medium px-2.5 py-1 rounded-md shadow-lg border border-slate-800 whitespace-nowrap">
                <span>Sign Out Session</span>
              </div>
            </div>
          )}

          {/* Top Logo Tooltip */}
          {hoveredFlyout.type === 'logo' && (
            <div
              style={{ top: `${hoveredFlyout.centerY}px`, left: `${hoveredFlyout.left}px` }}
              className="fixed -translate-y-1/2 z-[9999] pointer-events-none animate-fadeIn"
            >
              <div className="bg-slate-900 text-white text-xs font-medium px-2.5 py-1 rounded-md shadow-lg border border-slate-800 whitespace-nowrap flex items-center gap-1.5">
                <span className="font-semibold text-white">SM CONCRETECH</span>
                <span className="text-slate-400">— Ready Mix Concrete</span>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
