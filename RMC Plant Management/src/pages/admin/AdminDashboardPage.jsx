import React, { useState } from 'react';
import AppLayout from '../../components/dashboard/AppLayout';
import KPICard from '../../components/dashboard/KPICard';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import QuickAction from '../../components/dashboard/QuickAction';
import AlertCard from '../../components/dashboard/AlertCard';
import ActivityTimeline from '../../components/dashboard/ActivityTimeline';
import Modal from '../../components/dashboard/Modal';
import Toast from '../../components/dashboard/Toast';
import { 
  Users, 
  ShieldCheck, 
  Building2, 
  KeyRound, 
  Activity, 
  FileText, 
  Plus, 
  UserPlus, 
  Trash2, 
  Edit3,
  CheckCircle2, 
  Check,
  FolderTree,
  Download,
  Upload,
  AlertTriangle,
  Lock,
  Radio,
  MapPin,
  Smartphone,
  UserCheck,
  Clock,
  ArrowRight,
  ChevronRight,
  Factory,
  XCircle
} from 'lucide-react';
import { MOCK_ADMIN_DATA } from '../../data/mockDashboardData';
import { ROLES } from '../../data/mockUsers';
import { useWorkforce } from '../../context/WorkforceContext';
import { formatToIndian12Hr } from '../../utils/shiftUtils';

