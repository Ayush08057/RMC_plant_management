import React, { useState, useEffect } from 'react';
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
  DollarSign, 
  Navigation, 
  FlaskConical, 
  CheckCircle2, 
  HardHat, 
  Layers, 
  Bell, 
  Sliders, 
  User, 
  X,
  FileCheck2,
  Calendar,
  AlertTriangle,
  RotateCw,
  FolderTree,
  TrendingUp,
  MapPin,
  Clock,
  IndianRupee,
  ChevronDown,
  ChevronRight,
  PanelLeftClose
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_ROUTES } from '../../data/mockUsers';

export default function Sidebar({ isOpen, onClose, activeTab, onSelectTab }) {
  const { user, logout, switchRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [expandedGroups, setExpandedGroups] = useState({});

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
          { id: 'reports', label: 'HR Reports', icon: TrendingUp },
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
          { id: 'shifts', label: 'My Shift Timings', icon: Calendar },
          { id: 'daily-work', label: 'Daily Mixer Logs', icon: Truck },
          { id: 'leaves', label: 'Apply Leave', icon: Calendar },
          { id: 'advances', label: 'Request Advance', icon: IndianRupee },
          { id: 'documents', label: 'Driving License', icon: ShieldCheck },
        ];

      case ROLES.OWNER_DIRECTOR:
        return [
          { id: 'dashboard', label: 'Executive Cockpit', icon: LayoutDashboard },
          { 
            id: 'employees_group', 
            label: 'Employees', 
            icon: Users,
            children: [
              { id: 'employees', label: 'Workforce Roster', icon: Users },
              { id: 'attendance', label: 'Attendance Overview', icon: Clock },
              { id: 'payroll', label: 'Consolidated Payroll', icon: Receipt },
            ]
          },
          { id: 'billing', label: 'Billing & Owner OTPs', icon: Receipt },
          { id: 'reports', label: 'Executive HR Pack', icon: FileCheck2 },
        ];

      default:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ];
    }
  };

  const navItems = getNavItemsForRole(user?.role);

  // Auto-expand parent group if activeTab matches any of its children
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children && item.children.some((child) => child.id === activeTab)) {
        setExpandedGroups((prev) => ({ ...prev, [item.id]: true }));
      }
    });
  }, [activeTab, user?.role]);

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const selectTab = (tabId) => {
    window.dispatchEvent(new Event('app:navigate'));
    if (onSelectTab) onSelectTab(tabId);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container - Light Executive Theme */}
      <aside
        className={`app-sidebar fixed top-0 bottom-0 left-0 z-50 w-64 h-screen max-h-screen bg-white/95 backdrop-blur-md border-r border-slate-200/90 shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & System Identity */}
        <div className="py-3 px-3.5 border-b border-slate-200/90 flex items-center justify-between bg-white shrink-0">
          <Link to={ROLE_ROUTES[user?.role] || '/'} className="flex items-center gap-3 w-full">
            <div className="w-14 h-14 rounded-2xl bg-white p-1 border border-amber-300 shadow-md ring-2 ring-amber-400/25 flex items-center justify-center shrink-0 transition-transform hover:scale-105">
              <img 
                src="/logo.png" 
                alt="SM ConcreTech" 
                className="w-full h-full object-contain drop-shadow-xs" 
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="sidebar-label text-xs font-black tracking-wider font-mono text-slate-900 truncate">SM CONCRETECH</span>
              </div>
              <div className="text-[10px] font-bold text-amber-600 font-mono tracking-wider">
                READY MIX CONCRETE
              </div>
              <div className="sidebar-label text-[10px] font-semibold truncate text-slate-500 mt-0.5">
                {user?.role || 'Portal'}
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Items - Flexible middle taking available space */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2 space-y-0.5">
          <div className="sidebar-label px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400">
            Navigation Module
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer group ${
                      isChildActive
                        ? 'bg-blue-50/80 text-blue-950 border border-blue-200/80 shadow-2xs'
                        : 'text-slate-900 hover:text-slate-950 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                        isChildActive ? 'text-blue-700' : 'text-slate-700 group-hover:text-blue-700'
                      }`} />
                      <span className="sidebar-label truncate text-[11px]">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-100/70 text-blue-800 border border-blue-200 font-bold">
                        {item.children.length}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-950 transition-transform" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-950 transition-transform" />
                      )}
                    </div>
                  </button>

                  {/* Collapsible Children List */}
                  {isExpanded && (
                    <div className="pl-3 space-y-0.5 border-l-2 border-slate-200 ml-3.5 py-0.5 animate-fadeIn">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildSelected = activeTab === child.id;

                        return (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => selectTab(child.id)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                              isChildSelected
                                ? 'bg-blue-50 text-blue-950 shadow-xs font-bold border border-blue-200'
                                : 'text-slate-900 hover:text-slate-950 hover:bg-slate-100 border border-transparent'
                            }`}
                          >
                            <ChildIcon className={`w-3.5 h-3.5 shrink-0 ${
                              isChildSelected ? 'text-blue-700' : 'text-slate-700 group-hover:text-blue-700'
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer group ${
                  isActive
                    ? 'bg-blue-50 text-blue-950 shadow-xs border border-blue-200'
                    : 'text-slate-900 hover:text-slate-950 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-blue-700' : 'text-slate-700 group-hover:text-blue-700'
                  }`} />
                  <span className="sidebar-label truncate text-[11px]">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-blue-100 text-blue-950 border border-blue-200 font-bold' : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Master Admin Cross-Role Operational Portals Hub */}
          {Boolean(user?.isMasterAdmin || user?.role === ROLES.ADMIN || user?.originalAdminUser) && (
            <div className="pt-2.5 mt-2.5 border-t border-slate-200/90 space-y-1">
              <div className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-widest text-blue-700 flex items-center justify-between">
                <span>Master Admin Portals</span>
                <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[8px] font-bold">ALL ACCESS</span>
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
                        if (onClose) onClose();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrentRole
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 hover:text-blue-900 hover:bg-blue-50/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <PortalIcon className={`w-3.5 h-3.5 shrink-0 ${isCurrentRole ? 'text-white' : 'text-slate-500'}`} />
                        <span className="truncate text-[11px]">{portal.label}</span>
                      </div>
                      {isCurrentRole && (
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-white/20 text-white font-bold">Active</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Profile & Logout Footer - Complete Logged In Information Display */}
        <div className="p-2.5 border-t border-slate-200/90 bg-slate-50/80 shrink-0 space-y-1.5">
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-xs">
              {user?.avatar || 'US'}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="sidebar-label text-xs font-bold truncate leading-tight text-slate-900 flex items-center justify-between gap-1">
                <span className="truncate">{user?.name || 'User'}</span>
                {user?.role && (
                  <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-mono font-bold shrink-0">
                    {user.role}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono truncate mt-0.5">
                <span className="text-blue-700 font-bold truncate">{user?.employeeId || 'EMP-01'}</span>
                <span>•</span>
                <span className="truncate text-slate-600">{user?.plant || user?.plantLocation || 'Main Plant'}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
