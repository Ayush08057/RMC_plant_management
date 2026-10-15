import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Clock,
  Plus,
  Edit3,
  UserCheck,
  Layers,
  ShieldCheck,
  Users,
  AlertCircle,
  Sun,
  Moon,
  Sunrise,
  Trash2,
  Calendar,
  ChevronDown,
  Search,
  Check,
  X,
  UserPlus
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { OFFICIAL_ROLE_ACCOUNTS } from '../../data/mockUsers';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';
import {
  formatToIndian12Hr,
  formatShiftRange,
  formatShiftOption,
  splitTimeTo12Hr,
  build12HrTime,
} from '../../utils/shiftUtils';

function Time12Picker({ label, value, onChange, required = false }) {
  const { hour, minute, ampm } = splitTimeTo12Hr(value);

  const hoursOptions = [
    '01', '02', '03', '04', '05', '06',
    '07', '08', '09', '10', '11', '12'
  ];

  const minuteOptions = ['00', '15', '30', '45'];

  const handleHourChange = (newHour) => {
    onChange(build12HrTime(newHour, minute, ampm));
  };

  const handleMinuteChange = (newMinute) => {
    onChange(build12HrTime(hour, newMinute, ampm));
  };

  const handleAmpmChange = (newAmpm) => {
    onChange(build12HrTime(hour, minute, newAmpm));
  };

  const displayTime = build12HrTime(hour, minute, ampm);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-slate-700 font-bold block text-xs">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200/80 px-2 py-0.5 rounded-lg shadow-2xs">
          <Clock className="w-3 h-3 text-cyan-600" />
          <span>{displayTime}</span>
        </span>
      </div>

      <div className="grid grid-cols-12 gap-1.5 items-center">
        {/* Hour Dropdown */}
        <div className="col-span-5">
          <select
            value={hour}
            onChange={(e) => handleHourChange(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
          >
            {hoursOptions.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        <span className="col-span-1 text-center font-bold text-slate-400 text-sm">:</span>

        {/* Minute Dropdown */}
        <div className="col-span-3">
          <select
            value={minuteOptions.includes(minute) ? minute : '00'}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="w-full px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
          >
            {minuteOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* AM / PM Toggle Pill */}
        <div className="col-span-3 flex rounded-xl border border-slate-200 p-0.5 bg-slate-100">
          <button
            type="button"
            onClick={() => handleAmpmChange('AM')}
            className={`flex-1 py-1 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${
              ampm === 'AM'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => handleAmpmChange('PM')}
            className={`flex-1 py-1 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${
              ampm === 'PM'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
}

function EmployeeShiftDropdown({
  employees = [],
  shifts = [],
  selectedEmployeeIds = [],
  onChange,
  currentShiftId = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Guarantee workforce list is never empty by including official enterprise staff
  const staffList = useMemo(() => {
    if (employees && employees.length > 0) return employees;
    return (OFFICIAL_ROLE_ACCOUNTS || []).map((acc) => ({
      id: acc.employeeId || acc.id,
      employeeId: acc.employeeId || acc.id,
      name: acc.name,
      role: acc.role,
      department: acc.department,
      plant: acc.plantLocation || 'Plant Unit #01',
      shiftId: null,
    }));
  }, [employees]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return staffList;
    const term = searchTerm.toLowerCase();
    return staffList.filter((emp) => {
      return (
        emp.name?.toLowerCase().includes(term) ||
        emp.id?.toLowerCase().includes(term) ||
        emp.employeeId?.toLowerCase().includes(term) ||
        emp.role?.toLowerCase().includes(term) ||
        emp.department?.toLowerCase().includes(term) ||
        emp.plant?.toLowerCase().includes(term)
      );
    });
  }, [staffList, searchTerm]);

  const toggleEmployee = (id) => {
    if (selectedEmployeeIds.includes(id)) {
      onChange(selectedEmployeeIds.filter((item) => item !== id));
    } else {
      onChange([...selectedEmployeeIds, id]);
    }
  };

  const isAllFilteredSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((emp) => selectedEmployeeIds.includes(emp.id || emp.employeeId));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filteredEmployees.map((e) => e.id || e.employeeId));
      onChange(selectedEmployeeIds.filter((id) => !filteredIds.has(id)));
    } else {
      const newIds = new Set([...selectedEmployeeIds, ...filteredEmployees.map((e) => e.id || e.employeeId)]);
      onChange(Array.from(newIds));
    }
  };

  const handleTriggerClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="text-slate-700 font-bold block text-xs">
          Assign to Employee(s) <span className="text-slate-400 font-normal">(Optional)</span>
        </label>
        {selectedEmployeeIds.length > 0 && (
          <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
            {selectedEmployeeIds.length} staff selected
          </span>
        )}
      </div>

      {/* Main trigger button with 100% working, interactive down arrow */}
      <button
        type="button"
        id="assign-employee-dropdown-btn"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={handleTriggerClick}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer select-none ${
          isOpen
            ? 'bg-white border-cyan-500 ring-2 ring-cyan-500/20 shadow-xs'
            : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-cyan-700 shrink-0" />
          <span className="text-xs truncate font-medium text-slate-700">
            {selectedEmployeeIds.length === 0
              ? 'Select employee(s) to assign to this shift...'
              : `${selectedEmployeeIds.length} staff member${selectedEmployeeIds.length > 1 ? 's' : ''} assigned`}
          </span>
        </div>
        <div
          className="flex items-center gap-1.5 shrink-0 ml-2 p-0.5 rounded hover:bg-slate-200/50 transition-colors"
          title={isOpen ? 'Collapse dropdown' : 'Expand staff options'}
        >
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-cyan-700' : ''
            }`}
          />
        </div>
      </button>

      {/* Selected employee chips */}
      {selectedEmployeeIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 max-h-24 overflow-y-auto no-scrollbar">
          {selectedEmployeeIds.map((id) => {
            const emp = staffList.find((e) => (e.id || e.employeeId) === id);
            if (!emp) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50/90 border border-cyan-200 text-cyan-900 text-[11px] font-semibold shadow-2xs"
              >
                <span>{emp.name}</span>
                <span className="text-[10px] text-cyan-700 font-mono">({emp.role})</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEmployee(id);
                  }}
                  className="text-cyan-600 hover:text-cyan-950 p-0.5 rounded hover:bg-cyan-100 cursor-pointer transition-colors"
                  title="Remove employee"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          {selectedEmployeeIds.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="text-[11px] text-slate-500 hover:text-rose-600 font-bold px-2 py-0.5 rounded hover:bg-rose-50 cursor-pointer transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      )}

      {/* Dropdown panel */}
      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="mt-1.5 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xl space-y-2 animate-in fade-in duration-150 z-30"
        >
          {/* Search bar & quick select */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff by name, ID, role..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-cyan-500 focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {filteredEmployees.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 transition-colors whitespace-nowrap cursor-pointer"
              >
                {isAllFilteredSelected ? 'Deselect All' : `Select All (${filteredEmployees.length})`}
              </button>
            )}
          </div>

          {/* Employees list */}
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100">
            {filteredEmployees.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                {staffList.length === 0
                  ? 'No employees registered in the system.'
                  : 'No staff matching search criteria.'}
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const empId = emp.id || emp.employeeId;
                const isSelected = selectedEmployeeIds.includes(empId);
                const assignedShift = shifts.find((s) => s.id === emp.shiftId);
                const isCurrentShift = currentShiftId && emp.shiftId === currentShiftId;
                const initials = emp.name
                  ? emp.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'EM';

                return (
                  <div
                    key={empId}
                    onClick={() => toggleEmployee(empId)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors pt-2 ${
                      isSelected
                        ? 'bg-cyan-50/80 border border-cyan-200/90'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-cyan-600 border-cyan-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white font-mono font-bold text-[9px] flex items-center justify-center shrink-0 shadow-2xs">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {emp.name}
                          </span>
                          <span className="font-mono text-[10px] text-cyan-800 bg-cyan-50 px-1 rounded border border-cyan-200/60">
                            {empId}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                          <span className="font-medium text-slate-700">{emp.role}</span>
                          {emp.plant && <span className="text-slate-400">• {emp.plant}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Current Shift Badge */}
                    <div className="shrink-0 ml-2">
                      {isCurrentShift ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Assigned
                        </span>
                      ) : assignedShift ? (
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[120px] inline-block">
                          Current: {assignedShift.name}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-mono">Unassigned</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Done button in dropdown footer */}
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">
              {selectedEmployeeIds.length} staff selected
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-700 hover:bg-cyan-800 text-white cursor-pointer transition-colors shadow-2xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShiftManagementView({ employeeFilter = null, isEmployeeView = false }) {
  const { user } = useAuth();
  const { shifts = [], employees = [], createShift, updateShift, deleteShift, assignShift } = useWorkforce();
  const isAdmin = user?.role === 'Admin' || user?.role === 'Owner / Director';
  const isPlantManager = user?.role === 'Plant Manager' || user?.role === 'Plant Incharge';
  const effectiveEmployeeId = employeeFilter || (!isAdmin ? (user?.employeeId || user?.id) : null);
  const isPersonalView = isEmployeeView || Boolean(effectiveEmployeeId) || !isAdmin;

  // Full enterprise staff list for shift assignment (scoped)
  const allAvailableEmployees = useMemo(() => {
    let list = employees && employees.length > 0 ? employees : (OFFICIAL_ROLE_ACCOUNTS || []).map((acc) => ({
      id: acc.employeeId || acc.id,
      employeeId: acc.employeeId || acc.id,
      name: acc.name,
      role: acc.role,
      department: acc.department,
      plant: acc.plantLocation || 'Plant Unit #01',
      shiftId: null,
    }));
    if (!isAdmin) {
      list = list.filter((e) => {
        const empRole = (e.role || '').toLowerCase();
        const empId = (e.employeeId || e.id || '').toUpperCase();
        return empRole !== 'admin' && empId !== 'ADM-001' && empId !== 'USR-ADMIN-001';
      });
    }
    return list;
  }, [employees, isAdmin]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  // Form State
  const [shiftForm, setShiftForm] = useState({
    name: '',
    startTime: '08:00 AM',
    endTime: '05:00 PM',
    gracePeriodMins: 15,
    otThresholdHours: 8.5,
    otRatePerHour: 200,
    status: 'Active',
    description: '',
  });

  const [assignForm, setAssignForm] = useState({
    employeeId: employees[0]?.id || OFFICIAL_ROLE_ACCOUNTS[0]?.employeeId || '',
    shiftId: shifts[0]?.id || '',
  });

  const handleOpenCreate = () => {
    setShiftForm({
      name: '',
      startTime: '07:00 AM',
      endTime: '04:00 PM',
      gracePeriodMins: 15,
      otThresholdHours: 8.5,
      otRatePerHour: 220,
      status: 'Active',
      description: 'Concrete batching and transit mixer dispatch schedule',
    });
    setSelectedEmployeeIds([]);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (sft) => {
    setEditingShift(sft);
    setShiftForm({
      name: sft.name,
      startTime: formatToIndian12Hr(sft.startTime) || '08:00 AM',
      endTime: formatToIndian12Hr(sft.endTime) || '05:00 PM',
      gracePeriodMins: sft.gracePeriodMins || 15,
      otThresholdHours: sft.otThresholdHours || 8.5,
      otRatePerHour: sft.otRatePerHour || 220,
      status: sft.status || 'Active',
      description: sft.description || '',
    });
    const currentAssigned = employees
      .filter((e) => e.shiftId === sft.id)
      .map((e) => e.id);
    setSelectedEmployeeIds(currentAssigned);
    setShowEditModal(true);
  };

  const handleSaveShift = (e) => {
    e.preventDefault();
    if (!shiftForm.name.trim()) return;

    const newShift = createShift({
      name: shiftForm.name,
      startTime: formatToIndian12Hr(shiftForm.startTime),
      endTime: formatToIndian12Hr(shiftForm.endTime),
      gracePeriodMins: Number(shiftForm.gracePeriodMins),
      otThresholdHours: Number(shiftForm.otThresholdHours),
      otRatePerHour: Number(shiftForm.otRatePerHour),
      status: shiftForm.status,
      description: shiftForm.description,
    });

    if (newShift?.id && selectedEmployeeIds.length > 0) {
      selectedEmployeeIds.forEach((empId) => {
        assignShift(empId, newShift.id);
      });
    }

    setShowCreateModal(false);
    const count = selectedEmployeeIds.length;
    setToastMessage(
      count > 0
        ? `Shift "${shiftForm.name}" created & assigned to ${count} employee${count > 1 ? 's' : ''}.`
        : `Shift "${shiftForm.name}" created successfully.`
    );
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingShift) return;

    updateShift(editingShift.id, {
      name: shiftForm.name,
      startTime: formatToIndian12Hr(shiftForm.startTime),
      endTime: formatToIndian12Hr(shiftForm.endTime),
      gracePeriodMins: Number(shiftForm.gracePeriodMins),
      otThresholdHours: Number(shiftForm.otThresholdHours),
      otRatePerHour: Number(shiftForm.otRatePerHour),
      status: shiftForm.status,
      description: shiftForm.description,
    });

    // Assign newly added employees to this shift
    selectedEmployeeIds.forEach((empId) => {
      const emp = employees.find((em) => em.id === empId);
      if (emp?.shiftId !== editingShift.id) {
        assignShift(empId, editingShift.id);
      }
    });

    // Unassign removed employees
    const previouslyAssigned = employees.filter((em) => em.shiftId === editingShift.id);
    previouslyAssigned.forEach((emp) => {
      if (!selectedEmployeeIds.includes(emp.id)) {
        assignShift(emp.id, '');
      }
    });

    setShowEditModal(false);
    setToastMessage(`Shift "${shiftForm.name}" updated successfully.`);
  };

  const handleDeleteShift = (id, name) => {
    if (window.confirm(`Permanently remove operational shift "${name}"? Employees on this shift will be unassigned.`)) {
      deleteShift(id);
      setToastMessage(`Shift "${name}" deleted.`);
    }
  };

  const handleSaveAssignment = (e) => {
    e.preventDefault();
    if (!assignForm.employeeId || !assignForm.shiftId) {
      alert('Please select both an employee and a shift.');
      return;
    }
    assignShift(assignForm.employeeId, assignForm.shiftId);
    setShowAssignModal(false);
    const emp = employees.find((em) => em.id === assignForm.employeeId);
    const sft = shifts.find((s) => s.id === assignForm.shiftId);
    setToastMessage(`Reassigned ${emp?.name || assignForm.employeeId} to ${sft?.name || assignForm.shiftId}.`);
  };

  // Employees Roster Columns
  const rosterColumns = [
    {
      header: 'Employee ID',
      accessor: 'id',
      width: '12%',
      render: (row) => (
        <span className="font-mono text-cyan-800 font-bold bg-cyan-50/90 px-2 py-0.5 rounded-lg border border-cyan-200/90 inline-block text-[11px] whitespace-nowrap shadow-2xs">
          {row.id}
        </span>
      ),
    },
    {
      header: 'Staff Name',
      accessor: 'name',
      width: '22%',
      render: (row) => {
        const initials = row.name
          ? row.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
          : 'EM';
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 shadow-xs border border-white/40">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-900 text-xs truncate leading-snug">{row.name}</div>
              <div className="text-[10px] text-slate-400 font-mono truncate leading-none mt-0.5">{row.department}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Role',
      accessor: 'role',
      width: '14%',
      render: (row) => {
        const roleColors = {
          'Admin': 'bg-indigo-50 text-indigo-700 border-indigo-200/90',
          'Owner / Director': 'bg-indigo-50 text-indigo-700 border-indigo-200/90',
          'Plant Manager': 'bg-amber-50 text-amber-800 border-amber-200/90',
          'Accountant': 'bg-emerald-50 text-emerald-700 border-emerald-200/90',
          'Dispatcher': 'bg-cyan-50 text-cyan-800 border-cyan-200/90',
          'QC Engineer': 'bg-purple-50 text-purple-700 border-purple-200/90',
          'Site Supervisor': 'bg-teal-50 text-teal-700 border-teal-200/90',
          'Mixer Driver': 'bg-blue-50 text-blue-700 border-blue-200/90',
          'Batching Operator': 'bg-sky-50 text-sky-700 border-sky-200/90',
        };
        const colorClass = roleColors[row.role] || 'bg-slate-100 text-slate-800 border-slate-200';
        return (
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border shadow-2xs whitespace-nowrap inline-block leading-none truncate max-w-full ${colorClass}`}>
            {row.role}
          </span>
        );
      },
    },
    {
      header: 'Assigned Plant',
      accessor: 'plant',
      width: '18%',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-800 truncate block">{row.plant}</span>
      ),
    },
    {
      header: 'Assigned Shift',
      accessor: 'shiftId',
      width: '20%',
      render: (row) => {
        const sft = shifts.find((s) => s.id === row.shiftId);
        return (
          <div className="min-w-0">
            <span className="text-xs font-black text-cyan-800 block truncate">
              {sft ? sft.name : (row.shiftId || 'General Morning Shift')}
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-500 block truncate">
              {sft ? formatShiftRange(sft.startTime, sft.endTime) : '09:00 AM - 06:00 PM'}
            </span>
          </div>
        );
      },
    },
    // Only show administrative Change Shift action for Admin in company-wide roster view
    ...(!isPersonalView ? [{
      header: 'Actions',
      align: 'right',
      width: '14%',
      minWidth: '115px',
      render: (row) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setAssignForm({ employeeId: row.id, shiftId: row.shiftId || (shifts[0]?.id || '') });
              setShowAssignModal(true);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200/90 bg-slate-100 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
          >
            Change Shift
          </button>
        </div>
      ),
    }] : []),
  ];

  // Filter employees for personal vs management view
  const displayEmployees = isPersonalView
    ? employees.filter((e) => e.id === effectiveEmployeeId || e.employeeId === effectiveEmployeeId).length > 0
      ? employees.filter((e) => e.id === effectiveEmployeeId || e.employeeId === effectiveEmployeeId)
      : [{
        id: effectiveEmployeeId || 'EMP-505',
        employeeId: effectiveEmployeeId || 'EMP-505',
        name: user?.name || 'Driver',
        role: user?.role || 'Driver',
        department: user?.department || 'Transit Mixer Fleet',
        plant: user?.plantLocation || 'Main Plant Unit #01',
        shiftId: 'SFT-MORN',
      }]
    : employees;

  const myShift = shifts.find((s) => s.id === displayEmployees[0]?.shiftId) || shifts[0] || {
    name: 'General Morning Shift',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodMins: 15,
    otThresholdHours: 8.5,
    otRatePerHour: 220,
  };

  return (
    <div className="space-y-6">
      {/* Personal Shift Hero Card when viewing my own shift */}
      {isPersonalView && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center font-bold text-lg shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-800 px-2 py-0.5 rounded bg-cyan-50 border border-cyan-200">
                ACTIVE DUTY ROSTER
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-1">
                {myShift.name} ({formatShiftRange(myShift.startTime, myShift.endTime)})
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Assigned to: <strong className="text-slate-800">{displayEmployees[0]?.name}</strong> ({displayEmployees[0]?.employeeId || displayEmployees[0]?.id}) • Base: {displayEmployees[0]?.plant}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto shrink-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block truncate">Duty Hours</span>
              <span className="text-xs sm:text-sm font-mono font-black text-slate-800 mt-0.5 block truncate">9.0 Hours</span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block truncate">Grace</span>
              <span className="text-xs sm:text-sm font-mono font-black text-amber-700 mt-0.5 block truncate">{myShift.gracePeriodMins || 15}m</span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 uppercase block truncate">Overtime</span>
              <span className="text-xs sm:text-sm font-mono font-black text-emerald-800 mt-0.5 block truncate">&gt; {myShift.otThresholdHours || 8.5}h</span>
            </div>
          </div>
        </div>
      )}

      {/* Defined Operational Shifts Cards Grid */}
      {!isPersonalView && shifts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Standard Operational Shifts</h3>
                <p className="text-xs text-slate-500">Configured duty schedules and active personnel allocation</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {shifts.length} {shifts.length === 1 ? 'Shift' : 'Shifts'} Defined
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {shifts.map((sft) => {
              const assignedCount = employees.filter((e) => e.shiftId === sft.id).length;
              return (
                <div
                  key={sft.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 truncate">{sft.name}</span>
                        <StatusBadge status={sft.status || 'Active'} />
                      </div>
                      <span className="text-xs font-mono font-bold text-cyan-800 mt-1 block">
                        {formatShiftRange(sft.startTime, sft.endTime)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(sft)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Edit Shift & Assigned Employees"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteShift(sft.id, sft.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Shift"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {sft.description || 'Standard plant operational dispatch and batching shift schedule.'}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Users className="w-3.5 h-3.5 text-cyan-700" />
                      <span>{assignedCount} {assignedCount === 1 ? 'staff member' : 'staff members'} assigned</span>
                    </div>
                    <span className="font-mono text-slate-500 text-[10px]">
                      OT: &gt;{sft.otThresholdHours || 8.5}h (₹{sft.otRatePerHour || 220}/h)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shift Roster Table */}
      <DataTable
        title={isPersonalView ? "My Assigned Shift Timing" : "Plant Personnel Shift Roster"}
        subtitle={isPersonalView ? "Your verified working hours and assigned shift schedule" : "Current shift assignment across batching, transport, lab, and administrative personnel"}
        icon={isPersonalView ? Clock : Users}
        columns={rosterColumns}
        data={displayEmployees}
        emptyMessage="No shift assignment record found."
        actions={
          !isPersonalView ? (
            <div className="flex items-center gap-2">
              {employees.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAssignForm({
                      employeeId: employees[0]?.id || '',
                      shiftId: shifts[0]?.id || '',
                    });
                    setShowAssignModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-cyan-50 text-slate-800 hover:text-cyan-800 border border-slate-200/90 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
                >
                  <UserCheck className="w-4 h-4 text-cyan-700" />
                  <span>Assign Staff</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-500/20 active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Create Shift</span>
              </button>
            </div>
          ) : null
        }
      />

      {/* Create Shift Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Define Operational Shift"
        subtitle="Set standard duty hours and overtime multiplier thresholds."
        icon={Clock}
      >
        <form onSubmit={handleSaveShift} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-700 font-bold block mb-1.5">Shift Name *</label>
            <input
              type="text"
              required
              value={shiftForm.name}
              onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
              placeholder="e.g. Morning Batching Shift"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Time12Picker
              label="Start Time (12h)"
              value={shiftForm.startTime}
              onChange={(val) => setShiftForm({ ...shiftForm, startTime: val })}
              required
            />
            <Time12Picker
              label="End Time (12h)"
              value={shiftForm.endTime}
              onChange={(val) => setShiftForm({ ...shiftForm, endTime: val })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">Grace Period (Mins)</label>
              <input
                type="number"
                value={shiftForm.gracePeriodMins}
                onChange={(e) => setShiftForm({ ...shiftForm, gracePeriodMins: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">OT Threshold (Hrs)</label>
              <input
                type="number"
                step="0.5"
                value={shiftForm.otThresholdHours}
                onChange={(e) => setShiftForm({ ...shiftForm, otThresholdHours: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">OT Rate / Hr (₹)</label>
              <input
                type="number"
                value={shiftForm.otRatePerHour}
                onChange={(e) => setShiftForm({ ...shiftForm, otRatePerHour: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>

          {/* Employee Selection Dropdown */}
          <EmployeeShiftDropdown
            employees={allAvailableEmployees}
            shifts={shifts}
            selectedEmployeeIds={selectedEmployeeIds}
            onChange={setSelectedEmployeeIds}
          />

          <div>
            <label className="text-slate-700 font-bold block mb-1.5">Operational Description</label>
            <textarea
              rows={2}
              value={shiftForm.description}
              onChange={(e) => setShiftForm({ ...shiftForm, description: e.target.value })}
              placeholder="Operational responsibilities during this shift..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-md cursor-pointer"
            >
              Save Shift
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Shift Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Operational Shift"
        subtitle={`Modify working hours, grace period, or rates for ${editingShift?.name}`}
        icon={Edit3}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-700 font-bold block mb-1.5">Shift Name *</label>
            <input
              type="text"
              required
              value={shiftForm.name}
              onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Time12Picker
              label="Start Time (12h)"
              value={shiftForm.startTime}
              onChange={(val) => setShiftForm({ ...shiftForm, startTime: val })}
              required
            />
            <Time12Picker
              label="End Time (12h)"
              value={shiftForm.endTime}
              onChange={(val) => setShiftForm({ ...shiftForm, endTime: val })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">Grace Period (Mins)</label>
              <input
                type="number"
                value={shiftForm.gracePeriodMins}
                onChange={(e) => setShiftForm({ ...shiftForm, gracePeriodMins: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">OT Threshold (Hrs)</label>
              <input
                type="number"
                step="0.5"
                value={shiftForm.otThresholdHours}
                onChange={(e) => setShiftForm({ ...shiftForm, otThresholdHours: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">OT Rate / Hr (₹)</label>
              <input
                type="number"
                value={shiftForm.otRatePerHour}
                onChange={(e) => setShiftForm({ ...shiftForm, otRatePerHour: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-bold block mb-1.5">Status</label>
            <select
              value={shiftForm.status}
              onChange={(e) => setShiftForm({ ...shiftForm, status: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Employee Selection Dropdown */}
          <EmployeeShiftDropdown
            employees={employees}
            shifts={shifts}
            selectedEmployeeIds={selectedEmployeeIds}
            onChange={setSelectedEmployeeIds}
            currentShiftId={editingShift?.id}
          />

          <div>
            <label className="text-slate-700 font-bold block mb-1.5">Operational Description</label>
            <textarea
              rows={2}
              value={shiftForm.description}
              onChange={(e) => setShiftForm({ ...shiftForm, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-md cursor-pointer"
            >
              Update Shift
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Shift Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Employee to Shift"
        subtitle="Update employee duty roster schedule."
        icon={UserCheck}
      >
        <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-700 font-bold block mb-1.5">Select Employee</label>
            <select
              value={assignForm.employeeId}
              onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.id} • {e.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-700 font-bold block mb-1.5">Select Shift</label>
            <select
              value={assignForm.shiftId}
              onChange={(e) => setAssignForm({ ...assignForm, shiftId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
            >
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>{formatShiftOption(s)}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAssignModal(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-md cursor-pointer"
            >
              Assign Roster
            </button>
          </div>
        </form>
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
