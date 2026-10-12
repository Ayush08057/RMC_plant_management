import React, { useState } from 'react';
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
  Calendar
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';
import { formatToIndian12Hr, formatShiftRange, formatShiftOption } from '../../utils/shiftUtils';

export default function ShiftManagementView({ employeeFilter = null, isEmployeeView = false }) {
  const { user } = useAuth();
  const { shifts = [], employees = [], createShift, updateShift, deleteShift, assignShift } = useWorkforce();
  const isAdmin = user?.role === 'Admin';
  const effectiveEmployeeId = employeeFilter || (!isAdmin ? (user?.employeeId || user?.id) : null);
  const isPersonalView = isEmployeeView || Boolean(effectiveEmployeeId) || !isAdmin;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const [shiftForm, setShiftForm] = useState({
    name: '',
    startTime: '08:00',
    endTime: '17:00',
    gracePeriodMins: 15,
    otThresholdHours: 8.5,
    otRatePerHour: 200,
    status: 'Active',
    description: '',
  });

  const [assignForm, setAssignForm] = useState({
    employeeId: employees[0]?.id || '',
    shiftId: shifts[0]?.id || '',
  });

  const handleOpenCreate = () => {
    setShiftForm({
      name: '',
      startTime: '07:00',
      endTime: '16:00',
      gracePeriodMins: 15,
      otThresholdHours: 8.5,
      otRatePerHour: 220,
      status: 'Active',
      description: 'Concrete batching and transit mixer dispatch schedule',
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (sft) => {
    setEditingShift(sft);
    setShiftForm({
      name: sft.name,
      startTime: sft.startTime,
      endTime: sft.endTime,
      gracePeriodMins: sft.gracePeriodMins || 15,
      otThresholdHours: sft.otThresholdHours || 8.5,
      otRatePerHour: sft.otRatePerHour || 220,
      status: sft.status || 'Active',
      description: sft.description || '',
    });
    setShowEditModal(true);
  };

  const handleSaveShift = (e) => {
    e.preventDefault();
    if (!shiftForm.name.trim()) return;

    createShift({
      name: shiftForm.name,
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      gracePeriodMins: Number(shiftForm.gracePeriodMins),
      otThresholdHours: Number(shiftForm.otThresholdHours),
      otRatePerHour: Number(shiftForm.otRatePerHour),
      status: shiftForm.status,
      description: shiftForm.description,
    });

    setShowCreateModal(false);
    setToastMessage(`Shift "${shiftForm.name}" created successfully.`);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingShift) return;

    updateShift(editingShift.id, {
      name: shiftForm.name,
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      gracePeriodMins: Number(shiftForm.gracePeriodMins),
      otThresholdHours: Number(shiftForm.otThresholdHours),
      otRatePerHour: Number(shiftForm.otRatePerHour),
      status: shiftForm.status,
      description: shiftForm.description,
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1.5 flex items-center justify-between">
                <span>Start Time (24h) *</span>
                <span className="text-[10px] text-cyan-700 font-mono font-bold">
                  {formatToIndian12Hr(shiftForm.startTime)}
                </span>
              </label>
              <input
                type="time"
                required
                value={shiftForm.startTime}
                onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1.5 flex items-center justify-between">
                <span>End Time (24h) *</span>
                <span className="text-[10px] text-cyan-700 font-mono font-bold">
                  {formatToIndian12Hr(shiftForm.endTime)}
                </span>
              </label>
              <input
                type="time"
                required
                value={shiftForm.endTime}
                onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
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
            <label className="text-slate-700 font-bold block mb-1.5">Operational Description</label>
            <textarea
              rows={2}
              value={shiftForm.description}
              onChange={(e) => setShiftForm({ ...shiftForm, description: e.target.value })}
              placeholder="Operational responsibilities during this shift..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1.5 flex items-center justify-between">
                <span>Start Time (24h) *</span>
                <span className="text-[10px] text-cyan-700 font-mono font-bold">
                  {formatToIndian12Hr(shiftForm.startTime)}
                </span>
              </label>
              <input
                type="time"
                required
                value={shiftForm.startTime}
                onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1.5 flex items-center justify-between">
                <span>End Time (24h) *</span>
                <span className="text-[10px] text-cyan-700 font-mono font-bold">
                  {formatToIndian12Hr(shiftForm.endTime)}
                </span>
              </label>
              <input
                type="time"
                required
                value={shiftForm.endTime}
                onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
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

          <div>
            <label className="text-slate-700 font-bold block mb-1.5">Operational Description</label>
            <textarea
              rows={2}
              value={shiftForm.description}
              onChange={(e) => setShiftForm({ ...shiftForm, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
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
