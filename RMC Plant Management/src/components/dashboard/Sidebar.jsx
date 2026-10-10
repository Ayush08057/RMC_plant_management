import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  const { user, logout } = useAuth();
  const location = useLocation();

  const [expandedGroups, setExpandedGroups] = useState({ employees_group: true });

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
        className={`app-sidebar fixed top-0 bottom-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-md border-r border-slate-200/90 shadow-xl flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & System Identity */}
        <div>
          <div className="h-16 px-5 border-b border-slate-200/90 flex items-center justify-between bg-white">
            <Link to={ROLE_ROUTES[user?.role] || '/'} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 to-amber-200 shadow-sm flex items-center justify-center shrink-0">
                <img src="/logo.png" alt="SM ConcreTech" className="w-full h-full object-contain rounded-full drop-shadow-xs" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="sidebar-label text-xs font-black tracking-wider font-mono">SM CONCRETECH</span>
                  <span className="text-[9px] font-mono px-1 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold">RMC</span>
                </div>
                <div className="sidebar-label text-[11px] font-bold truncate max-w-[130px]">
                  {user?.role || 'Portal'}
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="p-3 space-y-1.5 max-h-[calc(100vh-180px)] overflow-y-auto custom-scroll">
            <div className="sidebar-label px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest">
              Navigation Module
            </div>

            {navItems.map((item) => {
              // Group / Dropdown logic
              if (item.children && item.children.length > 0) {
                const isExpanded = Boolean(expandedGroups[item.id]);
                const isChildActive = item.children.some((child) => child.id === activeTab);
                const Icon = item.icon;

                return (
                  <div key={item.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer group ${
                        isChildActive
                          ? 'bg-cyan-50/80 text-slate-900 border border-cyan-200/80 shadow-2xs'
                          : 'text-slate-900 hover:text-slate-950 hover:bg-slate-100 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                          isChildActive ? 'text-cyan-800' : 'text-slate-700 group-hover:text-cyan-800'
                        }`} />
                        <span className="sidebar-label truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-100/70 text-cyan-800 border border-cyan-200 font-bold">
                          {item.children.length}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-700 group-hover:text-slate-950 transition-transform" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-950 transition-transform" />
                        )}
                      </div>
                    </button>

                    {/* Collapsible Children List */}
                    {isExpanded && (
                      <div className="pl-3.5 space-y-1 border-l-2 border-slate-200 ml-4 py-1 animate-fadeIn">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildSelected = activeTab === child.id;

                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => selectTab(child.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                                isChildSelected
                                  ? 'bg-cyan-50 text-slate-950 shadow-xs font-bold border border-cyan-200'
                                  : 'text-slate-900 hover:text-slate-950 hover:bg-slate-100 border border-transparent'
                              }`}
                            >
                              <ChildIcon className={`w-4 h-4 shrink-0 ${
                                isChildSelected ? 'text-cyan-900' : 'text-slate-700 group-hover:text-cyan-800'
                              }`} />
                              <span className="sidebar-label truncate">{child.label}</span>
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer group ${
                    isActive
                      ? 'bg-cyan-50 text-slate-950 shadow-xs border border-cyan-200'
                      : 'text-slate-900 hover:text-slate-950 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                      isActive ? 'text-cyan-900' : 'text-slate-700 group-hover:text-cyan-800'
                    }`} />
                    <span className="sidebar-label truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                      isActive ? 'bg-cyan-100 text-cyan-950 border border-cyan-200 font-bold' : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Profile & Logout Footer */}
        <div className="p-3 border-t border-slate-200/90 bg-slate-50/60">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-slate-200 mb-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
              {user?.avatar || 'US'}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="sidebar-label text-xs font-bold truncate">{user?.name || 'User'}</div>
              <div className="text-[10px] text-cyan-700 font-mono font-bold truncate">{user?.employeeId || 'EMP-01'}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