// Phase 1 Workforce Views
import EmployeeManagementView from '../../components/workforce/EmployeeManagementView';
import AttendanceManagementView from '../../components/workforce/AttendanceManagementView';
import ShiftManagementView from '../../components/workforce/ShiftManagementView';
import ApprovalsView from '../../components/workforce/ApprovalsView';
import PayrollPreparationView from '../../components/workforce/PayrollPreparationView';
import HrReportsView from '../../components/workforce/HrReportsView';
import EmployeeDocumentsView from '../../components/workforce/EmployeeDocumentsView';
import AuditLogsView from '../../components/workforce/AuditLogsView';
import HrSettingsView from '../../components/workforce/HrSettingsView';
import BillingManagementView from '../../components/billing/BillingManagementView';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [triggerMarkAttendance, setTriggerMarkAttendance] = useState(false);
  const [triggerMobileAttendance, setTriggerMobileAttendance] = useState(false);
  const [activeKpiModal, setActiveKpiModal] = useState(null);
  const { 
    employees, 
    plants,
    companies,
    activeCompany,
    activeCompanyId,
    switchCompany,
    addCompany,
    attendance, 
    pendingApprovals, 
    payrollRecords, 
    addEmployee, 
    updateEmployee,
    setEmployeeStatus,
    deleteEmployee,
    addPlant,
    updatePlant,
    deletePlant,
    approveRequest,
  } = useWorkforce();

  const handleMobileAttendanceClick = () => {
    setActiveTab('attendance');
    setTriggerMobileAttendance(true);
  };

  const handleMarkAttendanceClick = () => {
    setActiveTab('attendance');
    setTriggerMarkAttendance(true);
  };

  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [showEditEmpModal, setShowEditEmpModal] = useState(false);
  const [showAddPlantModal, setShowAddPlantModal] = useState(false);
  const [showEditPlantModal, setShowEditPlantModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [editingPlant, setEditingPlant] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // New Employee Form
  const [empForm, setEmpForm] = useState({
    id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    role: ROLES.PLANT_MANAGER,
    department: 'Batching & Operations',
    plant: plants[0]?.name || 'Main Plant Unit #01',
    salary: 35000,
    email: '',
    mobile: '',
    status: 'Pending Registration',
  });

  // Plant Form
  const [plantForm, setPlantForm] = useState({
    name: '',
    code: '',
    capacity: '120 m³/hr',
    location: '',
    status: 'Online',
  });

  const handleOpenAddEmp = () => {
    setEmpForm({
      id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      role: ROLES.PLANT_MANAGER,
      department: 'Batching & Operations',
      plant: plants[0]?.name || 'Main Plant Unit #01',
      salary: 35000,
      email: '',
      mobile: '',
      status: 'Active',
    });
    setShowAddEmpModal(true);
  };

  const handleOpenEditEmp = (emp) => {
    setEditingEmp(emp);
    setEmpForm({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      department: emp.department || 'Operations',
      plant: emp.plant || (plants[0]?.name || 'Central Plant'),
      salary: emp.salary || 30000,
      email: emp.email || '',
      mobile: (emp.mobile || '').replace(/\D/g, '').slice(-10),
      status: emp.status || 'Active',
    });
    setShowEditEmpModal(true);
  };

  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!empForm.name.trim()) return;

    const cleanMobile = (empForm.mobile || '').replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      const newEmp = addEmployee({
        id: empForm.id.trim().toUpperCase(),
        name: empForm.name,
        role: empForm.role,
        department: empForm.department,
        plant: empForm.plant,
        status: empForm.status,
        salary: Number(empForm.salary) || 30000,
        mobile: `+91 ${cleanMobile}`,
        email: empForm.email || `${empForm.name.toLowerCase().replace(/\s+/g, '.')}@smconcretech.com`,
      });
      setShowAddEmpModal(false);
      setToastMessage(`Employee ${newEmp.name} (${newEmp.id}) added successfully!`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveEditEmp = (e) => {
    e.preventDefault();
    if (!editingEmp) return;

    const cleanMobile = (empForm.mobile || '').replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    updateEmployee(editingEmp.id, {
      name: empForm.name,
      role: empForm.role,
      department: empForm.department,
      plant: empForm.plant,
      status: empForm.status,
      salary: Number(empForm.salary) || 30000,
      mobile: `+91 ${cleanMobile}`,
      email: empForm.email,
    });
    setShowEditEmpModal(false);
    setToastMessage(`Employee ${editingEmp.id} profile updated.`);
  };

  const handleDeleteEmployee = (id) => {
    if (window.confirm(`Permanently remove employee ${id} from enterprise directory?`)) {
      deleteEmployee(id);
      setToastMessage(`Employee ${id} deleted permanently.`);
    }
  };

  // Plant Actions
  const handleOpenAddPlant = () => {
    setPlantForm({
      name: '',
      code: '',
      capacity: '90 m³/hr',
      location: '',
      status: 'Online',
    });
    setShowAddPlantModal(true);
  };

  const handleOpenEditPlant = (plt) => {
    setEditingPlant(plt);
    setPlantForm({
      name: plt.name,
      code: plt.code,
      capacity: plt.capacity,
      location: plt.location || '',
      status: plt.status || 'Online',
    });
    setShowEditPlantModal(true);
  };

  const handleSaveAddPlant = (e) => {
    e.preventDefault();
    const name = plantForm.name.trim();
    const capacity = plantForm.capacity.trim();
    const code = (plantForm.code.trim() || name.replace(/[^a-z0-9]/gi, '').slice(0, 3) || 'PLT').toUpperCase();

    if (!name || !capacity) {
      setToastMessage('Enter a plant name and concrete capacity.');
      return;
    }

    const duplicate = plants.some((plant) =>
      (plant.name || '').trim().toLowerCase() === name.toLowerCase() ||
      (plant.code || '').trim().toLowerCase() === code.toLowerCase()
    );
    if (duplicate) {
      setToastMessage('A plant with this name or node code already exists.');
      return;
    }

    try {
      addPlant({
        name,
        code,
        capacity,
        location: plantForm.location.trim(),
        status: plantForm.status,
      });
      setShowAddPlantModal(false);
      setToastMessage(`Plant "${name}" registered successfully.`);
      setPlantForm({ name: '', code: '', capacity: '90 m³/hr', location: '', status: 'Online' });
    } catch (error) {
      console.error('Failed to register plant:', error);
      setToastMessage(`Could not register plant: ${error.message}`);
    }
  };

  const handleSaveEditPlant = (e) => {
    e.preventDefault();
    if (!editingPlant) return;

    updatePlant(editingPlant.id, {
      name: plantForm.name,
      code: plantForm.code,
      capacity: plantForm.capacity,
      location: plantForm.location,
      status: plantForm.status,
    });
    setShowEditPlantModal(false);
    setToastMessage(`Plant "${plantForm.name}" updated successfully.`);
  };

  const handleDeletePlant = (id, name) => {
    if (window.confirm(`De-register concrete plant "${name}"?`)) {
      deletePlant(id);
      setToastMessage(`Plant "${name}" de-registered.`);
    }
  };

  const plantColumns = [
    {
      header: 'Node Code',
      accessor: 'code',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
          {row.code || 'PLT'}
        </span>
      ),
    },
    {
      header: 'Plant Facility Name',
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
            <Factory className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-xs block">{row.name}</span>
            {row.location && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{row.location}</span>
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Hourly Capacity',
      accessor: 'capacity',
      render: (row) => (
        <span className="font-mono font-bold text-slate-800 text-xs">{row.capacity}</span>
      ),
    },
    {
      header: 'Operating Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'Online'} />,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleOpenEditPlant(row)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
            title={`Edit ${row.name}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDeletePlant(row.id, row.name)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title={`Delete ${row.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const columns = [
    {
      header: 'Employee ID',
      accessor: 'id',
      width: '10%',
      render: (row) => <span className="font-mono text-amber-600 font-bold text-xs whitespace-nowrap block">{row.id}</span>,
    },
    {
      header: 'Staff Name',
      accessor: 'name',
      width: '18%',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-slate-800 text-xs truncate leading-snug">{row.name}</div>
          <div className="text-[10px] text-slate-400 font-mono truncate leading-none mt-0.5">{row.email}</div>
        </div>
      ),
    },
    {
      header: 'Assigned Role',
      accessor: 'role',
      width: '12%',
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 border border-amber-200 text-amber-800 whitespace-nowrap inline-block leading-none">
          {row.role}
        </span>
      ),
    },
    {
      header: 'Department',
      accessor: 'department',
      width: '14%',
      render: (row) => (
        <span className="text-xs text-slate-700 leading-snug block">{row.department}</span>
      ),
    },
    {
      header: 'Plant Location',
      accessor: 'plant',
      width: '13%',
      render: (row) => (
        <span className="text-xs text-slate-600 leading-snug block">{row.plant}</span>
      ),
    },
    {
      header: 'Monthly Wage',
      accessor: 'salary',
      width: '13%',
      render: (row) => (
        <span className="font-mono text-xs text-slate-800 font-semibold whitespace-nowrap block">
          ₹ {Number(row.salary || 30000).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      type: 'status',
      width: '8%',
    },
    {
      header: 'Actions',
      align: 'right',
      width: '12%',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditEmp(row);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer shrink-0"
            title="Edit Employee"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEmployee(row.id);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
            title="Delete Employee"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const TAB_HEADER_MAP = {
    dashboard: {
      title: 'System Administration',
      badge: 'ROOT CONTROL',
    },
    employees: {
      title: 'Employee Directory Records',
      badge: 'STAFF',
    },
    attendance: {
      title: 'Attendance & Live Duty',
      badge: 'LIVE TERMINAL',
    },
    shifts: {
      title: 'Shifts & Roster Management',
      badge: 'ROSTER',
    },
    billing: {
      title: 'Cash Memos & Billing',
      badge: 'FINANCE',
    },
    approvals: {
      title: 'Approvals Hub',
      badge: 'CLEARANCE',
    },
    payroll: {
      title: 'Payroll Preparation',
      badge: 'PAYROLL',
    },
    reports: {
      title: 'HR & Operational Reports',
      badge: 'REPORTS',
    },
    documents: {
      title: 'Employee Documents',
      badge: 'VAULT',
    },
    audit: {
      title: 'Security & Audit Logs',
      badge: 'AUDIT',
    },
    settings: {
      title: 'System Configuration',
      badge: 'CONFIG',
    },
  };

  const activeHeader = TAB_HEADER_MAP[activeTab] || TAB_HEADER_MAP.dashboard;

  return (
    <AppLayout
      title={activeHeader.title}
      subtitle={activeHeader.subtitle}
      badge={activeHeader.badge}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    >
      {activeTab === 'employees' && <EmployeeManagementView />}
      {activeTab === 'attendance' && (
        <AttendanceManagementView 
          triggerMarkAttendance={triggerMarkAttendance}
          triggerMobileAttendance={triggerMobileAttendance}
          onMarkAttendanceReset={() => setTriggerMarkAttendance(false)}
          onMobileAttendanceReset={() => setTriggerMobileAttendance(false)}
        />
      )}
      {activeTab === 'shifts' && <ShiftManagementView />}
      {activeTab === 'billing' && <BillingManagementView />}
      {activeTab === 'approvals' && <ApprovalsView />}
      {activeTab === 'payroll' && <PayrollPreparationView />}
      {activeTab === 'reports' && <HrReportsView />}
      {activeTab === 'documents' && <EmployeeDocumentsView />}
      {activeTab === 'audit' && <AuditLogsView />}
      {activeTab === 'settings' && <HrSettingsView />}

      {activeTab === 'dashboard' && (
        <div className="w-full flex-1 flex flex-col space-y-3 pb-4">
          {/* 4 Primary Phase 1 KPI Cards — Unified Royal Executive Theme */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 shrink-0">
            <KPICard
              title="Total Workforce"
              value={employees.length}
              subtext={`${employees.filter((e) => e.status === 'Active').length} Active Duty`}
              trend={`${employees.length} Enrolled`}
              trendType="up"
              color="blue"
              icon={Users}
              onClick={() => setActiveKpiModal('workforce')}
            />
            <KPICard
              title="Today's Attendance"
              value={`${attendance.filter((a) => a.status === 'Present').length} Present`}
              subtext={`${attendance.filter((a) => a.lateStatus).length} Late Arrivals`}
              trend="Biometric Sync"
              trendType="up"
              color="blue"
              icon={Building2}
              onClick={() => setActiveKpiModal('attendance')}
            />
            <KPICard
              title="Pending Approvals"
              value={`${pendingApprovals.length} Requests`}
              subtext="Leaves, advances & work"
              trend="Action Needed"
              trendType={pendingApprovals.length > 0 ? 'down' : 'up'}
              color="blue"
              icon={ShieldCheck}
              onClick={() => setActiveKpiModal('approvals')}
            />
            <KPICard
              title="Payroll Status"
              value={payrollRecords.length > 0 ? `${payrollRecords.length} Slips` : 'Draft'}
              subtext="October 2026 Ready"
              trend="Audited"
              trendType="up"
              color="blue"
              icon={KeyRound}
              onClick={() => setActiveKpiModal('payroll')}
            />
          </section>

          {/* Primary Operations Table: Plant Facilities Network */}
          <section>
            <DataTable
              title="Registered Plant Network & Facilities"
              subtitle="Concrete batching nodes, hourly throughput capacity and operational clearance"
              icon={Factory}
              columns={plantColumns}
              data={plants}
              searchPlaceholder="Search plant node, facility name, location..."
              actions={
                <button
                  type="button"
                  onClick={handleOpenAddPlant}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Plant Node</span>
                </button>
              }
              renderMobileCard={(plant) => (
                <div className="w-full max-w-full overflow-hidden min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">{plant.code}</span>
                        <h4 className="text-sm font-bold text-slate-900 truncate">{plant.name}</h4>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{plant.location || 'Industrial Estate'}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={plant.status || 'Online'} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Capacity:</span>
                      <span className="font-mono font-bold text-slate-900">{plant.capacity}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPlant(plant)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlant(plant.id, plant.name)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            />
          </section>
        </div>
      )}

      {/* Modal: Add Employee — Compact High-Density Grid */}
      <Modal
        isOpen={showAddEmpModal}
        onClose={() => setShowAddEmpModal(false)}
        title="Register New Plant Employee"
        subtitle="Add a personnel profile with role-based access clearance."
        icon={UserPlus}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleAddEmployee} className="space-y-2 sm:space-y-2.5 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Employee ID *
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  required
                  value={empForm.id}
                  onChange={(e) => setEmpForm({ ...empForm, id: e.target.value })}
                  placeholder="e.g. EMP-DRI-001"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setEmpForm({ ...empForm, id: `EMP-${Math.floor(100 + Math.random() * 900)}` })}
                  className="px-2 py-1 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors cursor-pointer shrink-0"
                  title="Generate ID"
                >
                  Auto
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Full Employee Name *
              </label>
              <input
                type="text"
                required
                value={empForm.name}
                onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                placeholder="e.g. Ramesh Patil"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Designated Role *
              </label>
              <select
                value={empForm.role}
                onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                {Object.values(ROLES).map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Operational Plant *
              </label>
              <select
                value={empForm.plant}
                onChange={(e) => setEmpForm({ ...empForm, plant: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                {plants.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Basic Monthly Wage (₹) *
              </label>
              <input
                type="number"
                value={empForm.salary}
                onChange={(e) => setEmpForm({ ...empForm, salary: e.target.value })}
                required
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Department
              </label>
              <input
                type="text"
                value={empForm.department}
                onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                placeholder="e.g. Batching, Quality, Fleet"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Account Status
              </label>
              <select
                value={empForm.status}
                onChange={(e) => setEmpForm({ ...empForm, status: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="Pending Registration">Pending Registration</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Active">Active Duty</option>
                <option value="Rejected">Rejected</option>
                <option value="On Leave">On Leave</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Mobile Number (10 Digits) *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-xs font-mono font-bold text-slate-500 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="9820044001"
                  value={empForm.mobile}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setEmpForm({ ...empForm, mobile: digits });
                  }}
                  className="w-full pl-11 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Work Email Address
              </label>
              <input
                type="email"
                value={empForm.email}
                onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                placeholder="e.g. ramesh@smconcretech.com"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAddEmpModal(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs cursor-pointer"
            >
              Save Employee
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Employee — Compact High-Density Grid */}
      <Modal
        isOpen={showEditEmpModal}
        onClose={() => setShowEditEmpModal(false)}
        title="Edit Employee Information"
        subtitle={`Update dossier parameters for ${editingEmp?.name} (${editingEmp?.id})`}
        icon={Edit3}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSaveEditEmp} className="space-y-2 sm:space-y-2.5 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Employee ID (Read Only)
              </label>
              <input
                type="text"
                disabled
                value={empForm.id}
                className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-blue-700 font-mono font-bold text-xs cursor-not-allowed"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Full Employee Name *
              </label>
              <input
                type="text"
                required
                value={empForm.name}
                onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Designated Role *
              </label>
              <select
                value={empForm.role}
                onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                {Object.values(ROLES).map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Operational Plant *
              </label>
              <select
                value={empForm.plant}
                onChange={(e) => setEmpForm({ ...empForm, plant: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                {plants.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Basic Monthly Wage (₹) *
              </label>
              <input
                type="number"
                value={empForm.salary}
                onChange={(e) => setEmpForm({ ...empForm, salary: e.target.value })}
                required
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Department
              </label>
              <input
                type="text"
                value={empForm.department}
                onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Account Status
              </label>
              <select
                value={empForm.status}
                onChange={(e) => setEmpForm({ ...empForm, status: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="Active">Active Duty</option>
                <option value="On Leave">On Leave</option>
                <option value="Suspended">Suspended</option>
                <option value="Resigned">Resigned</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Mobile Number (10 Digits) *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-xs font-mono font-bold text-slate-500 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="9820044001"
                  value={empForm.mobile}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setEmpForm({ ...empForm, mobile: digits });
                  }}
                  className="w-full pl-11 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                Work Email Address
              </label>
              <input
                type="email"
                value={empForm.email}
                onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowEditEmpModal(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Plant */}
      <Modal
        isOpen={showAddPlantModal}
        onClose={() => setShowAddPlantModal(false)}
        title="Register New Concrete Plant Node"
        subtitle="Connect telemetry and SCADA dispatch network."
        icon={Building2}
      >
        <form onSubmit={handleSaveAddPlant} className="space-y-3.5 p-4 rounded-xl border border-slate-200 bg-white text-xs">
          <div className="rounded-xl border border-blue-100 bg-white/65 px-3.5 py-3 text-xs leading-relaxed text-slate-700 shadow-sm backdrop-blur-md">
            Add the plant’s operating details. Leave the node code blank to generate it from the plant name.
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              Plant Name *
            </label>
            <input
              type="text"
              required
              value={plantForm.name}
              onChange={(e) => setPlantForm({ ...plantForm, name: e.target.value })}
              placeholder="e.g. Highway Hub #04 (Kalyan)"
              className="w-full rounded-xl border border-blue-200 bg-white/80 px-3.5 py-2.5 font-medium text-slate-950 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                Node Code
              </label>
              <input
                type="text"
                value={plantForm.code}
                onChange={(e) => setPlantForm({ ...plantForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. KLN"
                className="w-full rounded-xl border border-blue-200 bg-white/80 px-3.5 py-2.5 font-mono font-bold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                Concrete Capacity *
              </label>
              <input
                type="text"
                required
                value={plantForm.capacity}
                onChange={(e) => setPlantForm({ ...plantForm, capacity: e.target.value })}
                placeholder="e.g. 120 m³/hr"
                className="w-full rounded-xl border border-blue-200 bg-white/80 px-3.5 py-2.5 font-medium text-slate-950 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              Physical Location / Address
            </label>
            <input
              type="text"
              value={plantForm.location}
              onChange={(e) => setPlantForm({ ...plantForm, location: e.target.value })}
              placeholder="e.g. MIDC Phase 2, Industrial Road"
              className="w-full rounded-xl border border-blue-200 bg-white/80 px-3.5 py-2.5 font-medium text-slate-950 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              Operational Status
            </label>
            <select
              value={plantForm.status}
              onChange={(e) => setPlantForm({ ...plantForm, status: e.target.value })}
              className="w-full cursor-pointer rounded-xl border border-blue-200 bg-white/80 px-3.5 py-2.5 font-medium text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
            >
              <option value="Online">Online • Broadcasting Telemetry</option>
              <option value="Standby">Standby • Available for Routing</option>
              <option value="Maintenance">Maintenance • Calibration</option>
            </select>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-blue-200/80 pt-3">
            <button
              type="button"
              onClick={() => setShowAddPlantModal(false)}
              className="rounded-xl border border-blue-100 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-blue-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700 cursor-pointer"
            >
              Save Plant Node
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Plant */}
      <Modal
        isOpen={showEditPlantModal}
        onClose={() => setShowEditPlantModal(false)}
        title="Edit Concrete Plant Node"
        subtitle={`Update configuration for ${editingPlant?.name} (${editingPlant?.code})`}
        icon={Edit3}
      >
        <form onSubmit={handleSaveEditPlant} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              Plant Name *
            </label>
            <input
              type="text"
              required
              value={plantForm.name}
              onChange={(e) => setPlantForm({ ...plantForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                Node Code *
              </label>
              <input
                type="text"
                required
                value={plantForm.code}
                onChange={(e) => setPlantForm({ ...plantForm, code: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                Concrete Capacity *
              </label>
              <input
                type="text"
                required
                value={plantForm.capacity}
                onChange={(e) => setPlantForm({ ...plantForm, capacity: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              Physical Location / Address
            </label>
            <input
              type="text"
              value={plantForm.location}
              onChange={(e) => setPlantForm({ ...plantForm, location: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              Operational Status
            </label>
            <select
              value={plantForm.status}
              onChange={(e) => setPlantForm({ ...plantForm, status: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
            >
              <option value="Online">Online • Broadcasting Telemetry</option>
              <option value="Standby">Standby • Available for Routing</option>
              <option value="Maintenance">Maintenance • Calibration</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowEditPlantModal(false)}
              className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs cursor-pointer"
            >
              Update Plant Node
            </button>
          </div>
        </form>
      </Modal>

      {/* KPI Detail Modal: Total Workforce */}
      <Modal
        isOpen={activeKpiModal === 'workforce'}
        onClose={() => setActiveKpiModal(null)}
        title="Total Workforce Directory & Roster"
        subtitle={`${employees.length} personnel enrolled across batching, transport, lab, and operational units`}
        icon={Users}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80">
              <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Total Enrolled</div>
              <div className="text-xl font-black text-indigo-950 font-mono mt-0.5">{employees.length}</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Active Duty</div>
              <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">
                {employees.filter(e => e.status === 'Active').length}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pending Reg/Approval</div>
              <div className="text-xl font-black text-amber-950 font-mono mt-0.5">
                {employees.filter(e => e.status?.includes('Pending')).length}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">On Leave / Other</div>
              <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                {employees.filter(e => e.status === 'On Leave' || e.status === 'Inactive' || e.status === 'Suspended').length}
              </div>
            </div>
          </div>

          {/* Enrolled Staff Roster List */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>Enrolled Workforce Personnel</span>
              <span className="text-[11px] font-mono text-slate-500 font-normal">{employees.length} records</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {employees.length > 0 ? (
                employees.map((emp) => (
                  <div key={emp.id} className="p-3 hover:bg-slate-50/80 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 shrink-0">
                        {emp.id}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{emp.role} • {emp.plant} • {emp.mobile}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={emp.status} size="xs" />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveKpiModal(null);
                          handleOpenEditEmp(emp);
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Employee"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">No employees registered yet.</div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => {
                setActiveKpiModal(null);
                handleOpenAddEmp();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Employee</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveKpiModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveKpiModal(null);
                  setActiveTab('employees');
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <span>Open Full Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* KPI Detail Modal: Today's Attendance */}
      <Modal
        isOpen={activeKpiModal === 'attendance'}
        onClose={() => setActiveKpiModal(null)}
        title="Today's Attendance Register"
        subtitle="Live biometric punch logs synchronized with plant control units"
        icon={Building2}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80">
              <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Present On Duty</div>
              <div className="text-xl font-black text-blue-950 font-mono mt-0.5">
                {attendance.filter(a => a.status === 'Present').length} Staff
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Late Arrivals</div>
              <div className="text-xl font-black text-amber-950 font-mono mt-0.5">
                {attendance.filter(a => a.lateStatus).length}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80">
              <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Approved Leave</div>
              <div className="text-xl font-black text-purple-950 font-mono mt-0.5">
                {attendance.filter(a => a.status === 'On Leave' || a.status === 'Leave').length}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/80">
              <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Absent / No-Show</div>
              <div className="text-xl font-black text-rose-950 font-mono mt-0.5">
                {attendance.filter(a => a.status === 'Absent').length}
              </div>
            </div>
          </div>

          {/* Today's Punch Roster */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>Today's Biometric Punch Logs</span>
              <span className="text-[11px] font-mono text-slate-500 font-normal">{attendance.length} punch records</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {attendance.length > 0 ? (
                attendance.map((rec, idx) => (
                  <div key={rec.id || idx} className="p-3 hover:bg-slate-50/80 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 shrink-0">
                        {rec.employeeId || rec.id}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{rec.employeeName || rec.name}</div>
                        <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>In: {formatToIndian12Hr(rec.punchIn || rec.checkIn || rec.inTime) || '08:00 AM'}</span>
                          <span>• Out: {formatToIndian12Hr(rec.punchOut || rec.checkOut || rec.outTime) || 'On Duty'}</span>
                          {rec.plant && <span>• {rec.plant}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {rec.lateStatus && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Late Arrival
                        </span>
                      )}
                      <StatusBadge status={rec.status || 'Present'} size="xs" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">No attendance records logged for today yet.</div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => {
                setActiveKpiModal(null);
                handleMarkAttendanceClick();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Mark Attendance</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveKpiModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveKpiModal(null);
                  setActiveTab('attendance');
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <span>Open Attendance Module</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* KPI Detail Modal: Pending Approvals */}
      <Modal
        isOpen={activeKpiModal === 'approvals'}
        onClose={() => setActiveKpiModal(null)}
        title="Pending Enterprise Approvals"
        subtitle={`${pendingApprovals.length} requests awaiting managerial or root authorization`}
        icon={ShieldCheck}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Total Pending</div>
              <div className="text-xl font-black text-amber-950 font-mono mt-0.5">{pendingApprovals.length} Requests</div>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80">
              <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Leaves & Shifts</div>
              <div className="text-xl font-black text-purple-950 font-mono mt-0.5">
                {pendingApprovals.filter(a => a.category === 'leave' || a.category === 'work').length}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-cyan-50/70 border border-cyan-200/80 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider">Salary Advances / Loans</div>
              <div className="text-xl font-black text-cyan-950 font-mono mt-0.5">
                {pendingApprovals.filter(a => a.category === 'advance' || a.category === 'loan').length}
              </div>
            </div>
          </div>

          {/* Pending Action Items Queue */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>Approval Action Queue</span>
              <span className="text-[11px] font-mono text-slate-500 font-normal">{pendingApprovals.length} items</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {pendingApprovals.length > 0 ? (
                pendingApprovals.map((req) => (
                  <div key={req.id} className="p-3.5 hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 shrink-0 uppercase">
                          {req.category || 'Request'}
                        </span>
                        <span className="font-bold text-slate-900 truncate">{req.requester || req.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">({req.employeeId || req.empId})</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 font-medium">
                        {req.reason || req.description || req.details || req.type}
                      </div>
                      {req.date && <div className="text-[10px] text-slate-400 mt-0.5">{req.date}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          approveRequest(req.category, req.id, 'Approved', 'Approved via quick review');
                          setToastMessage(`Request for ${req.requester || req.name} approved.`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          approveRequest(req.category, req.id, 'Rejected', 'Rejected via quick review');
                          setToastMessage(`Request for ${req.requester || req.name} rejected.`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <span className="font-semibold text-slate-700">All Caught Up!</span>
                  <span>No pending approval requests currently require administrative review.</span>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveKpiModal(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveKpiModal(null);
                setActiveTab('approvals');
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <span>Open Approvals Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Modal>

      {/* KPI Detail Modal: Payroll Status */}
      <Modal
        isOpen={activeKpiModal === 'payroll'}
        onClose={() => setActiveKpiModal(null)}
        title="Payroll Status & Wage Summary"
        subtitle="October 2026 Monthly Wage Cycle and Payment Disbursements"
        icon={KeyRound}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Payroll Cycle Status</div>
              <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">
                {payrollRecords.length > 0 ? `${payrollRecords.length} Slips Generated` : 'Draft Ready'}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-cyan-50/70 border border-cyan-200/80">
              <div className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider">Estimated Monthly Outflow</div>
              <div className="text-xl font-black text-cyan-950 font-mono mt-0.5">
                ₹ {employees.reduce((acc, e) => acc + Number(e.salary || 30000), 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Audit & Compliance</div>
              <div className="text-xl font-black text-indigo-950 font-mono mt-0.5">Audited & Ready</div>
            </div>
          </div>

          {/* Wage Breakdown */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>Employee Wage Breakdown</span>
              <span className="text-[11px] font-mono text-slate-500 font-normal">{employees.length} employees</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {employees.length > 0 ? (
                employees.map((emp) => (
                  <div key={emp.id} className="p-3 hover:bg-slate-50/80 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
                        {emp.id}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{emp.role} • {emp.plant}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 text-xs block">
                          ₹ {Number(emp.salary || 30000).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-medium">Standard Wage</span>
                      </div>
                      <StatusBadge status="Optimal" size="xs" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">No payroll records to display.</div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveKpiModal(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveKpiModal(null);
                setActiveTab('payroll');
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <span>Open Payroll Module</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </AppLayout>
  );
}
