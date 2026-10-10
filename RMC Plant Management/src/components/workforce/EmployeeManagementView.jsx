import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Phone, 
  Mail, 
  Briefcase, 
  Calendar, 
  IndianRupee, 
  ShieldCheck, 
  FileText,
  UserCheck,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../data/mockUsers';
import { MOCK_PLANTS } from '../../data/mockDashboardData';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';

export default function EmployeeManagementView({ defaultPlant = 'All Plants' }) {
  const { user } = useAuth();
  const { 
    employees, 
    shifts, 
    addEmployee, 
    updateEmployee, 
    setEmployeeStatus, 
    deleteEmployee,
    approveEmployeeRegistration,
    rejectEmployeeRegistration
  } = useWorkforce();

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlant, setSelectedPlant] = useState(defaultPlant);
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Helper: Get verified employee photo
  const getEmployeePhoto = (emp) => {
    if (emp?.avatarUrl) return emp.avatarUrl;
    if (emp?.selfieUrl) return emp.selfieUrl;
    if (emp?.photoUrl) return emp.photoUrl;
    return null;
  };

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    mobile: '',
    email: '',
    role: ROLES.PLANT_MANAGER,
    department: 'Plant Operations & Batching',
    plant: MOCK_PLANTS[0]?.name || 'Main Plant Unit #01',
    joiningDate: new Date().toISOString().split('T')[0],
    dob: '1992-05-15',
    salary: 45000,
    employmentType: 'Full Time Permanent',
    status: 'Pending Registration',
    address: '',
    emergencyName: '',
    emergencyRelation: 'Spouse',
    emergencyPhone: '',
    bankName: 'HDFC Bank',
    accountNo: '',
    ifsc: '',
    shiftId: 'SFT-GEN',
  });

  const [formError, setFormError] = useState(null);

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.mobile?.includes(searchTerm);

    const matchesPlant = selectedPlant === 'All Plants' || emp.plant === selectedPlant;
    const matchesDept = selectedDept === 'All' || emp.department === selectedDept;
    const matchesRole = selectedRole === 'All' || emp.role === selectedRole;
    const matchesStatus = selectedStatus === 'All' || emp.status === selectedStatus;

    return matchesSearch && matchesPlant && matchesDept && matchesRole && matchesStatus;
  });

  const handleOpenAdd = () => {
    setFormData({
      id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      mobile: '+91 ',
      email: '',
      role: ROLES.DRIVER,
      department: 'Transit Mixer Fleet',
      plant: selectedPlant !== 'All Plants' ? selectedPlant : (MOCK_PLANTS[0]?.name || 'Main Plant Unit #01'),
      joiningDate: new Date().toISOString().split('T')[0],
      dob: '1995-01-01',
      salary: 32000,
      employmentType: 'Full Time Permanent',
      status: 'Pending Registration',
      address: '',
      emergencyName: '',
      emergencyRelation: 'Family',
      emergencyPhone: '',
      bankName: 'State Bank of India',
      accountNo: '',
      ifsc: '',
      shiftId: 'SFT-MORN',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleSaveAdd = (e) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.name.trim()) {
      setFormError('Please enter full employee name.');
      return;
    }
    if (!formData.id.trim()) {
      setFormError('Please provide a unique Employee ID.');
      return;
    }
    if (formData.mobile.trim().length < 10) {
      setFormError('Please enter a valid mobile number with at least 10 digits.');
      return;
    }

    try {
      const generatedEmail = formData.email?.trim() || `${formData.name.toLowerCase().replace(/\s+/g, '.')}@smconcretech.com`;

      addEmployee({
        id: formData.id,
        name: formData.name,
        mobile: formData.mobile,
        email: generatedEmail,
        role: formData.role,
        department: formData.department,
        plant: formData.plant,
        joiningDate: formData.joiningDate,
        dob: formData.dob,
        salary: Number(formData.salary) || 30000,
        employmentType: formData.employmentType,
        status: formData.status,
        address: formData.address || 'Navi Mumbai Plant Industrial Zone',
        emergencyContact: {
          name: formData.emergencyName || 'Relative',
          relation: formData.emergencyRelation || 'Family',
          phone: formData.emergencyPhone || formData.mobile,
        },
        bankDetails: {
          bankName: formData.bankName,
          accountNo: formData.accountNo || 'XXXX-XXXX-1234',
          ifsc: formData.ifsc || 'SBIN0001920',
        },
        shiftId: formData.shiftId,
      });

      setShowAddModal(false);
      setToastMessage(`Employee ${formData.name} (${formData.id}) registered successfully.`);
      setFormData({
        id: '',
        name: '',
        mobile: '',
        email: '',
        role: ROLES.DRIVER,
        department: 'Transit Mixer Fleet',
        plant: selectedPlant !== 'All Plants' ? selectedPlant : (MOCK_PLANTS[0]?.name || 'Main Plant Unit #01'),
        joiningDate: new Date().toISOString().split('T')[0],
        dob: '1995-01-01',
        salary: 32000,
        employmentType: 'Full Time Permanent',
        status: 'Active',
        address: '',
        emergencyName: '',
        emergencyRelation: 'Family',
        emergencyPhone: '',
        bankName: 'State Bank of India',
        accountNo: '',
        ifsc: '',
        shiftId: 'SFT-MORN',
      });
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDelete = (id, name) => {
    deleteEmployee(id);
    setToastMessage(`Employee ${name || id} (${id}) has been removed from workforce records.`);
  };

  const handleOpenEdit = (emp) => {
    setActiveEmployee(emp);
    setFormData({
      ...emp,
      emergencyName: emp.emergencyContact?.name || '',
      emergencyRelation: emp.emergencyContact?.relation || '',
      emergencyPhone: emp.emergencyContact?.phone || '',
      bankName: emp.bankDetails?.bankName || '',
      accountNo: emp.bankDetails?.accountNo || '',
      ifsc: emp.bankDetails?.ifsc || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!activeEmployee) return;

    updateEmployee(activeEmployee.id, {
      name: formData.name,
      mobile: formData.mobile,
      email: formData.email,
      role: formData.role,
      department: formData.department,
      plant: formData.plant,
      salary: Number(formData.salary),
      employmentType: formData.employmentType,
      status: formData.status,
      shiftId: formData.shiftId,
      address: formData.address,
      emergencyContact: {
        name: formData.emergencyName,
        relation: formData.emergencyRelation,
        phone: formData.emergencyPhone,
      },
      bankDetails: {
        bankName: formData.bankName,
        accountNo: formData.accountNo,
        ifsc: formData.ifsc,
      },
    });

    setShowEditModal(false);
    setToastMessage(`Employee profile ${activeEmployee.id} updated.`);
  };

  // Table Columns
  const columns = [
    {
      header: 'Employee ID',
      accessor: 'id',
      width: '12%',
      render: (row) => (
        <span className="font-mono text-cyan-800 font-bold bg-cyan-50/90 px-2 py-0.5 rounded-lg border border-cyan-200/90 inline-block text-[11px] whitespace-nowrap leading-none shadow-2xs">
          {row.id}
        </span>
      ),
    },
    {
      header: 'Full Name',
      accessor: 'name',
      width: '16%',
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
              <div className="text-[10px] text-slate-400 font-mono truncate leading-none mt-0.5">{row.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Enterprise Role',
      accessor: 'role',
      width: '12%',
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
      header: 'Department',
      accessor: 'department',
      width: '12%',
      render: (row) => (
        <span className="font-semibold text-slate-800 text-[11px] leading-tight block">
          {row.department}
        </span>
      ),
    },
    {
      header: 'Assigned Plant',
      accessor: 'plant',
      width: '12%',
      render: (row) => (
        <span className="font-medium text-slate-700 text-[11px] leading-tight block">
          {row.plant}
        </span>
      ),
    },
    {
      header: 'Mobile',
      accessor: 'mobile',
      width: '12%',
      render: (row) => (
        <span className="font-mono text-slate-800 text-[11px] font-semibold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 whitespace-nowrap inline-block">
          {row.mobile}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      type: 'status',
      width: '12%',
    },
    {
      header: 'Actions',
      accessor: 'actions',
      align: 'right',
      width: '12%',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveEmployee(row);
              setShowProfileModal(true);
            }}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-cyan-700 border border-slate-200/80 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 flex items-center justify-center"
            title="View Employee Dossier"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 hover:text-cyan-900 border border-cyan-200/80 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 flex items-center justify-center"
            title="Edit Profile"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          {row.status === 'Pending Approval' && (
            <button
              type="button"
              onClick={() => {
                approveEmployeeRegistration(row.id);
                setToastMessage(`Registration approved: ${row.name} (${row.id}) is now Active.`);
              }}
              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 flex items-center justify-center"
              title="Approve Employee Registration"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleDelete(row.id, row.name)}
            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 border border-rose-200/80 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 flex items-center justify-center"
            title="Permanently Delete Employee"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.status === 'Active').length;
  const onLeaveCount = employees.filter((e) => e.status === 'On Leave' || e.status === 'Leave').length;

  return (
    <div className="space-y-6">
      {/* Filter and Action Control Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, ID, phone, email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20 focus:bg-white font-medium transition-all"
            />
          </div>

          <select
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 border border-slate-300 text-slate-800 font-bold focus:outline-none focus:border-cyan-600 cursor-pointer shadow-2xs transition-all"
          >
            <option value="All Plants">All Plant Units</option>
            {MOCK_PLANTS.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 border border-slate-300 text-slate-800 font-bold focus:outline-none focus:border-cyan-600 cursor-pointer shadow-2xs transition-all"
          >
            <option value="All">All Roles</option>
            {Object.values(ROLES).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 border border-slate-300 text-slate-800 font-bold focus:outline-none focus:border-cyan-600 cursor-pointer shadow-2xs transition-all"
          >
            <option value="All">All Statuses</option>
            <option value="Pending Registration">Pending Registration</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Active">Active</option>
            <option value="Rejected">Rejected</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-lg shadow-blue-500/25 active:scale-[0.98]"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Main Employee Table */}
      <DataTable
        title="Enterprise Employee Directory"
        subtitle="Complete records for batching operators, mixer drivers, QC engineers, supervisors, and administrative staff"
        icon={Users}
        columns={columns}
        data={filteredEmployees}
        allowFullscreen={true}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md shadow-blue-500/20 active:scale-[0.98]"
            title="Add Employee to Directory"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Employee</span>
          </button>
        }
        renderMobileCard={(row) => (
          <div className="w-full max-w-full overflow-hidden min-w-0 space-y-2.5">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">{row.name}</div>
                <div className="text-xs font-mono text-amber-400">{row.id} • {row.role}</div>
              </div>
              <StatusBadge status={row.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 uppercase block">Plant</span>
                <span className="text-slate-300 truncate block">{row.plant}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 uppercase block">Mobile</span>
                <span className="text-slate-300 font-mono truncate block">{row.mobile}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 uppercase block">Department</span>
                <span className="text-slate-300 truncate block">{row.department}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 uppercase block">Shift</span>
                <span className="text-purple-300 font-mono truncate block">{row.shiftId}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveEmployee(row);
                  setShowProfileModal(true);
                }}
                className="flex-1 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 border border-slate-800 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Profile</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenEdit(row)}
                className="flex-1 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(row.id, row.name)}
                className="py-1.5 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-xs font-semibold text-red-400 border border-red-800/40 flex items-center justify-center gap-1 cursor-pointer"
                title="Delete Employee"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      />

      {/* Add Employee Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Employee"
        subtitle="Create verified workforce record with plant assignment, role, and salary parameters."
        icon={UserPlus}
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-700 font-bold block mb-1">Employee ID *</label>
              <input
                type="text"
                required
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Mobile Number *</label>
              <input
                type="text"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+91 98200 XXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Work Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@smconcretech.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
              >
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Assigned Plant *</label>
              <select
                value={formData.plant}
                onChange={(e) => setFormData({ ...formData, plant: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
              >
                {MOCK_PLANTS.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Assigned Shift</label>
              <select
                value={formData.shiftId}
                onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Monthly Basic Salary (₹) *</label>
              <input
                type="number"
                required
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Employment Type</label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
              >
                <option value="Full Time Permanent">Full Time Permanent</option>
                <option value="Contract Basis">Contract Basis</option>
                <option value="Trainee">Trainee</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 cursor-pointer"
            >
              Confirm Registration
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Employee (${activeEmployee?.id})`}
        subtitle="Modify operational parameters, assigned shift, and employment status."
        icon={Edit3}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-700 font-bold block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Mobile</label>
              <input
                type="text"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Plant Location</label>
              <select
                value={formData.plant}
                onChange={(e) => setFormData({ ...formData, plant: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
              >
                {MOCK_PLANTS.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
                <option value="Resigned">Resigned</option>
              </select>
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Shift</label>
              <select
                value={formData.shiftId}
                onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Basic Salary (₹)</label>
              <input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Employee Profile Dossier Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title={activeEmployee ? `${activeEmployee.name} (${activeEmployee.id})` : 'Employee Dossier'}
        subtitle="Detailed personnel information, banking parameters, and emergency contact details."
        icon={UserCheck}
      >
        {activeEmployee && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <img 
                  src={getEmployeePhoto(activeEmployee)} 
                  alt={activeEmployee.name} 
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0" 
                />
                <div>
                  <div className="font-bold text-slate-900 text-sm">{activeEmployee.name}</div>
                  <div className="text-slate-500 font-mono text-[11px]">{activeEmployee.role} • {activeEmployee.id}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Verified Biometric Profile</span>
                  </div>
                </div>
              </div>
              <StatusBadge status={activeEmployee.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Plant</span>
                <span className="text-slate-900 font-bold">{activeEmployee.plant}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Department</span>
                <span className="text-slate-800 font-medium">{activeEmployee.department}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Mobile</span>
                <span className="text-slate-900 font-mono font-bold">{activeEmployee.mobile}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Joining Date</span>
                <span className="text-slate-800 font-mono font-medium">{activeEmployee.joiningDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Monthly Basic Salary</span>
                <span className="text-emerald-700 font-mono font-bold text-sm">₹ {activeEmployee.salary?.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Assigned Shift</span>
                <span className="text-cyan-800 font-mono font-bold">{activeEmployee.shiftId}</span>
              </div>
            </div>

            {/* Emergency & Bank Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                <span className="text-[10px] text-amber-800 uppercase font-black block mb-1.5 font-mono">
                  Emergency Contact
                </span>
                <div className="space-y-1 text-[11px] text-slate-700">
                  <div>Name: <span className="font-bold text-slate-900">{activeEmployee.emergencyContact?.name || 'N/A'}</span></div>
                  <div>Relation: <span className="font-medium">{activeEmployee.emergencyContact?.relation || 'N/A'}</span></div>
                  <div className="font-mono font-semibold">Phone: {activeEmployee.emergencyContact?.phone || 'N/A'}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] text-emerald-800 uppercase font-black block mb-1.5 font-mono">
                  Bank Settlement Details
                </span>
                <div className="space-y-1 text-[11px] text-slate-700">
                  <div>Bank: <span className="font-bold text-slate-900">{activeEmployee.bankDetails?.bankName || 'HDFC Bank'}</span></div>
                  <div className="font-mono font-semibold">A/C: {activeEmployee.bankDetails?.accountNo || 'XXXX-XXXX-1234'}</div>
                  <div className="font-mono font-semibold">IFSC: {activeEmployee.bankDetails?.ifsc || 'HDFC0000128'}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
