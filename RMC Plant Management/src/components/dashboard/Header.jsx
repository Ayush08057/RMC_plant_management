import React, { useEffect, useState } from 'react';
import { Menu, Bell, UserCheck, ChevronDown, Sparkles, Check, Clock, CheckCircle2, Smartphone, PanelLeftOpen, PanelLeftClose, Building2, MapPin, Factory, Trash2, AlertTriangle, LogOut } from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ROLES, ROLE_ROUTES } from '../../data/mockUsers';
import Modal from './Modal';
import MobilePunchWidget from '../workforce/MobilePunchWidget';
import { formatToIndian12Hr } from '../../utils/shiftUtils';

export default function Header({ onOpenSidebar, onToggleSidebar, isSidebarOpen = true }) {
  const {
    notifications,
    markNotificationRead,
    clearNotifications,
    attendance,
    companies,
    plants,
    activeCompany,
    switchCompany,
    addCompany,
    removeCompany,
    addPlant,
  } = useWorkforce();
  const { user, switchRole, logout } = useAuth();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [showAddPlantModal, setShowAddPlantModal] = useState(false);
  const [showPlantPicker, setShowPlantPicker] = useState(false);
  const [plantToDelete, setPlantToDelete] = useState(null);
  const [plantForm, setPlantForm] = useState({
    kind: 'company',
    name: '',
    code: '',
    type: 'RMC Plant',
    location: '',
    capacity: '90 m³/hr',
    status: 'Online',
  });
  const [plantFormError, setPlantFormError] = useState('');

  const handleConfirmDeletePlant = (companyId) => {
    if (!companyId) return;
    try {
      removeCompany(companyId);
      setPlantToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to remove plant.');
    }
  };
  useEffect(() => {
    const closeHeaderPopovers = () => {
      setShowNotifications(false);
      setShowRolePicker(false);
      setShowPlantPicker(false);
    };
    window.addEventListener('app:modal-open', closeHeaderPopovers);
    return () => window.removeEventListener('app:modal-open', closeHeaderPopovers);
  }, []);

  const selectedCompany = activeCompany || companies[0] || {
    name: 'No company registered',
    location: '',
    type: 'Company',
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleList = [
    { role: ROLES.ADMIN, label: 'System Administrator', badge: 'ROOT', email: 'smconcretech@gmail.com', portal: '/admin', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { role: ROLES.PLANT_MANAGER, label: 'Plant Manager', badge: 'OPS', email: 'manager@smconcretech.com', portal: '/plant-manager', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { role: ROLES.ACCOUNTANT, label: 'Accountant', badge: 'FIN', email: 'accountant@smconcretech.com', portal: '/accountant', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { role: ROLES.DISPATCHER, label: 'Dispatcher', badge: 'LOG', email: 'dispatcher@smconcretech.com', portal: '/dispatcher', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { role: ROLES.QC_ENGINEER, label: 'QC Engineer', badge: 'LAB', email: 'qc@smconcretech.com', portal: '/qc', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { role: ROLES.SITE_SUPERVISOR, label: 'Site Supervisor', badge: 'SITE', email: 'supervisor@smconcretech.com', portal: '/site-supervisor', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { role: ROLES.DRIVER, label: 'Transit Mixer Driver', badge: 'FLEET', email: 'driver@smconcretech.com', portal: '/driver', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { role: ROLES.OWNER_DIRECTOR, label: 'Owner / Director', badge: 'EXEC', email: 'owner@smconcretech.com', portal: '/owner', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ];

  const handleRoleSelect = (targetRole) => {
    setShowRolePicker(false);
    const redirectPath = switchRole(targetRole);
    if (redirectPath) {
      navigate(redirectPath);
    }
  };

  const openAddPlantModal = () => {
    setPlantForm({
      kind: 'company',
      name: '',
      code: '',
      type: 'RMC Plant',
      location: '',
      capacity: '90 m³/hr',
      status: 'Online',
    });
    setPlantFormError('');
    setShowPlantPicker(false);
    setShowAddPlantModal(true);
  };

  const handleAddPlant = (event) => {
    event.preventDefault();
    const name = plantForm.name.trim();
    const requestedCode = plantForm.code.trim().toUpperCase();

    if (!name) {
      setPlantFormError('Enter a plant or company name.');
      return;
    }

    try {
      if (plantForm.kind === 'plant') {
        const baseCode = name.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'PLT';
        let code = requestedCode || baseCode;
        if (plants.some((plant) => (plant.name || '').trim().toLowerCase() === name.toLowerCase())) {
          setPlantFormError('A plant with this name already exists in this company.');
          return;
        }
        if (requestedCode && plants.some((plant) => (plant.code || '').trim().toUpperCase() === requestedCode)) {
          setPlantFormError('This plant code is already in use. Enter a different code.');
          return;
        }
        if (!requestedCode) {
          let suffix = 2;
          while (plants.some((plant) => (plant.code || '').trim().toUpperCase() === code)) {
            code = `${baseCode}${suffix}`;
            suffix += 1;
          }
        }
        addPlant({
          name,
          code,
          type: plantForm.type,
          location: plantForm.location.trim(),
          capacity: plantForm.capacity.trim() || '90 m³/hr',
          status: plantForm.status,
        });
        setPlantFormError('');
        setShowAddPlantModal(false);
        return;
      }

      const company = addCompany({
        name,
        code: requestedCode,
        type: plantForm.type,
        location: plantForm.location.trim(),
        capacity: plantForm.capacity.trim() || '90 m³/hr',
        status: plantForm.status,
      });
      setPlantFormError('');
      setShowAddPlantModal(false);
    } catch (error) {
      console.error('Failed to add company from the company selector:', error);
      setPlantFormError(`Could not add plant: ${error.message}`);
    }
  };

  const currentRoleObj = roleList.find((r) => r.role === user?.role) || roleList[0];

  const todayStr = new Date().toISOString().split('T')[0];
  const userTodayPunch = (attendance || []).find(
    (a) => (a.employeeId === user?.employeeId || a.employeeId === user?.id) && a.date === todayStr
  );
  const isPunchedIn = Boolean(userTodayPunch?.punchIn && !userTodayPunch?.punchOut);
  const isPunchedOut = Boolean(userTodayPunch?.punchIn && userTodayPunch?.punchOut);

  return (
    <>
      {/* Invisible Click-away Backdrop for Popovers — Zero Blur, Zero Dim */}
      {(showNotifications || showRolePicker || showPlantPicker) && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => {
            setShowNotifications(false);
            setShowRolePicker(false);
            setShowPlantPicker(false);
          }}
          aria-hidden="true"
        />
      )}

      <header className="sticky top-0 z-40 h-14 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs flex items-center justify-between px-2.5 sm:px-4 lg:px-6 gap-2 sm:gap-4">
        {/* Left: Hamburger / Toggle Sidebar Icon & Plant Selector & Role Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => (onToggleSidebar ? onToggleSidebar() : onOpenSidebar())}
            aria-label="Toggle sidebar menu"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors hover:border-blue-400/50 shadow-xs hover:bg-white shrink-0"
            title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            )}
          </button>

          {/* Plant / Company Selector */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowPlantPicker(!showPlantPicker);
                setShowRolePicker(false);
                setShowNotifications(false);
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200/90 text-slate-800 transition-all cursor-pointer shadow-xs hover:shadow-sm"
              title="Select Plant / Company"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Factory className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden md:block">
                <span className="text-[11px] font-bold text-slate-900 block leading-tight truncate max-w-[110px] lg:max-w-[140px]">{selectedCompany.name}</span>
                <span className="text-[10px] text-blue-700 font-medium hidden lg:flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate max-w-[90px]">{selectedCompany.location || 'Sangli'}</span>
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-blue-600 transition-transform ${showPlantPicker ? 'rotate-180' : ''}`} />
            </button>

            {/* Plant Picker Dropdown */}
            {showPlantPicker && (
              <div className="fixed inset-x-3 sm:inset-x-auto sm:left-0 sm:right-auto top-14 sm:top-full mt-1.5 sm:mt-2 w-auto sm:w-80 max-w-[calc(100vw-24px)] sm:max-w-[21.5rem] rounded-2xl bg-white border border-slate-200 text-slate-800 shadow-2xl p-3 sm:p-3.5 z-50 animate-fade-in text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">Select Plant / Company</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-mono font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Active</span>
                </div>

                <div className="space-y-1.5 max-h-[70vh] sm:max-h-72 overflow-y-auto pr-1">
                  {companies.map((company) => {
                    const isActive = selectedCompany.id === company.id;
                    return (
                      <div
                        key={company.id}
                        className={`group w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between border ${
                          isActive
                            ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            switchCompany(company.id);
                            setShowPlantPicker(false);
                          }}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-xs shrink-0 ${
                            isActive
                              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            <Factory className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1 pr-1">
                            <span className={`block font-bold text-xs truncate ${isActive ? 'text-blue-950 font-black' : 'text-slate-900 font-semibold'}`}>{company.name}</span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{company.location || 'Company workspace'}</span>
                            </span>
                            <span className="text-[9px] text-slate-600 font-mono block">{company.type || 'Company'}</span>
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {isActive && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                          {companies.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlantToDelete(company);
                              }}
                              title={`Remove ${company.name}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={openAddPlantModal}
                    className="w-full p-2 rounded-xl text-center text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                  >
                    + Add New Plant / Company
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Role Switcher Pill Trigger — Exclusively available to Admin Authority */}
          {(user?.role === ROLES.ADMIN || user?.isMasterAdmin || user?.originalAdminUser) ? (
            <div className="relative shrink-0 flex items-center">
              <button
                type="button"
                onClick={() => {
                  setShowRolePicker(!showRolePicker);
                  setShowNotifications(false);
                  setShowPlantPicker(false);
                }}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 transition-all cursor-pointer shadow-xs hover:shadow-sm hover:border-blue-400/50"
                title="Admin Master Authority: Switch & Access Any Role"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[9px] sm:text-[10px] shadow-xs shrink-0">
                  {user?.avatar || 'SA'}
                </div>
                <div className="text-left hidden md:block">
                  <span className="text-[11px] font-bold text-slate-900 block leading-tight truncate max-w-[110px] lg:max-w-[130px]">
                    {user?.originalAdminUser?.name || user?.name || 'System Admin'}
                  </span>
                  <span className="text-[10px] text-blue-600 font-mono font-bold block truncate">
                    {user?.role !== ROLES.ADMIN ? 'Viewing Portal' : 'Master Authority'}
                  </span>
                </div>
                <span className={`text-[9px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full border ${currentRoleObj.color}`}>
                  {currentRoleObj.badge}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showRolePicker ? 'rotate-180' : ''}`} />
              </button>

              {/* Role Switcher Dropdown Menu */}
              {showRolePicker && (
                <div className="fixed inset-x-3 sm:inset-x-auto sm:left-0 sm:right-auto top-14 sm:top-full mt-1.5 sm:mt-2 w-auto sm:w-80 max-w-[calc(100vw-24px)] sm:max-w-none rounded-2xl bg-white border border-slate-200 text-slate-800 shadow-2xl p-3 sm:p-3.5 z-50 animate-fade-in text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">Admin Master Role Hub</span>
                    </div>
                    {user?.role !== ROLES.ADMIN && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowRolePicker(false);
                          const adminPath = switchRole(ROLES.ADMIN);
                          if (adminPath) navigate(adminPath);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-mono text-[9px] font-bold cursor-pointer"
                      >
                        Return to Admin
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-[70vh] sm:max-h-96 overflow-y-auto pr-1">
                    {roleList.map((r) => {
                      const isActive = user?.role === r.role;
                      return (
                        <button
                          key={r.role}
                          type="button"
                          onClick={() => handleRoleSelect(r.role)}
                          className={`w-full p-2.5 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between border ${
                            isActive
                              ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-xs font-bold'
                              : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 font-medium'
                          }`}
                        >
                          <div className="min-w-0 pr-2 flex-1">
                            <span className={`block font-bold text-xs truncate ${isActive ? 'text-blue-950' : 'text-slate-900'}`}>{r.label}</span>
                            <span className={`text-[10px] font-mono block truncate ${isActive ? 'text-blue-700 font-bold' : 'text-blue-600'}`}>{r.email}</span>
                            <span className="text-[9px] text-slate-500 font-mono block mt-0.5 truncate">
                              Portal: <span className="font-semibold text-slate-600 font-mono">{r.portal}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${r.color}`}>
                              {r.badge}
                            </span>
                            {isActive && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 shrink-0 shadow-2xs">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[9px] sm:text-[10px] shadow-xs shrink-0">
                {user?.avatar || 'US'}
              </div>
              <div className="text-left hidden md:block">
                <span className="text-[11px] font-bold text-slate-900 block leading-tight truncate max-w-[110px]">{user?.name}</span>
                <span className="text-[10px] text-slate-500 font-mono font-bold block truncate">{user?.role}</span>
              </div>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${currentRoleObj.color}`}>
                {currentRoleObj.badge}
              </span>
            </div>
          )}
        </div>

        {/* Right: Notifications & Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Live Employee Punch Status Badge */}
          {isPunchedIn ? (
            <button
              type="button"
              onClick={() => setShowPunchModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px] sm:text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              title="Active on Duty. Click to view live telemetry or punch out."
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline">On Duty</span>
              <span>In: {formatToIndian12Hr(userTodayPunch.punchIn)}</span>
            </button>
          ) : isPunchedOut ? (
            <button
              type="button"
              onClick={() => setShowPunchModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 font-mono text-[11px] sm:text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              title="Shift complete for today."
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">Shift Done:</span>
              <span>{userTodayPunch.workingHours}h</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowPunchModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px] sm:text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              title="Click to Clock In with live GPS & geofencing"
            >
              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px] sm:text-xs">Punch In</span>
            </button>
          )}

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                const nextState = !showNotifications;
                setShowNotifications(nextState);
                setShowRolePicker(false);
                setShowPlantPicker(false);
                if (nextState && unreadCount > 0) {
                  notifications.filter((n) => !n.read).forEach((n) => markNotificationRead(n.id));
                }
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-800 hover:text-blue-950 relative cursor-pointer hover:border-blue-400 hover:bg-blue-100/60 shadow-xs transition-colors shrink-0"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
                </>
              )}
            </button>

            {showNotifications && (
              <div className="fixed inset-x-3 sm:inset-x-auto sm:right-0 sm:left-auto top-14 sm:top-full mt-1.5 sm:mt-2 w-auto sm:w-80 max-w-[calc(100vw-24px)] sm:max-w-xs rounded-2xl bg-white border border-slate-200 text-slate-800 shadow-2xl p-3 sm:p-3.5 z-50 animate-fade-in text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                  <span className="text-xs font-bold text-slate-900">Notifications ({notifications.length})</span>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearNotifications}
                      className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline font-mono font-bold cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-[70vh] sm:max-h-64 overflow-y-auto pr-0.5">
                  {notifications.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">No new notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                          n.read
                            ? 'bg-slate-50 border-slate-200 opacity-60'
                            : 'bg-blue-50/70 border-blue-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">{n.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed break-words">{n.desc}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Direct Sign Out in Header */}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="Sign Out of active session"
            aria-label="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Header Quick Punch Modal */}
      <Modal
        isOpen={showPunchModal}
        onClose={() => setShowPunchModal(false)}
        title="Staff Attendance & Mobile Punch"
        subtitle="Step 1: Photo & Punch In • Step 2: Work Report & Punch Out"
        icon={Smartphone}
        maxWidth="max-w-2xl"
      >
        <MobilePunchWidget onPunched={() => setShowPunchModal(false)} />
      </Modal>

      <Modal
        isOpen={showAddPlantModal}
        onClose={() => setShowAddPlantModal(false)}
        title="Add New Plant / Company"
        subtitle="Create a separate company workspace or add a plant to the selected company."
        icon={Building2}
      >
        <form onSubmit={handleAddPlant} className="space-y-4 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/90 via-white/90 to-cyan-50/80 p-4 text-xs shadow-inner shadow-blue-100/60 backdrop-blur-xl sm:p-5">
          {plantFormError && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 font-semibold text-rose-800">
              {plantFormError}
            </p>
          )}
          <div>
            <label htmlFor="header-plant-kind" className="mb-1.5 block font-bold text-slate-800">What would you like to add?</label>
            <select
              id="header-plant-kind"
              value={plantForm.kind}
              onChange={(event) => setPlantForm((form) => ({ ...form, kind: event.target.value }))}
              className="w-full cursor-pointer rounded-xl border border-blue-200 bg-white/80 px-3.5 py-2.5 font-medium text-slate-950 shadow-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
            >
              <option value="company">Company (separate data workspace)</option>
              <option value="plant">Plant (in {selectedCompany.name})</option>
            </select>
          </div>
          <div>
            <label htmlFor="header-plant-name" className="mb-1.5 block font-bold text-slate-800">{plantForm.kind === 'company' ? 'Company Name *' : 'Plant Name *'}</label>
            <input
              id="header-plant-name"
              required
              autoFocus
              value={plantForm.name}
              onChange={(event) => setPlantForm((form) => ({ ...form, name: event.target.value }))}
              placeholder="e.g. SM Concrete Unit 2"
              className="w-full rounded-xl border border-blue-200 bg-white/80 px-3.5 py-2.5 font-medium text-slate-950 shadow-sm outline-none placeholder:text-slate-500 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="header-plant-code" className="mb-1.5 block font-bold text-slate-800">Node Code <span className="font-medium text-slate-600">(optional)</span></label>
              <input
                id="header-plant-code"
                value={plantForm.code}
                onChange={(event) => setPlantForm((form) => ({ ...form, code: event.target.value.toUpperCase() }))}
                placeholder="Auto-generated if blank"
                className="w-full rounded-xl border border-blue-200 bg-white/80 px-3.5 py-2.5 font-mono font-bold text-slate-950 shadow-sm outline-none placeholder:text-slate-500 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
              />
            </div>
            <div>
              <label htmlFor="header-plant-type" className="mb-1.5 block font-bold text-slate-800">{plantForm.kind === 'company' ? 'Company Type' : 'Plant Type'}</label>
              <select
                id="header-plant-type"
                value={plantForm.type}
                onChange={(event) => setPlantForm((form) => ({ ...form, type: event.target.value }))}
                className="w-full cursor-pointer rounded-xl border border-blue-200 bg-white/80 px-3.5 py-2.5 font-medium text-slate-950 shadow-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
              >
                <option>RMC Plant</option>
                <option>Infra Division</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="header-plant-location" className="mb-1.5 block font-bold text-slate-800">Location</label>
              <input
                id="header-plant-location"
                value={plantForm.location}
                onChange={(event) => setPlantForm((form) => ({ ...form, location: event.target.value }))}
                placeholder="e.g. Miraj, Sangli"
                className="w-full rounded-xl border border-blue-200 bg-white/80 px-3.5 py-2.5 font-medium text-slate-950 shadow-sm outline-none placeholder:text-slate-500 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
              />
            </div>
            {plantForm.kind === 'plant' && <div>
              <label htmlFor="header-plant-capacity" className="mb-1.5 block font-bold text-slate-800">Concrete Capacity</label>
              <input
                id="header-plant-capacity"
                value={plantForm.capacity}
                onChange={(event) => setPlantForm((form) => ({ ...form, capacity: event.target.value }))}
                placeholder="e.g. 90 m³/hr"
                className="w-full rounded-xl border border-blue-200 bg-white/80 px-3.5 py-2.5 font-medium text-slate-950 shadow-sm outline-none placeholder:text-slate-500 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
              />
            </div>}
          </div>
          <div className="flex justify-end gap-2 border-t border-blue-200/80 pt-3">
            <button type="button" onClick={() => setShowAddPlantModal(false)} className="rounded-xl border border-blue-100 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-blue-50">
              Cancel
            </button>
            <button type="submit" className="rounded-xl bg-gradient-to-r from-blue-700 to-cyan-700 px-5 py-2.5 font-bold text-white shadow-lg shadow-blue-900/20 transition hover:from-blue-800 hover:to-cyan-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Add {plantForm.kind === 'company' ? 'Company' : 'Plant'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal: Remove Plant / Company */}
      <Modal
        isOpen={Boolean(plantToDelete)}
        onClose={() => setPlantToDelete(null)}
        title="Remove Plant / Company"
        subtitle="Confirm workspace deletion"
        maxWidth="max-w-md"
        icon={Trash2}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to remove <strong className="text-slate-900 font-bold">"{plantToDelete?.name}"</strong>?
          </p>

          {plantToDelete && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">{plantToDelete.name}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{plantToDelete.location || 'Company Workspace'}</span>
                <span>•</span>
                <span className="font-mono text-slate-600">{plantToDelete.type || 'Plant'}</span>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              This action will remove the plant workspace from your active directory. Any other active plants will remain intact.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPlantToDelete(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleConfirmDeletePlant(plantToDelete?.id)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-md shadow-rose-600/20 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Plant</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
