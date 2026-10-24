import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ChevronLeft,
  MapPin,
  Monitor,
  Store,
  Scale,
  Fuel,
  FileBarChart,
  ClipboardList,
  Factory,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkforce } from '../../context/WorkforceContext';
import { useLanguage } from '../../context/LanguageContext';
import { ROLES, ROLE_ROUTES } from '../../data/mockUsers';
import defaultLogo from '../../assets/logo.png';

const ALL_PLANT_OPERATIONS_ITEMS = [
  { 
    id: 'plant-dashboard', 
    label: 'Plant Dashboard', 
    icon: Gauge, 
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.DISPATCHER, ROLES.QC_ENGINEER, ROLES.SITE_SUPERVISOR] 
  },
  { 
    id: 'material-inward', 
    label: 'Material Inward', 
    icon: Layers, 
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.ACCOUNTANT] 
  },
  { 
    id: 'weighbridge', 
    label: 'Weighbridge', 
    icon: Scale, 
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.ACCOUNTANT] 
  },
  { 
    id: 'mix-design', 
    label: 'Mix Design', 
    icon: FlaskConical, 
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.QC_ENGINEER] 
  },
  { 
    id: 'batching-sheets', 
    label: 'Batching Sheets', 
    icon: ClipboardList, 
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.QC_ENGINEER] 
  },
  { 
    id: 'delivery-challans', 
    label: 'Delivery Challans', 
    icon: Truck, 
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.DISPATCHER, ROLES.ACCOUNTANT, ROLES.SITE_SUPERVISOR] 
  },
  { 
    id: 'vehicle-management', 
    label: 'Vehicle Management', 
    icon: Truck, 
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.DISPATCHER, ROLES.DRIVER] 
  },
  { 
    id: 'driver-trips', 
    label: 'Driver Trips', 
    icon: Navigation, 
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.DISPATCHER, ROLES.DRIVER, ROLES.SITE_SUPERVISOR] 
  },
  { 
    id: 'diesel-management', 
    label: 'Diesel Management', 
    icon: Fuel, 
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.ACCOUNTANT] 
  },
  { 
    id: 'plant-reports', 
    label: 'Plant Reports', 
    icon: FileBarChart, 
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.ACCOUNTANT, ROLES.QC_ENGINEER] 
  },
];

const getPlantOperationsForRole = (role) => {
  return ALL_PLANT_OPERATIONS_ITEMS.filter((item) => !item.roles || item.roles.includes(role) || role === ROLES.ADMIN);
};

const PORTAL_LINKS = [
  { role: ROLES.ADMIN, label: 'System Admin', path: '/admin', icon: Monitor, colorClass: 'bg-[#136dec]' },
  { role: ROLES.PLANT_MANAGER, label: 'Plant Manager', path: '/plant-manager', icon: Building2, colorClass: 'bg-[#059669]' },
  { role: ROLES.ACCOUNTANT, label: 'Accounts & Billing', path: '/accountant', icon: Store, colorClass: 'bg-[#f97316]' },
  { role: ROLES.DISPATCHER, label: 'Dispatch Operations', path: '/dispatcher', icon: Truck, colorClass: 'bg-[#6366f1]' },
  { role: ROLES.QC_ENGINEER, label: 'Quality Control', path: '/qc', icon: FlaskConical, colorClass: 'bg-[#eab308]' },
  { role: ROLES.SITE_SUPERVISOR, label: 'Site Supervisor', path: '/site-supervisor', icon: HardHat, colorClass: 'bg-[#0d9488]' },
  { role: ROLES.DRIVER, label: 'Driver Portal', path: '/driver', icon: Truck, colorClass: 'bg-[#f43f5e]' },
];

