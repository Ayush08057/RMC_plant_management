import React, { useEffect, useState, useRef } from 'react';
import { 
  Menu, 
  Bell, 
  ChevronDown, 
  Check, 
  PanelLeftOpen, 
  PanelLeftClose, 
  Building2, 
  MapPin, 
  Factory, 
  Trash2, 
  AlertTriangle, 
  LogOut,
  Camera,
  Upload,
  Edit3,
  Plus
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import defaultLogo from '../../assets/logo.png';
import Modal from './Modal';

export default function Header({ onOpenSidebar, onToggleSidebar, isSidebarOpen = true }) {
  const {
    notifications,
    markNotificationRead,
    clearNotifications,
    companies,
    plants,
    activeCompany,
    switchCompany,
    addCompany,
    updateCompany,
    removeCompany,
    addPlant,
  } = useWorkforce();
  const { user, logout } = useAuth();
  const { language, setLanguage, toggleLanguage, t } = useLanguage();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddPlantModal, setShowAddPlantModal] = useState(false);
  const [showPlantPicker, setShowPlantPicker] = useState(false);
  const [plantToDelete, setPlantToDelete] = useState(null);
  const [companyToEdit, setCompanyToEdit] = useState(null);
  const [editCompanyForm, setEditCompanyForm] = useState({
    name: '',
    location: '',
    type: 'RMC Plant',
    code: '',
    logo: '',
  });
  const [editCompanyError, setEditCompanyError] = useState('');

  const [plantForm, setPlantForm] = useState({
    kind: 'company',
    name: '',
    code: '',
    type: 'RMC Plant',
    location: '',
    capacity: '90 m³/hr',
    status: 'Online',
    logo: '',
  });
  const [plantFormError, setPlantFormError] = useState('');

  // Only the active System Administrator has the authority to add, register, or delete company workspaces
  const isAdmin = Boolean(
    user &&
    (user.role === 'Admin' || (user.role || '').toLowerCase() === 'admin' || (user.role || '').toLowerCase() === 'administrator') &&
    user.role !== 'Owner / Director' &&
    (user.role || '').toLowerCase() !== 'owner / director'
  );

  const isOwner = Boolean(
    user &&
    (user.role === 'Owner / Director' || (user.role || '').toLowerCase().includes('owner') || (user.role || '').toLowerCase().includes('director'))
  );

  // Switching between existing company workspaces is allowed for Admin and Owner / Director
  const canSwitchCompany = isAdmin || isOwner;

  // Adding, registering, or permanently deleting company workspaces is strictly restricted to Admin only
  const canManageCompanies = isAdmin;

  const handleLogoFileChange = (file, onSuccess) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('Logo file must be under 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      onSuccess(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmDeletePlant = async (companyId) => {
    if (!canManageCompanies) {
      alert('Unauthorized: Only System Administrator has the authority to delete a company.');
      return;
    }
    if (!companyId) return;
    try {
      await removeCompany(companyId);
      setPlantToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to remove plant.');
    }
  };

  const companyDropdownRef = useRef(null);
  const notificationsRef = useRef(null);

  // Close popovers on click outside and on Escape key press
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target)) {
        setShowPlantPicker(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowPlantPicker(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const closeHeaderPopovers = () => {
      setShowNotifications(false);
      setShowPlantPicker(false);
    };
    window.addEventListener('app:modal-open', closeHeaderPopovers);
    return () => window.removeEventListener('app:modal-open', closeHeaderPopovers);
  }, []);

  const selectedCompany = activeCompany || companies[0] || {
    name: 'No company registered',
    location: '',
    type: 'Company',
    logo: '/logo.png',
  };

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  const openAddPlantModal = () => {
    if (!canManageCompanies) return;
    setPlantForm({
      kind: 'company',
      name: '',
      code: '',
      type: 'RMC Plant',
      location: '',
      capacity: '90 m³/hr',
      status: 'Online',
      logo: '',
    });
    setPlantFormError('');
    setShowPlantPicker(false);
    setShowAddPlantModal(true);
  };

  const handleAddPlant = (event) => {
    event.preventDefault();
    if (!canManageCompanies) {
      setPlantFormError('Unauthorized: Only System Administrator has the authority to add a new company workspace.');
      return;
    }
    const name = plantForm.name.trim();
    const requestedCode = plantForm.code.trim().toUpperCase();

    if (!name) {
      setPlantFormError('Please enter a company name.');
      return;
    }

    try {
      const baseCode = name.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'CMP';
      let code = requestedCode || baseCode;
      if (companies.some((company) => (company.name || '').trim().toLowerCase() === name.toLowerCase())) {
        setPlantFormError('A company with this name already exists.');
        return;
      }
      if (requestedCode && companies.some((company) => (company.code || '').trim().toUpperCase() === requestedCode)) {
        setPlantFormError('This company code is already in use. Enter a different code.');
        return;
      }
      if (!requestedCode) {
        let suffix = 2;
        while (companies.some((company) => (company.code || '').trim().toUpperCase() === code)) {
          code = `${baseCode}${suffix}`;
          suffix += 1;
        }
      }
      addCompany({
        name,
        code,
        type: plantForm.type || 'RMC Plant',
        location: plantForm.location.trim() || 'Headquarters',
        capacity: plantForm.capacity.trim() || '90 m³/hr',
        status: plantForm.status || 'Online',
        logo: plantForm.logo || '/logo.png',
      });

      setPlantFormError('');
      setShowAddPlantModal(false);
    } catch (error) {
      console.error('Failed to add company from selector:', error);
      setPlantFormError(`Could not add company: ${error.message}`);
    }
  };

  const handleSaveEditCompany = (event) => {
    event.preventDefault();
    if (!companyToEdit) return;
    const name = editCompanyForm.name.trim();
    if (!name) {
      setEditCompanyError('Company name is required.');
      return;
    }

    try {
      updateCompany(companyToEdit.id, {
        name,
        location: editCompanyForm.location.trim(),
        type: editCompanyForm.type,
        code: editCompanyForm.code.trim().toUpperCase(),
        logo: editCompanyForm.logo || companyToEdit.logo || '/logo.png',
      });
      setCompanyToEdit(null);
      setEditCompanyError('');
    } catch (err) {
      setEditCompanyError(err.message || 'Failed to update company.');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 h-14 w-full bg-white/75 backdrop-blur-xl border-b border-white/80 ring-1 ring-slate-900/[0.04] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] flex items-center justify-between px-3 sm:px-5 lg:px-6 gap-2 sm:gap-4 shrink-0">
        {/* Left: Sidebar Toggle & Workspace Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 max-w-[55%] sm:max-w-none">
          {/* Mobile-only menu toggle (hidden on desktop) */}
          <button
            type="button"
            onClick={() => (onToggleSidebar ? onToggleSidebar() : onOpenSidebar())}
            aria-label="Open sidebar menu"
            className="md:hidden p-1.5 rounded-xl bg-white/70 border border-white/80 ring-1 ring-slate-900/[0.04] text-slate-700 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer shrink-0"
            title="Open Menu"
          >
            <Menu className="w-4 h-4 text-slate-700" />
          </button>

          {/* Plant / Company Display */}
          <div className="relative min-w-0" ref={companyDropdownRef}>
            {canSwitchCompany ? (
              <button
                type="button"
                id="company-selector-button"
                aria-expanded={showPlantPicker}
                aria-haspopup="listbox"
                aria-controls="company-dropdown-menu"
                aria-label="Select company workspace"
                onClick={() => {
                  setShowPlantPicker((prev) => !prev);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/70 hover:bg-white/95 backdrop-blur-md border border-white/80 ring-1 ring-slate-900/[0.04] text-slate-900 transition-all cursor-pointer shadow-2xs min-w-0"
                title={canManageCompanies ? `Active: ${selectedCompany.name} • Click to switch, add, or delete company` : `Active: ${selectedCompany.name} • Click to switch workspace`}
              >
                <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                  <img 
                    src={selectedCompany?.logo || defaultLogo} 
                    alt={selectedCompany.name} 
                    className="w-full h-full object-cover scale-[1.04]" 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = defaultLogo;
                    }}
                  />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 block leading-tight truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[200px] md:max-w-none">
                    {selectedCompany.name}
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal hidden sm:flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                    <span className="truncate max-w-[140px]">{selectedCompany.location || 'Tanang, Sangli'}</span>
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${showPlantPicker ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              /* Operational employee view: Clean read-only company badge without dropdown */
              <div 
                className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/70 backdrop-blur-md border border-white/80 ring-1 ring-slate-900/[0.04] text-slate-900 shadow-2xs min-w-0 select-none cursor-default"
                title={`${selectedCompany.name} • Plant Workspace`}
              >
                <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                  <img 
                    src={selectedCompany?.logo || defaultLogo} 
                    alt={selectedCompany.name} 
                    className="w-full h-full object-cover scale-[1.04]" 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = defaultLogo;
                    }}
                  />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 block leading-tight truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[200px] md:max-w-none">
                    {selectedCompany.name}
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal hidden sm:flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                    <span className="truncate max-w-[140px]">{selectedCompany.location || 'Tanang, Sangli'}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Plant Picker Dropdown - Restricted strictly to Admin / Owner */}
            {canSwitchCompany && showPlantPicker && (
              <div 
                id="company-dropdown-menu"
                role="listbox"
                aria-label="Company Workspaces"
                className="fixed inset-x-3 top-15 sm:inset-x-auto sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-1.5 w-auto sm:w-88 max-w-[calc(100vw-24px)] rounded-2xl bg-white/90 backdrop-blur-2xl border border-white/80 ring-1 ring-slate-900/[0.06] text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-3 z-50 animate-pop-in text-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-900 uppercase tracking-wide text-xs truncate">{t('Company Workspaces')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-slate-700 font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      {companies.length} {companies.length === 1 ? t('Company') : t('Companies')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[60vh] sm:max-h-72 overflow-y-auto pr-0.5">
                  {companies.map((company) => {
                    const isActive = selectedCompany.id === company.id;
                    return (
                      <div
                        key={company.id}
                        className={`group w-full p-2 rounded-xl text-left transition-colors flex items-center justify-between border ${
                          isActive
                            ? 'bg-blue-50/70 border-blue-200 text-slate-900 font-medium'
                            : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            switchCompany(company.id);
                            setShowPlantPicker(false);
                          }}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border overflow-hidden ${
                            isActive
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-blue-600'
                          }`}>
                            <img 
                              src={company.logo || defaultLogo} 
                              alt={company.name} 
                              className="w-full h-full object-cover scale-[1.04]" 
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = defaultLogo;
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1 pr-1">
                            <div className="flex items-center gap-1.5">
                              <span className="block font-bold text-xs sm:text-sm truncate text-slate-900">{company.name}</span>
                              {isActive && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                            </div>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                              <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                              <span className="truncate">{company.location || t('Company workspace')}</span>
                              {company.type && (
                                <>
                                  <span>•</span>
                                  <span className="text-[10px] font-mono text-slate-600 font-semibold">{t(company.type)}</span>
                                </>
                              )}
                            </span>
                          </div>
                        </button>

                        {/* Only Delete Option for Company (with Confirmation) */}
                        {canManageCompanies && companies.length > 1 && (
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlantToDelete(company);
                                setShowPlantPicker(false);
                              }}
                              title={`Delete company ${company.name}`}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              aria-label={`Delete ${company.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {canManageCompanies && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={openAddPlantModal}
                      className="w-full py-2 px-3 rounded-xl text-center text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                      <span>{t('Add New Company Workspace')}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Language Switcher, Notifications & Sign Out */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

          {/* Distinct Language Options (English & Marathi Separate with Mobile Shortcut) */}
          <div className="flex items-center bg-white/60 backdrop-blur-md p-0.5 rounded-xl border border-white/80 ring-1 ring-slate-900/[0.04] text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 sm:px-3 py-1 rounded-lg transition-all cursor-pointer text-[11px] sm:text-xs font-semibold ${
                language === 'en'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="English"
            >
              <span className="sm:hidden">EN</span>
              <span className="hidden sm:inline">English</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('mr')}
              className={`px-2 sm:px-3 py-1 rounded-lg transition-all cursor-pointer text-[11px] sm:text-xs font-semibold ${
                language === 'mr'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="मराठी"
            >
              मराठी
            </button>
          </div>

          {/* Notifications Button & Popover */}
          <div className="relative shrink-0" ref={notificationsRef}>
            <button
              type="button"
              id="notifications-button"
              aria-expanded={showNotifications}
              aria-haspopup="true"
              aria-controls="notifications-popover-menu"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              onClick={() => {
                setShowNotifications((prev) => !prev);
                setShowPlantPicker(false);
              }}
              className="p-2 rounded-xl bg-white/70 hover:bg-white/95 backdrop-blur-md border border-white/80 ring-1 ring-slate-900/[0.04] text-slate-700 relative cursor-pointer shadow-2xs transition-colors shrink-0"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>

            {showNotifications && (
              <div 
                id="notifications-popover-menu"
                role="region"
                aria-label="Notifications Panel"
                className="fixed inset-x-3 top-15 sm:inset-x-auto sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-1.5 w-auto sm:w-80 max-w-[calc(100vw-24px)] rounded-2xl bg-white/90 backdrop-blur-2xl border border-white/80 ring-1 ring-slate-900/[0.06] text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-3 z-50 animate-pop-in text-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">{t('Notifications')}</span>
                    <span className="text-[11px] text-blue-700 font-mono font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/80">
                      {(notifications || []).length}
                    </span>
                    {unreadCount > 0 && (
                      <span className="text-[11px] font-mono font-semibold bg-blue-100 px-2 py-0.5 rounded-full text-blue-800">
                        {unreadCount} {t('new')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => (notifications || []).filter((n) => !n.read).forEach((n) => markNotificationRead(n.id))}
                        className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        {t('Mark all read')}
                      </button>
                    )}
                    {notifications && notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearNotifications}
                        className="text-[11px] text-slate-500 hover:text-slate-800 hover:underline font-mono font-medium cursor-pointer"
                      >
                        {t('Clear All')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[60vh] sm:max-h-64 overflow-y-auto pr-0.5">
                  {!notifications || notifications.length === 0 ? (
                    <div className="text-center py-6 px-4">
                      <div className="w-9 h-9 mx-auto rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-2">
                        <Bell className="w-4 h-4 opacity-60" />
                      </div>
                      <p className="text-sm font-bold text-slate-900">{t('No notifications')}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t("You're all caught up with current updates.")}</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.read && markNotificationRead(n.id)}
                        className={`p-2.5 rounded-xl border text-left transition-colors ${
                          n.read
                            ? 'bg-slate-50/70 border-slate-100 opacity-75 cursor-default'
                            : 'bg-blue-50/50 border-blue-200 hover:border-blue-300 cursor-pointer'
                        }`}
                        title={n.read ? 'Notification read' : 'Click to mark as read'}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">{typeof n.title === 'string' ? t(n.title) : n.title}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono shrink-0">{n.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">{typeof n.desc === 'string' ? t(n.desc) : n.desc}</p>
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/70 hover:bg-rose-50/80 backdrop-blur-md text-slate-700 hover:text-rose-600 border border-white/80 hover:border-rose-200/80 ring-1 ring-slate-900/[0.04] text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0"
            title={t('Sign Out of active session')}
            aria-label={t('Sign Out')}
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">{t('Sign Out')}</span>
          </button>
        </div>
      </header>

      {/* Modal: Register New Company (Admin Authority Only) */}
      {canManageCompanies && (
        <Modal
          isOpen={showAddPlantModal}
          onClose={() => setShowAddPlantModal(false)}
          title={t('Register New Company Workspace')}
          subtitle={t('Create an independent enterprise company entity with its own branding, plants, and workforce.')}
          icon={Building2}
        >
        <form onSubmit={handleAddPlant} className="space-y-3.5 p-3 sm:p-4 bg-white rounded-xl border border-[#D4E4F7] text-xs">
          {plantFormError && (
            <p role="alert" className="rounded-lg border border-[#D4E4F7] bg-[#EAF3FF] px-3 py-2 font-bold text-black">
              {plantFormError}
            </p>
          )}

          <div>
            <label htmlFor="header-plant-name" className="mb-1 block font-bold text-black">{t('Company Name')} *</label>
            <input
              id="header-plant-name"
              required
              autoFocus
              value={plantForm.name}
              onChange={(event) => setPlantForm((form) => ({ ...form, name: event.target.value }))}
              placeholder="e.g. SM CONCRETECH INFRA PVT LTD"
              className="w-full rounded-lg border border-[#D4E4F7] bg-white px-3 py-2 font-medium text-black outline-none placeholder:text-slate-400 focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="header-plant-code" className="mb-1 block font-bold text-black">{t('Company Short Code')} <span className="font-normal text-slate-700">({t('optional')})</span></label>
              <input
                id="header-plant-code"
                value={plantForm.code}
                onChange={(event) => setPlantForm((form) => ({ ...form, code: event.target.value.toUpperCase() }))}
                placeholder="e.g. SMC"
                className="w-full rounded-lg border border-[#D4E4F7] bg-white px-3 py-2 font-mono font-medium text-black outline-none placeholder:text-slate-400 focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20"
              />
            </div>
            <div>
              <label htmlFor="header-plant-type" className="mb-1 block font-bold text-black">{t('Business Type')}</label>
              <select
                id="header-plant-type"
                value={plantForm.type}
                onChange={(event) => setPlantForm((form) => ({ ...form, type: event.target.value }))}
                className="w-full cursor-pointer rounded-lg border border-[#D4E4F7] bg-white px-3 py-2 font-medium text-black outline-none focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20"
              >
                <option value="RMC Plant">{t('RMC Plant')}</option>
                <option value="Infra Division">{t('Infra Division')}</option>
                <option value="Precast Products">{t('Precast Products')}</option>
                <option value="Aggregates & Mining">{t('Aggregates & Mining')}</option>
                <option value="Other">{t('Other')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="header-plant-location" className="mb-1 block font-bold text-black">{t('Headquarters / Location')}</label>
              <input
                id="header-plant-location"
                value={plantForm.location}
                onChange={(event) => setPlantForm((form) => ({ ...form, location: event.target.value }))}
                placeholder="e.g. Tanang, Sangli"
                className="w-full rounded-lg border border-[#D4E4F7] bg-white px-3 py-2 font-medium text-black outline-none placeholder:text-slate-400 focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20"
              />
            </div>
            <div>
              <label htmlFor="header-plant-capacity" className="mb-1 block font-bold text-black">{t('Production Capacity')}</label>
              <input
                id="header-plant-capacity"
                value={plantForm.capacity}
                onChange={(event) => setPlantForm((form) => ({ ...form, capacity: event.target.value }))}
                placeholder="e.g. 120 m³/hr"
                className="w-full rounded-lg border border-[#D4E4F7] bg-white px-3 py-2 font-medium text-black outline-none placeholder:text-slate-400 focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20"
              />
            </div>
          </div>

          {/* Optional Brand Logo Upload for New Company */}
          <div className="p-2.5 rounded-lg bg-[#F5F9FF] border border-[#D4E4F7] flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white border border-[#D4E4F7] flex items-center justify-center overflow-hidden shrink-0">
              {plantForm.logo ? (
                <img src={plantForm.logo} alt="Logo preview" className="w-full h-full object-cover scale-[1.04]" />
              ) : (
                <Building2 className="w-5 h-5 text-[#1D5FA7]" />
              )}
            </div>
            <div className="flex-1">
              <span className="block font-bold text-black text-[11px]">{t('Company Logo Icon (Optional)')}</span>
              <div className="flex items-center gap-2 mt-1">
                <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#1D5FA7] hover:bg-[#123B6D] text-white cursor-pointer transition-colors shadow-2xs">
                  <Upload className="w-2.5 h-2.5" />
                  <span>{t('Upload Logo')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleLogoFileChange(e.target.files[0], (dataUrl) => setPlantForm((prev) => ({ ...prev, logo: dataUrl })));
                      }
                    }}
                  />
                </label>
                {plantForm.logo && (
                  <button
                    type="button"
                    onClick={() => setPlantForm((prev) => ({ ...prev, logo: '' }))}
                    className="text-[10px] font-bold text-slate-700 hover:text-black cursor-pointer"
                  >
                    {t('Clear')}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[#D4E4F7] pt-3">
            <button 
              type="button" 
              onClick={() => setShowAddPlantModal(false)} 
              className="rounded-lg border border-[#D4E4F7] bg-white px-3.5 py-1.5 font-bold text-black transition hover:bg-[#F5F9FF] cursor-pointer"
            >
              {t('Cancel')}
            </button>
            <button 
              type="submit" 
              className="rounded-lg bg-[#1D5FA7] hover:bg-[#123B6D] px-4 py-1.5 font-bold text-white shadow-xs transition cursor-pointer"
            >
              {t('Register Company')}
            </button>
          </div>
        </form>
      </Modal>
      )}

      {/* Modal: Edit Company & Change Logo (Admin Authority Only) */}
      {canManageCompanies && (
        <Modal
          isOpen={Boolean(companyToEdit)}
          onClose={() => setCompanyToEdit(null)}
          title={`${t('Company Settings')} • ${companyToEdit?.name || t('Company')}`}
          subtitle={t('Manage company profile and brand logo icon')}
          icon={Building2}
        >
        <form onSubmit={handleSaveEditCompany} className="space-y-3.5 p-3 sm:p-4 bg-white rounded-xl border border-[#D4E4F7] text-xs">
          {editCompanyError && (
            <p role="alert" className="rounded-lg border border-[#D4E4F7] bg-[#EAF3FF] px-3 py-2 font-bold text-black">
              {editCompanyError}
            </p>
          )}

          {/* Logo Upload Section */}
          <div className="p-3 rounded-xl bg-[#F5F9FF] border border-[#D4E4F7] flex flex-col sm:flex-row items-center gap-3.5">
            <div className="w-16 h-16 rounded-xl bg-white border border-[#D4E4F7] shadow-xs flex items-center justify-center overflow-hidden shrink-0">
              {editCompanyForm.logo ? (
                <img src={editCompanyForm.logo} alt="Company Logo Preview" className="w-full h-full object-cover scale-[1.04]" />
              ) : (
                <Building2 className="w-8 h-8 text-[#1D5FA7]" />
              )}
            </div>
            <div className="flex-1 space-y-1 text-center sm:text-left">
              <span className="block font-bold text-black text-xs">{t('Company Brand Logo')}</span>
              <p className="text-[10.5px] text-slate-700">Square emblem (.PNG, .JPG, .WEBP max 3MB). Fits edge-to-edge on sidebar & header.</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <label className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1D5FA7] hover:bg-[#123B6D] text-white cursor-pointer shadow-xs transition-colors flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>{t('Upload Logo')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleLogoFileChange(e.target.files[0], (dataUrl) => setEditCompanyForm((prev) => ({ ...prev, logo: dataUrl })));
                      }
                    }}
                  />
                </label>
                {editCompanyForm.logo && (
                  <button
                    type="button"
                    onClick={() => setEditCompanyForm((prev) => ({ ...prev, logo: '' }))}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-black border border-[#D4E4F7] hover:bg-slate-100 cursor-pointer"
                  >
                    {t('Clear')}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-bold text-black">{t('Company Name')} *</label>
            <input
              required
              value={editCompanyForm.name}
              onChange={(e) => setEditCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. SM CONCRETECH"
              className="w-full rounded-lg border border-[#D4E4F7] bg-white px-3 py-2 font-medium text-black outline-none focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-bold text-black">{t('Location')}</label>
              <input
                value={editCompanyForm.location}
                onChange={(e) => setEditCompanyForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="e.g. Tanang, Sangli"
                className="w-full rounded-lg border border-[#D4E4F7] bg-white px-3 py-2 font-medium text-black outline-none focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20"
              />
            </div>
            <div>
              <label className="mb-1 block font-bold text-black">{t('Business Type')}</label>
              <select
                value={editCompanyForm.type}
                onChange={(e) => setEditCompanyForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full cursor-pointer rounded-lg border border-[#D4E4F7] bg-white px-3 py-2 font-medium text-black outline-none focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20"
              >
                <option value="RMC Plant">{t('RMC Plant')}</option>
                <option value="Infra Division">{t('Infra Division')}</option>
                <option value="Concrete Tech">{t('Precast Products')}</option>
                <option value="Other">{t('Other')}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[#D4E4F7] pt-3">
            <button
              type="button"
              onClick={() => setCompanyToEdit(null)}
              className="rounded-lg border border-[#D4E4F7] bg-white px-3.5 py-1.5 font-bold text-black transition hover:bg-[#F5F9FF] cursor-pointer"
            >
              {t('Cancel')}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#1D5FA7] hover:bg-[#123B6D] px-4 py-1.5 font-bold text-white shadow-xs transition cursor-pointer"
            >
              {t('Save Company Changes')}
            </button>
          </div>
        </form>
      </Modal>
      )}

      {/* Confirmation Modal: Delete Company (Admin Authority Only) */}
      {canManageCompanies && (
        <Modal
          isOpen={Boolean(plantToDelete)}
          onClose={() => setPlantToDelete(null)}
          title={t('Confirm Company Deletion')}
          subtitle={t('Permanent workspace removal')}
          maxWidth="max-w-md"
          icon={AlertTriangle}
        >
        <div className="space-y-3.5 text-xs">
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-black">
            <p className="font-bold text-sm text-red-900 mb-1">
              {t('Are you sure you want to delete this company?')}
            </p>
            <p className="text-red-700 text-xs leading-relaxed">
              Are you sure you want to permanently delete <strong className="font-bold">"{plantToDelete?.name}"</strong>? All associated plant facilities, records, and workspace configurations will be permanently removed. This action cannot be undone.
            </p>
          </div>

          {plantToDelete && (
            <div className="p-3 rounded-lg bg-[#F5F9FF] border border-[#D4E4F7] space-y-1">
              <div className="flex items-center gap-2 font-bold text-black">
                <Building2 className="w-4 h-4 text-[#1D5FA7] shrink-0" />
                <span className="truncate">{plantToDelete.name}</span>
                {plantToDelete.code && (
                  <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#D4E4F7] font-bold text-[#1D5FA7]">
                    {plantToDelete.code}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-slate-700 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-[#1D5FA7] shrink-0" />
                <span className="truncate">{plantToDelete.location || 'Headquarters'}</span>
                <span>•</span>
                <span className="font-mono text-black font-bold">{t(plantToDelete.type) || t('Company')}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D4E4F7]">
            <button
              type="button"
              onClick={() => setPlantToDelete(null)}
              className="px-3.5 py-1.5 rounded-lg font-bold text-black bg-white border border-[#D4E4F7] hover:bg-[#F5F9FF] transition-colors cursor-pointer"
            >
              {t('Cancel')}
            </button>
            <button
              type="button"
              onClick={() => handleConfirmDeletePlant(plantToDelete?.id)}
              className="px-3.5 py-1.5 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('Yes, Delete Company')}</span>
            </button>
          </div>
        </div>
      </Modal>
      )}
    </>
  );
}
