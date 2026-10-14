import React, { useEffect, useState } from 'react';
import { Menu, Bell, ChevronDown, Check, PanelLeftOpen, PanelLeftClose, Building2, MapPin, Factory, Trash2, AlertTriangle, LogOut } from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
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
    removeCompany,
    addPlant,
  } = useWorkforce();
  const { user, logout } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
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
      } else {
        const baseCode = name.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'CMP';
        let code = requestedCode || baseCode;
        if (companies.some((company) => (company.name || '').trim().toLowerCase() === name.toLowerCase())) {
          setPlantFormError('A company with this name already exists.');
          return;
        }
        if (requestedCode && companies.some((company) => (company.code || '').trim().toUpperCase() === requestedCode)) {
          setPlantFormError('This code is already in use. Enter a different code.');
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
          type: plantForm.type,
          location: plantForm.location.trim(),
          capacity: plantForm.capacity.trim() || '90 m³/hr',
          status: plantForm.status,
        });
      }

      setPlantFormError('');
      setShowAddPlantModal(false);
    } catch (error) {
      console.error('Failed to add company from the company selector:', error);
      setPlantFormError(`Could not add plant: ${error.message}`);
    }
  };

  return (
    <>
      {/* Invisible Click-away Backdrop for Popovers */}
      {(showNotifications || showPlantPicker) && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => {
            setShowNotifications(false);
            setShowPlantPicker(false);
          }}
          aria-hidden="true"
        />
      )}

      <header className="sticky top-0 z-40 h-14 w-full bg-white border-b border-[#D4E4F7] shadow-2xs flex items-center justify-between px-3 sm:px-4 lg:px-6 gap-2 sm:gap-4 shrink-0">
        {/* Left: Sidebar Toggle & Workspace Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => (onToggleSidebar ? onToggleSidebar() : onOpenSidebar())}
            aria-label="Toggle sidebar menu"
            className="p-1.5 sm:p-2 rounded-lg bg-[#F5F9FF] border border-[#D4E4F7] text-[#1D5FA7] hover:text-[#123B6D] hover:bg-[#EAF3FF] transition-colors cursor-pointer shrink-0"
            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4 text-[#1D5FA7]" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 text-[#1D5FA7]" />
            )}
          </button>

          {/* Plant / Company Selector */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowPlantPicker(!showPlantPicker);
                setShowNotifications(false);
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-lg bg-[#F5F9FF] hover:bg-[#EAF3FF] border border-[#D4E4F7] text-[#123B6D] transition-colors cursor-pointer shadow-2xs"
              title="Select Plant / Company Workspace"
            >
              <div className="w-6 h-6 rounded-md bg-[#EAF3FF] border border-[#D4E4F7] text-[#1D5FA7] flex items-center justify-center shrink-0">
                <Factory className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden md:block">
                <span className="text-xs font-semibold text-[#123B6D] block leading-tight truncate max-w-[120px] lg:max-w-[150px]">
                  {selectedCompany.name}
                </span>
                <span className="text-[10px] text-[#1D5FA7] font-normal hidden lg:flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 shrink-0 text-[#1D5FA7]" />
                  <span className="truncate max-w-[100px]">{selectedCompany.location || 'Sangli'}</span>
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-[#1D5FA7] transition-transform ${showPlantPicker ? 'rotate-180' : ''}`} />
            </button>

            {/* Plant Picker Dropdown */}
            {showPlantPicker && (
              <div className="fixed inset-x-3 sm:inset-x-auto sm:left-0 sm:right-auto top-14 sm:top-full mt-1.5 w-auto sm:w-80 max-w-[calc(100vw-24px)] rounded-xl bg-white border border-[#D4E4F7] text-[#123B6D] shadow-xl p-3 z-50 animate-pop-in text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#D4E4F7] mb-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#1D5FA7]" />
                    <span className="font-bold text-[#123B6D] uppercase tracking-wide text-[11px]">Select Plant Workspace</span>
                  </div>
                  <span className="text-[10px] text-[#123B6D] font-mono font-medium bg-[#EAF3FF] px-2 py-0.5 rounded border border-[#D4E4F7]">
                    Active
                  </span>
                </div>

                <div className="space-y-1 max-h-[60vh] sm:max-h-72 overflow-y-auto pr-0.5">
                  {companies.map((company) => {
                    const isActive = selectedCompany.id === company.id;
                    return (
                      <div
                        key={company.id}
                        className={`group w-full p-2 rounded-lg text-left transition-colors flex items-center justify-between border ${
                          isActive
                            ? 'bg-[#EAF3FF] border-[#246BCE] text-[#123B6D] font-medium'
                            : 'bg-white hover:bg-[#F5F9FF] border-[#D4E4F7] text-[#123B6D]'
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
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                            isActive
                              ? 'bg-[#1D5FA7] text-white border-[#1D5FA7]'
                              : 'bg-[#F5F9FF] text-[#1D5FA7] border-[#D4E4F7]'
                          }`}>
                            <Factory className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1 pr-1">
                            <span className="block font-semibold text-xs truncate text-[#123B6D]">{company.name}</span>
                            <span className="text-[10px] text-[#1D5FA7] flex items-center gap-1 truncate">
                              <MapPin className="w-2.5 h-2.5 shrink-0 text-[#1D5FA7]" />
                              <span className="truncate">{company.location || 'Company workspace'}</span>
                            </span>
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {isActive && <Check className="w-4 h-4 text-[#1D5FA7] shrink-0" />}
                          {companies.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlantToDelete(company);
                              }}
                              title={`Remove ${company.name}`}
                              className="p-1 rounded text-[#1D5FA7] hover:text-[#123B6D] hover:bg-[#EAF3FF] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-[#D4E4F7]">
                  <button
                    type="button"
                    onClick={openAddPlantModal}
                    className="w-full py-1.5 px-2 rounded-lg text-center text-xs font-semibold text-[#123B6D] bg-[#EAF3FF] hover:bg-[#D4E4F7]/60 border border-[#D4E4F7] transition-colors cursor-pointer"
                  >
                    + Add New Plant Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Notifications & Sign Out */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* Notifications Button & Popover */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                const nextState = !showNotifications;
                setShowNotifications(nextState);
                setShowPlantPicker(false);
                if (nextState && unreadCount > 0) {
                  notifications.filter((n) => !n.read).forEach((n) => markNotificationRead(n.id));
                }
              }}
              className="p-2 rounded-lg bg-[#F5F9FF] border border-[#D4E4F7] text-[#1D5FA7] hover:text-[#123B6D] hover:bg-[#EAF3FF] relative cursor-pointer shadow-2xs transition-colors shrink-0"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#246BCE]" />
              )}
            </button>

            {showNotifications && (
              <div className="fixed inset-x-3 sm:inset-x-auto sm:right-0 sm:left-auto top-14 sm:top-full mt-1.5 w-auto sm:w-80 max-w-[calc(100vw-24px)] rounded-xl bg-white border border-[#D4E4F7] text-[#123B6D] shadow-xl p-3 z-50 animate-pop-in text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#D4E4F7] mb-2">
                  <span className="text-xs font-bold text-[#123B6D]">Notifications ({notifications.length})</span>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearNotifications}
                      className="text-[10px] text-[#1D5FA7] hover:text-[#123B6D] hover:underline font-mono font-semibold cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 max-h-[60vh] sm:max-h-64 overflow-y-auto pr-0.5">
                  {notifications.length === 0 ? (
                    <div className="text-center py-4 text-xs text-[#1D5FA7]">No new notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                          n.read
                            ? 'bg-[#F5F9FF] border-[#D4E4F7] opacity-70'
                            : 'bg-[#EAF3FF] border-[#D4E4F7] hover:border-[#246BCE]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#123B6D] truncate">{n.title}</span>
                          <span className="text-[10px] text-[#1D5FA7] font-mono shrink-0">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-[#1D5FA7] mt-0.5 leading-relaxed break-words">{n.desc}</p>
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F5F9FF] hover:bg-[#EAF3FF] text-[#123B6D] border border-[#D4E4F7] hover:border-[#1D5FA7] text-xs font-semibold transition-colors cursor-pointer shadow-2xs shrink-0"
            title="Sign Out of active session"
            aria-label="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5 text-[#1D5FA7]" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Modal: Add New Plant / Company */}
      <Modal
        isOpen={showAddPlantModal}
        onClose={() => setShowAddPlantModal(false)}
        title="Add New Plant / Company"
        subtitle="Create a separate company workspace or add a plant to the selected company."
        icon={Building2}
      >
        <form onSubmit={handleAddPlant} className="space-y-3.5 p-3 sm:p-4 bg-white rounded-xl border border-[#D4E4F7] text-xs">
          {plantFormError && (
            <p role="alert" className="rounded-lg border border-[#D4E4F7] bg-[#EAF3FF] px-3 py-2 font-medium text-[#123B6D]">
              {plantFormError}
            </p>
          )}
          <div>
            <label htmlFor="header-plant-kind" className="mb-1 block font-semibold text-[#123B6D]">What would you like to add?</label>
            <select
              id="header-plant-kind"
              value={plantForm.kind}
              onChange={(event) => setPlantForm((form) => ({ ...form, kind: event.target.value }))}
              className="w-full cursor-pointer rounded-lg border border-[#D4E4F7] bg-white px-3 py-2 font-medium text-[#123B6D] outline-none focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20"
            >
              <option value="company">Company (separate data workspace)</option>
              <option value="plant">Plant (in {selectedCompany.name})</option>
            </select>
          </div>
          <div>
            <label htmlFor="header-plant-name" className="mb-1 block font-semibold text-[#123B6D]">{plantForm.kind === 'company' ? 'Company Name *' : 'Plant Name *'}</label>
            <input
              id="header-plant-name"
              required
              autoFocus
              value={plantForm.name}
              onChange={(event) => setPlantForm((form) => ({ ...form, name: event.target.value }))}
              placeholder="e.g. SM Concrete Unit 2"
              className="w-full rounded-lg border border-[#D4E4F7] bg-white px-3 py-2 font-medium text-[#123B6D] outline-none placeholder:text-[#1D5FA7]/40 focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="header-plant-code" className="mb-1 block font-semibold text-[#123B6D]">Node Code <span className="font-normal text-[#1D5FA7]">(optional)</span></label>
              <input
                id="header-plant-code"
                value={plantForm.code}
                onChange={(event) => setPlantForm((form) => ({ ...form, code: event.target.value.toUpperCase() }))}
                placeholder="Auto-generated if blank"
                className="w-full rounded-lg border border-[#D4E4F7] bg-white px-3 py-2 font-mono font-medium text-[#123B6D] outline-none placeholder:text-[#1D5FA7]/40 focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20"
              />
            </div>
            <div>
              <label htmlFor="header-plant-type" className="mb-1 block font-semibold text-[#123B6D]">{plantForm.kind === 'company' ? 'Company Type' : 'Plant Type'}</label>
              <select
                id="header-plant-type"
                value={plantForm.type}
                onChange={(event) => setPlantForm((form) => ({ ...form, type: event.target.value }))}
                className="w-full cursor-pointer rounded-lg border border-[#D4E4F7] bg-white px-3 py-2 font-medium text-[#123B6D] outline-none focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20"
              >
                <option>RMC Plant</option>
                <option>Infra Division</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="header-plant-location" className="mb-1 block font-semibold text-[#123B6D]">Location</label>
              <input
                id="header-plant-location"
                value={plantForm.location}
                onChange={(event) => setPlantForm((form) => ({ ...form, location: event.target.value }))}
                placeholder="e.g. Miraj, Sangli"
                className="w-full rounded-lg border border-[#D4E4F7] bg-white px-3 py-2 font-medium text-[#123B6D] outline-none placeholder:text-[#1D5FA7]/40 focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20"
              />
            </div>
            {plantForm.kind === 'plant' && (
              <div>
                <label htmlFor="header-plant-capacity" className="mb-1 block font-semibold text-[#123B6D]">Concrete Capacity</label>
                <input
                  id="header-plant-capacity"
                  value={plantForm.capacity}
                  onChange={(event) => setPlantForm((form) => ({ ...form, capacity: event.target.value }))}
                  placeholder="e.g. 90 m³/hr"
                  className="w-full rounded-lg border border-[#D4E4F7] bg-white px-3 py-2 font-medium text-[#123B6D] outline-none placeholder:text-[#1D5FA7]/40 focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-[#D4E4F7] pt-3">
            <button 
              type="button" 
              onClick={() => setShowAddPlantModal(false)} 
              className="rounded-lg border border-[#D4E4F7] bg-white px-3.5 py-1.5 font-semibold text-[#123B6D] transition hover:bg-[#F5F9FF] cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="rounded-lg bg-[#1D5FA7] hover:bg-[#123B6D] px-4 py-1.5 font-semibold text-white shadow-xs transition cursor-pointer"
            >
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
        <div className="space-y-3.5 text-xs">
          <p className="text-[#123B6D] leading-relaxed">
            Are you sure you want to remove <strong className="text-[#123B6D] font-semibold">"{plantToDelete?.name}"</strong>?
          </p>

          {plantToDelete && (
            <div className="p-3 rounded-lg bg-[#F5F9FF] border border-[#D4E4F7] space-y-1">
              <div className="flex items-center gap-2 font-semibold text-[#123B6D]">
                <Building2 className="w-4 h-4 text-[#1D5FA7] shrink-0" />
                <span className="truncate">{plantToDelete.name}</span>
              </div>
              <div className="flex items-center gap-2 text-[#1D5FA7] text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-[#1D5FA7] shrink-0" />
                <span className="truncate">{plantToDelete.location || 'Company Workspace'}</span>
                <span>•</span>
                <span className="font-mono text-[#123B6D]">{plantToDelete.type || 'Plant'}</span>
              </div>
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-[#EAF3FF] border border-[#D4E4F7] text-[11px] text-[#123B6D] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#1D5FA7] shrink-0 mt-0.5" />
            <p>
              This action will remove the plant workspace from your active directory. Any other active plants will remain intact.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D4E4F7]">
            <button
              type="button"
              onClick={() => setPlantToDelete(null)}
              className="px-3.5 py-1.5 rounded-lg font-semibold text-[#123B6D] bg-white border border-[#D4E4F7] hover:bg-[#F5F9FF] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleConfirmDeletePlant(plantToDelete?.id)}
              className="px-3.5 py-1.5 rounded-lg font-semibold text-white bg-[#123B6D] hover:bg-[#1D5FA7] transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
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