export default function Sidebar({ isOpen, isCollapsed = false, onClose, onToggle, activeTab, onSelectTab }) {
  const { user, logout, switchRole } = useAuth();
  const workforce = useWorkforce();
  const activeCompany = workforce?.activeCompany;
  const location = useLocation();
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  // Exactly one active portal determined strictly by current route or user role
  const activePortal = useMemo(() => {
    return (
      PORTAL_LINKS.find(
        (p) => location.pathname === p.path || (p.path !== '/' && location.pathname.startsWith(p.path))
      ) ||
      PORTAL_LINKS.find((p) => p.role === user?.role) ||
      PORTAL_LINKS[0]
    );
  }, [location.pathname, user?.role]);

  const [expandedGroups, setExpandedGroups] = useState({});
  const [hoveredFlyout, setHoveredFlyout] = useState(null);
  const flyoutTimerRef = useRef(null);

  const getNavItemsForRole = (role) => {
    const plantOps = getPlantOperationsForRole(role);
    const plantOpsGroup = plantOps.length > 0 ? {
      id: 'plant_operations_group',
      label: 'Plant Operations',
      icon: Factory,
      badge: plantOps.length,
      children: plantOps,
    } : null;

    switch (role) {
      case ROLES.ADMIN:
        return [
          { id: 'dashboard', label: 'System Administration', icon: ShieldCheck },
          { id: 'live-tracking', label: 'Live GPS Tracking', icon: MapPin },
          { 
            id: 'employees_group', 
            label: 'Employees', 
            icon: Users,
            badge: 4,
            children: [
              { id: 'employees', label: 'Directory Records', icon: Users },
              { id: 'attendance', label: 'Attendance System', icon: Clock },
              { id: 'live-tracking', label: 'Employee Locations', icon: MapPin },
              { id: 'shifts', label: 'Shifts & Roster', icon: Calendar },
              { id: 'payroll', label: 'Payroll Preparation', icon: Receipt },
              { id: 'advances', label: 'Salary Advances', icon: IndianRupee },
              { id: 'loans', label: 'Company Loans', icon: CreditCard },
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
          ...(plantOpsGroup ? [plantOpsGroup] : []),
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
          { id: 'reports', label: 'Crew & HR Reports', icon: FileText },
        ];

      case ROLES.ACCOUNTANT:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          ...(plantOpsGroup ? [plantOpsGroup] : []),
          { id: 'attendance', label: 'Daily Attendance', icon: Clock },
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
          ...(plantOpsGroup ? [plantOpsGroup] : []),
          { id: 'attendance', label: 'My Attendance', icon: Clock },
          { id: 'daily-work', label: 'Daily Dispatch Work', icon: Navigation },
          { id: 'leaves', label: 'Leave Requests', icon: Calendar },
        ];

      case ROLES.QC_ENGINEER:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          ...(plantOpsGroup ? [plantOpsGroup] : []),
          { id: 'attendance', label: 'My Attendance', icon: Clock },
          { id: 'daily-work', label: 'Daily QC Work', icon: FlaskConical },
          { id: 'leaves', label: 'Leave Requests', icon: Calendar },
          { id: 'documents', label: 'Certifications', icon: ShieldCheck },
        ];

      case ROLES.SITE_SUPERVISOR:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          ...(plantOpsGroup ? [plantOpsGroup] : []),
          { id: 'attendance', label: 'Team & My Attendance', icon: Clock },
          { id: 'daily-work', label: 'Daily Site Pouring', icon: Gauge },
          { id: 'leaves', label: 'Team Leave Requests', icon: Calendar },
        ];

      case ROLES.DRIVER:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          ...(plantOpsGroup ? [plantOpsGroup] : []),
          { id: 'attendance', label: 'Mobile Punch-In', icon: Clock },
          { id: 'daily-work', label: 'Trip Logs & TM Dispatches', icon: Truck },
          { id: 'leaves', label: 'Leave Requests', icon: Calendar },
        ];

      default:
        return [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }];
    }
  };

  const effectiveNavRole = activePortal?.role || user?.role || ROLES.ADMIN;
  const navItems = getNavItemsForRole(effectiveNavRole);

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
      left: rect.right + 10,
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

  const toggleCollapse = () => {
    if (onToggle) {
      onToggle();
    } else if (onClose) {
      onClose();
    }
  };

  const userInitials = user?.avatar || (user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'SA');

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 md:hidden"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`app-sidebar fixed top-0 bottom-0 left-0 z-50 h-[100dvh] max-h-[100dvh] bg-[#0c2340] text-white border-r border-[#153458] shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed
            ? '-translate-x-full md:translate-x-0 w-72 max-w-[85vw] md:w-[68px]'
            : (isOpen ? 'translate-x-0 w-72 max-w-[85vw]' : '-translate-x-full md:translate-x-0 w-72 max-w-[85vw]')
        }`}
      >
        {isCollapsed ? (
          /* ======================================================== */
          /* COLLAPSED MODE: CLEAN SLIM RAIL MATCHING REFERENCE IMAGE */
          /* ======================================================== */
          <>
            {/* Top: Expand Button & Logo */}
            <div className="pt-3 pb-2.5 px-2 border-b border-[#153458]/70 flex flex-col items-center gap-2.5 bg-[#0c2340] shrink-0">
              <button
                type="button"
                onClick={toggleCollapse}
                className="w-9 h-9 rounded-xl bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800/40 text-blue-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                title="Expand Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <Link 
                to={ROLE_ROUTES[user?.role] || '/'} 
                onMouseEnter={(e) => handleMouseEnter({ type: 'logo' }, e)}
                onMouseLeave={handleMouseLeave}
                className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm overflow-hidden border border-white/20 hover:scale-105 transition-transform"
                title={activeCompany?.name || "SM CONCRETECH"}
              >
                <img 
                  src={activeCompany?.logo || defaultLogo} 
                  alt={activeCompany?.name || "SM ConcreTech"} 
                  className="w-full h-full object-cover scale-[1.04]" 
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultLogo;
                  }}
                />
              </Link>
            </div>

            {/* Navigation Icons Only */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar py-3 px-2 flex flex-col items-center gap-1.5 w-full">
              {navItems.map((item) => {
                const count = item.children ? item.children.length : (item.badge || null);

                if (item.children && item.children.length > 0) {
                  const isChildActive = item.children.some((child) => child.id === activeTab);
                  const Icon = item.icon;

                  return (
                    <div key={item.id} className="relative">
                      <button
                        type="button"
                        onClick={() => selectTab(item.children[0].id)}
                        onMouseEnter={(e) => handleMouseEnter({ type: 'group', item }, e)}
                        onMouseLeave={handleMouseLeave}
                        className={`w-10 h-10 min-w-10 min-h-10 shrink-0 aspect-square rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                          isChildActive
                            ? 'bg-[#136dec] text-white shadow-md'
                            : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0 stroke-[1.8]" />
                      </button>
                      {count && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-[#0c2340] pointer-events-none font-mono">
                          {count}
                        </span>
                      )}
                    </div>
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
                    className={`w-10 h-10 min-w-10 min-h-10 shrink-0 aspect-square rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                      isActive
                        ? 'bg-[#136dec] text-white shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0 stroke-[1.8]" />
                  </button>
                );
              })}

              {/* Master Admin Portals - Icons Only */}
              {Boolean(user?.isMasterAdmin || user?.role === ROLES.ADMIN || user?.originalAdminUser) && (
                <>
                  <div className="w-7 h-[1px] bg-[#153458] my-2 shrink-0 rounded-full" />
                  <div className="w-full flex flex-col items-center gap-1.5 shrink-0">
                    {PORTAL_LINKS.map((portal) => {
                      const isCurrentRole = activePortal.path === portal.path;
                      const PortalIcon = portal.icon;
                      return (
                        <button
                          key={portal.path}
                          type="button"
                          onClick={() => {
                            if (isCurrentRole) return;
                            const nextPath = switchRole(portal.role) || portal.path;
                            if (nextPath) navigate(nextPath);
                            if (window.innerWidth < 768 && onClose) onClose();
                          }}
                          onMouseEnter={(e) => handleMouseEnter({ type: 'portal', label: portal.label, isCurrent: isCurrentRole }, e)}
                          onMouseLeave={handleMouseLeave}
                          className={`w-10 h-10 min-w-10 min-h-10 shrink-0 aspect-square rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                            isCurrentRole
                              ? 'bg-[#136dec] text-white shadow-md ring-2 ring-blue-400/40'
                              : 'hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg ${portal.colorClass} flex items-center justify-center shrink-0 shadow-xs`}>
                            <PortalIcon className="w-4 h-4 text-white stroke-[2]" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Bottom Footer - Avatar & Logout */}
            <div className="py-3 px-2 border-t border-[#153458]/70 bg-[#0c2340] shrink-0 flex flex-col items-center gap-2 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.5rem))]">
              <div 
                onMouseEnter={(e) => handleMouseEnter({ type: 'user' }, e)}
                onMouseLeave={handleMouseLeave}
                className="w-10 h-10 min-w-10 min-h-10 rounded-full bg-[#136dec] text-white text-xs font-bold flex items-center justify-center shadow-xs cursor-pointer relative shrink-0"
              >
                <span>{userInitials}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0c2340] absolute bottom-0 right-0 shadow-xs" />
              </div>

              <button
                type="button"
                onClick={logout}
                onMouseEnter={(e) => handleMouseEnter({ type: 'logout' }, e)}
                onMouseLeave={handleMouseLeave}
                className="w-10 h-10 min-w-10 min-h-10 rounded-xl flex items-center justify-center bg-blue-950/60 hover:bg-blue-900/60 text-slate-300 hover:text-white border border-blue-800/40 transition-all cursor-pointer shadow-xs shrink-0"
                title="Sign Out Session"
              >
                <LogOut className="w-4 h-4 stroke-[2]" />
              </button>
            </div>
          </>
        ) : (
          /* ======================================================== */
          /* EXPANDED MODE: FULL SIDEBAR MATCHING REFERENCE IMAGE     */
          /* ======================================================== */
          <>
            {/* Top: Logo & System Identity */}
            <div className="p-3.5 border-b border-[#153458]/70 flex items-center justify-between gap-2 bg-[#0c2340] shrink-0">
              <Link to={ROLE_ROUTES[user?.role] || '/'} className="flex items-center gap-3 min-w-0 flex-1 group">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm overflow-hidden border border-white/20 group-hover:scale-105 transition-transform">
                  <img 
                    src={activeCompany?.logo || defaultLogo} 
                    alt={activeCompany?.name || "SM ConcreTech"} 
                    className="w-full h-full object-cover scale-[1.04]" 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = defaultLogo;
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold tracking-wide text-white truncate uppercase">
                    {activeCompany?.name || "SM CONCRETE TECH"}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-100 truncate mt-0.5">
                    <MapPin className="w-3 h-3 text-[#38bdf8] shrink-0" />
                    <span className="truncate">{activeCompany?.location || "Tanang, Sangli"}</span>
                  </div>
                  <div className="text-[11px] font-bold text-[#93c5fd] truncate mt-0.5 uppercase tracking-wide">
                    {t(user?.role === ROLES.ADMIN ? 'Admin' : (user?.role || 'Admin'))}
                  </div>
                </div>
              </Link>

              {/* Collapse Button / Close Mobile */}
              <button
                type="button"
                onClick={toggleCollapse}
                className="w-8 h-8 rounded-xl bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800/40 text-blue-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs"
                title="Collapse Sidebar"
              >
                <span className="hidden md:block">
                  <ChevronLeft className="w-4 h-4" />
                </span>
                <span className="md:hidden">
                  <X className="w-4 h-4" />
                </span>
              </button>
            </div>

            {/* Navigation Section */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2.5 space-y-1">
              <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-300 font-mono">
                {t('Navigation')}
              </div>

              {navItems.map((item) => {
                // Group / Dropdown logic
                if (item.children && item.children.length > 0) {
                  const isExpanded = Boolean(expandedGroups[item.id]);
                  const isChildActive = item.children.some((child) => child.id === activeTab);
                  const Icon = item.icon;
                  const count = item.children.length;

                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer group ${
                          isChildActive
                            ? 'bg-[#136dec] text-white font-semibold shadow-md'
                            : 'text-slate-200 hover:text-white hover:bg-white/[0.06] font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 stroke-[1.9] ${
                            isChildActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                          }`} />
                          <span className="truncate text-xs sm:text-sm font-medium">{t(item.label)}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono ${
                            isChildActive ? 'bg-white/20 text-white' : 'bg-blue-600 text-white'
                          }`}>
                            {count}
                          </span>
                          <ChevronRight className={`w-4 h-4 transition-transform ${
                            isExpanded ? 'rotate-90 text-white' : (isChildActive ? 'text-white/80' : 'text-slate-400/40 group-hover:text-slate-300')
                          }`} />
                        </div>
                      </button>

                      {/* Collapsible Children List */}
                      {isExpanded && (
                        <div className="pl-3.5 space-y-1 ml-4 border-l border-blue-800/40 py-1">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const isChildSelected = activeTab === child.id;

                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => selectTab(child.id)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                                  isChildSelected
                                    ? 'bg-blue-600/30 text-white font-semibold border border-blue-500/40'
                                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <ChildIcon className={`w-3.5 h-3.5 shrink-0 ${isChildSelected ? 'text-blue-300' : 'text-slate-400'}`} />
                                  <span className="truncate text-xs sm:text-sm font-medium">{t(child.label)}</span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-[#136dec] text-white font-semibold shadow-md'
                        : 'text-slate-200 hover:text-white hover:bg-white/[0.06] font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 stroke-[1.9] ${
                        isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                      }`} />
                      <span className="truncate text-xs sm:text-sm font-medium">{t(item.label)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white font-mono">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-white/80' : 'text-slate-400/40 group-hover:text-slate-300'
                      }`} />
                    </div>
                  </button>
                );
              })}

              {/* Master Admin Portals Section */}
              {Boolean(user?.isMasterAdmin || user?.role === ROLES.ADMIN || user?.originalAdminUser) && (
                <div className="pt-3 mt-3 border-t border-[#153458]/70 space-y-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center justify-between">
                    <span>{t('Admin Portals')}</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-950/70 border border-blue-800/50 text-blue-300 text-[10px] font-bold tracking-wider">{t('ALL ACCESS')}</span>
                  </div>
                  <div className="space-y-0.5">
                    {PORTAL_LINKS.map((portal) => {
                      const isCurrentRole = activePortal.path === portal.path;
                      const PortalIcon = portal.icon;
                      return (
                        <button
                          key={portal.path}
                          type="button"
                          onClick={() => {
                            if (isCurrentRole) return;
                            const nextPath = switchRole(portal.role) || portal.path;
                            if (nextPath) navigate(nextPath);
                            if (window.innerWidth < 768 && onClose) onClose();
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer group ${
                            isCurrentRole
                              ? 'bg-[#136dec] text-white font-semibold shadow-md ring-1 ring-blue-400/30'
                              : 'text-slate-200 hover:text-white hover:bg-white/[0.06] font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg ${portal.colorClass} flex items-center justify-center shrink-0 shadow-xs`}>
                              <PortalIcon className="w-4 h-4 text-white stroke-[2]" />
                            </div>
                            <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{t(portal.label)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isCurrentRole && (
                              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-white/20 text-white tracking-wide">{t('Active')}</span>
                            )}
                            <ChevronRight className={`w-4 h-4 transition-colors ${
                              isCurrentRole ? 'text-white/80' : 'text-slate-400/40 group-hover:text-slate-300'
                            }`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Profile & Logout Section */}
            <div className="p-3 border-t border-[#153458]/70 bg-[#0c2340] shrink-0 space-y-2 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.5rem))]">
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-[#091b31]/90 border border-blue-900/40 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#136dec] text-white text-xs font-bold flex items-center justify-center shrink-0 relative shadow-xs">
                  <span>{userInitials}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#091b31] absolute bottom-0 right-0 shadow-xs" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-xs font-bold text-white truncate leading-tight">
                    {user?.name || 'System Administrator'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    {user?.employeeId || 'ADM-001'} • {user?.plant || user?.plantLocation || 'Main Plant HQ'}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-800/50 text-blue-200 text-[10px] font-semibold">
                    {t(user?.role === ROLES.ADMIN ? 'Admin' : (user?.role || 'Admin'))}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400/60" />
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-950/40 hover:bg-blue-900/40 border border-blue-800/50 hover:border-blue-700/70 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <LogOut className="w-4 h-4 text-slate-300 stroke-[2]" />
                <span className="tracking-wide">{t('Sign Out Session')}</span>
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Floating Hover Tooltips for Collapsed Icon Rail */}
      {isCollapsed && hoveredFlyout && (
        <>
          {/* Nav Item Tooltip */}
          {hoveredFlyout.type === 'item' && (
            <div
              style={{ top: `${hoveredFlyout.centerY}px`, left: `${hoveredFlyout.left}px` }}
              className="fixed -translate-y-1/2 z-[9999] pointer-events-none animate-fadeIn"
            >
              <div className="bg-[#091b31] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl border border-blue-900/60 whitespace-nowrap flex items-center gap-2">
                <span>{t(hoveredFlyout.item.label)}</span>
                {hoveredFlyout.item.badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold">
                    ({hoveredFlyout.item.badge})
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
              <div className="bg-[#0c2340] rounded-xl shadow-2xl border border-[#153458] p-2 min-w-[200px] space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 border-b border-[#153458] mb-1 flex items-center justify-between">
                  <span>{t(hoveredFlyout.item.label)}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold">
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
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          isChildSelected
                            ? 'bg-[#136dec] text-white font-semibold'
                            : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        <ChildIcon className={`w-3.5 h-3.5 shrink-0 ${isChildSelected ? 'text-white' : 'text-blue-300'}`} />
                        <span className="truncate">{t(child.label)}</span>
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
              <div className="bg-[#091b31] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl border border-blue-900/60 whitespace-nowrap flex items-center gap-2">
                <span>{t(hoveredFlyout.label)}</span>
                {hoveredFlyout.isCurrent && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#136dec] text-white font-semibold">
                    {t('Active')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* User Profile Tooltip */}
          {hoveredFlyout.type === 'user' && (
            <div
              style={{
                top: `${Math.max(10, hoveredFlyout.top - 40)}px`,
                left: `${hoveredFlyout.left}px`
              }}
              className="fixed z-[9999] pointer-events-none animate-fadeIn"
            >
              <div className="bg-[#091b31] text-white text-xs p-2.5 rounded-xl shadow-xl border border-blue-900/60 min-w-[180px] space-y-1">
                <div className="font-semibold flex items-center justify-between gap-2">
                  <span className="truncate">{user?.name || 'System Administrator'}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-950 border border-blue-800 text-blue-200 font-semibold">
                    {t(user?.role === ROLES.ADMIN ? 'Admin' : (user?.role || 'Admin'))}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                  <span className="text-blue-400 font-semibold">{user?.employeeId || 'ADM-001'}</span>
                  <span>•</span>
                  <span>{user?.plant || user?.plantLocation || 'Main Plant HQ'}</span>
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
              <div className="bg-[#091b31] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl border border-blue-900/60 whitespace-nowrap">
                <span>{t('Sign Out Session')}</span>
              </div>
            </div>
          )}

          {/* Top Logo Tooltip */}
          {hoveredFlyout.type === 'logo' && (
            <div
              style={{ top: `${hoveredFlyout.centerY}px`, left: `${hoveredFlyout.left}px` }}
              className="fixed -translate-y-1/2 z-[9999] pointer-events-none animate-fadeIn"
            >
              <div className="bg-[#091b31] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl border border-blue-900/60 whitespace-nowrap flex items-center gap-1.5">
                <span className="font-semibold text-white">{activeCompany?.name || "SM CONCRETE TECH"}</span>
                <span className="text-blue-300">— Ready Mix Concrete</span>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
