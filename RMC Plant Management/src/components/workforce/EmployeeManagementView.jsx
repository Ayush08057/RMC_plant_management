import React, { useState, useMemo } from 'react';
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
  Trash2,
  Key,
  Lock,
  Copy,
  Check,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../data/mockUsers';
import { MOCK_PLANTS } from '../../data/mockDashboardData';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';
import { formatShiftOption } from '../../utils/shiftUtils';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [activeEmployee, setActiveEmployee] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Helper: Get verified employee photo
  const getEmployeePhoto = (emp) => {
    if (emp?.avatarUrl) return emp.avatarUrl;
    if (emp?.selfieUrl) return emp.selfieUrl;
    if (emp?.photoUrl) return emp.photoUrl;
    return null;
  };

  const handleCopyCredentials = (emp) => {
    const username = emp.username || emp.id?.toLowerCase();
    const password = emp.password || 'Pass@123';
    const text = `RMC Plant Employee Login Details:\n• Username / ID: ${username}\n• Password: ${password}\n• Login URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedKey(emp.id);
    setToastMessage(`Credentials for ${emp.name} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    username: '',
    password: '',
    mobile: '',
    email: '',
    role: ROLES.PLANT_MANAGER,
    department: 'Plant Operations & Batching',
    plant: MOCK_PLANTS[0]?.name || 'Main Plant Unit #01',
    joiningDate: new Date().toISOString().split('T')[0],
    dob: '1992-05-15',
    salary: 45000,
    employmentType: 'Full Time Permanent',
    status: 'Active',
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

  const isSuperAdmin = user?.role === 'Admin' || user?.role === 'Owner / Director';
  const isPlantManager = user?.role === 'Plant Manager' || user?.role === 'Plant Incharge';

  // Base employees list scoped to user's permissions - System Admin NEVER visible to Plant Manager
  const visibleEmployees = useMemo(() => {
    let list = employees || [];
    if (!isSuperAdmin) {
      list = list.filter((e) => {
        const empRole = (e.role || '').toLowerCase();
        const empId = (e.employeeId || e.id || '').toUpperCase();
        const empName = (e.name || '').toLowerCase();
        const isSysAdmin =
          empRole === 'admin' ||
          empRole.includes('executive administration') ||
          empId === 'ADM-001' ||
          empId === 'USR-ADMIN-001' ||
          empName.includes('system admin');
        return !isSysAdmin;
      });
    }
    if (isPlantManager) {
      list = list.filter((e) => {
        const empRole = (e.role || '').toLowerCase();
        const isPlantScope =
          empRole.includes('plant') ||
          empRole.includes('operator') ||
          empRole.includes('driver') ||
          empRole.includes('dispatcher') ||
          empRole.includes('supervisor') ||
          (e.plant && user?.plantLocation && e.plant === user.plantLocation) ||
          e.employeeId === user?.employeeId ||
          e.id === user?.id;
        return isPlantScope;
      });
    }
    return list;
  }, [employees, isSuperAdmin, isPlantManager, user]);

  // Filtered employees
  const filteredEmployees = visibleEmployees.filter((emp) => {
    const matchesSearch =
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.mobile?.includes(searchTerm);

    const matchesPlant = selectedPlant === 'All Plants' || emp.plant === selectedPlant;
    const matchesDept = selectedDept === 'All' || emp.department === selectedDept;
    const matchesRole = selectedRole === 'All' || emp.role === selectedRole;
    const matchesStatus = selectedStatus === 'All' || emp.status === selectedStatus;

    return matchesSearch && matchesPlant && matchesDept && matchesRole && matchesStatus;
  });

  const handleOpenAdd = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const newId = `EMP-${randomNum}`;
    const defaultUsername = `emp${randomNum}`;
    const defaultPassword = `Pass@${Math.floor(100 + Math.random() * 900)}`;

    setFormData({
      id: newId,
      name: '',
      username: defaultUsername,
      password: defaultPassword,
      mobile: '+91 ',
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
    setShowPassword(false);
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
    if (!formData.username?.trim()) {
      setFormError('Please assign a login username for the employee.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setFormError('Please assign a password with at least 6 characters.');
      return;
    }
    const cleanMobile = (formData.mobile || '').replace(/\D/g, '').slice(0, 10);
    if (cleanMobile.length !== 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      const generatedEmail = formData.email?.trim() || `${formData.name.toLowerCase().replace(/\s+/g, '.')}@smconcretech.com`;
      const cleanUsername = formData.username.trim().toLowerCase().replace(/\s+/g, '');

      addEmployee({
        id: formData.id,
        name: formData.name,
        username: cleanUsername,
        password: formData.password,
        mobile: `+91 ${cleanMobile}`,
        email: generatedEmail,
        role: formData.role,
        department: formData.department,
        plant: formData.plant,
        joiningDate: formData.joiningDate,
        dob: formData.dob,
        salary: Number(formData.salary) || 30000,
        employmentType: formData.employmentType,
        status: formData.status || 'Active',
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
      try {
        localStorage.setItem('rmc_last_registered_employee_credentials', JSON.stringify({
          id: formData.id,
          name: formData.name,
          username: cleanUsername,
          password: formData.password,
          role: formData.role,
          plant: formData.plant,
          createdAt: new Date().toISOString(),
        }));
      } catch {
        // ignore
      }
      setToastMessage(`Employee ${formData.name} (${newEmp.id}) added successfully! Username: @${cleanUsername}`);
      setFormData({
        id: '',
        name: '',
        username: '',
        password: '',
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

  const handleRequestDelete = (emp) => {
    setEmployeeToDelete(emp);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    const { id, name } = employeeToDelete;
    try {
      await deleteEmployee(id);
      setToastMessage(`Employee ${name || id} (${id}) has been permanently deleted from workforce records.`);
    } catch (err) {
      console.error('Failed to delete employee:', err);
      setToastMessage(`Failed to delete employee: ${err.message}`);
    } finally {
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setEmployeeToDelete(null);
  };

  const handleDelete = (id, name) => {
    const emp = employees.find((e) => e.id === id) || { id, name };
    handleRequestDelete(emp);
  };

  const handleOpenEdit = (emp) => {
    setActiveEmployee(emp);
    const cleanMobile = (emp.mobile || '').replace(/\D/g, '').slice(-10);
    setFormData({
      ...emp,
      mobile: cleanMobile,
      username: emp.username || emp.id?.toLowerCase() || '',
      password: emp.password || 'Pass@123',
      emergencyName: emp.emergencyContact?.name || '',
      emergencyRelation: emp.emergencyContact?.relation || '',
      emergencyPhone: (emp.emergencyContact?.phone || '').replace(/\D/g, '').slice(-10),
      bankName: emp.bankDetails?.bankName || '',
      accountNo: emp.bankDetails?.accountNo || '',
      ifsc: emp.bankDetails?.ifsc || '',
    });
    setShowPassword(false);
    setShowEditModal(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!activeEmployee) return;

    const cleanMobile = (formData.mobile || '').replace(/\D/g, '').slice(0, 10);
    if (cleanMobile.length !== 10) {
      setToastMessage('⚠️ Please enter a valid 10-digit mobile number.');
      return;
    }

    const cleanUsername = (formData.username || activeEmployee.username || activeEmployee.id).trim().toLowerCase().replace(/\s+/g, '');
    const assignedPassword = formData.password || activeEmployee.password || 'Pass@123';

    updateEmployee(activeEmployee.id, {
      name: formData.name,
      username: cleanUsername,
      password: assignedPassword,
      mobile: `+91 ${cleanMobile}`,
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
    setToastMessage(`Employee profile ${activeEmployee.id} updated with username @${cleanUsername}.`);
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
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-slate-900 text-xs truncate leading-snug">{row.name}</span>
                {row.username && (
                  <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-mono font-semibold border border-amber-200 shrink-0">
                    @{row.username}
                  </span>
                )}
              </div>
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
            onClick={() => handleRequestDelete(row)}
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
    <div className="w-full flex-1 flex flex-col space-y-2 pb-4">
      {/* Filter and Action Control Card */}
      <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, ID, phone, email..."
              className="w-full pl-8.5 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/20 focus:bg-white font-medium transition-all"
            />
          </div>

          <select
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-800 font-bold focus:outline-none focus:border-cyan-600 cursor-pointer shadow-2xs transition-all"
          >
            <option value="All Plants">All Plant Units</option>
            {MOCK_PLANTS.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-800 font-bold focus:outline-none focus:border-cyan-600 cursor-pointer shadow-2xs transition-all"
          >
            <option value="All">All Roles</option>
            {Object.values(ROLES).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-800 font-bold focus:outline-none focus:border-cyan-600 cursor-pointer shadow-2xs transition-all"
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
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm shadow-blue-500/20 active:scale-[0.98]"
        >
          <UserPlus className="w-3.5 h-3.5" />
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
        itemsPerPage={6}
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
                <div className="text-sm font-bold text-slate-900 truncate">{row.name}</div>
                <div className="text-xs font-mono text-cyan-700 font-bold">{row.id} • {row.role}</div>
              </div>
              <StatusBadge status={row.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Plant</span>
                <span className="text-slate-800 font-semibold truncate block">{row.plant}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Mobile</span>
                <span className="text-slate-800 font-mono font-semibold truncate block">{row.mobile}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Department</span>
                <span className="text-slate-800 truncate block">{row.department}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Shift</span>
                <span className="text-indigo-700 font-mono font-bold truncate block">{row.shiftId}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setActiveEmployee(row);
                  setShowProfileModal(true);
                }}
                className="flex-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Profile</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenEdit(row)}
                className="flex-1 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 border border-amber-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => handleRequestDelete(row)}
                className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 border border-rose-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                title="Delete Employee"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      />

      {/* Add Employee Modal — Compact High-Density Grid Fitting Page Perfectly */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Employee"
        subtitle="Create verified workforce record with plant assignment, role, and credentials."
        icon={UserPlus}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSaveAdd} className="space-y-2 sm:space-y-2.5">
          {formError && (
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Employee ID *</label>
              <input
                type="text"
                required
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Mobile Number (10 Digits) *</label>
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
                  value={formData.mobile}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, mobile: digits });
                  }}
                  className="w-full pl-11 pr-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Work Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@smconcretech.com"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Assigned Plant *</label>
              <select
                value={formData.plant}
                onChange={(e) => setFormData({ ...formData, plant: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                {MOCK_PLANTS.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Assigned Shift</label>
              <select
                value={formData.shiftId}
                onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{formatShiftOption(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Monthly Salary (₹) *</label>
              <input
                type="number"
                required
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Employment Type</label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="Full Time Permanent">Full Time Permanent</option>
                <option value="Contract Basis">Contract Basis</option>
                <option value="Trainee">Trainee</option>
              </select>
            </div>
          </div>

          {/* Daily Login Credentials Section — Sleek Compact Panel */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded-md bg-blue-500/20 text-blue-800">
                  <Key className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">Daily Login Credentials</span>
                  <span className="text-[10px] text-slate-500 hidden sm:inline">Employee will use these credentials for daily login & attendance</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const base = (formData.name ? formData.name.toLowerCase().replace(/[^a-z0-9]/g, '') : formData.id.toLowerCase().replace(/[^a-z0-9]/g, '')).slice(0, 10);
                  const randomNum = Math.floor(100 + Math.random() * 900);
                  setFormData((prev) => ({
                    ...prev,
                    username: base ? `${base}${randomNum}` : `emp${randomNum}`,
                    password: `Pass@${Math.floor(100 + Math.random() * 900)}`,
                  }));
                }}
                className="text-[10px] text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Auto Generate</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-800 font-bold block mb-0.5 text-[11px] flex items-center justify-between">
                  <span>Assigned Username *</span>
                  <span className="text-[10px] text-blue-700 font-mono">Unique Login ID</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  placeholder="e.g. rahul_driver"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-blue-300 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-slate-800 font-bold block mb-0.5 text-[11px] flex items-center justify-between">
                  <span>Assigned Password *</span>
                  <span className="text-[10px] text-blue-700 font-mono">Min 6 characters</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full pl-2.5 pr-8 py-1.5 rounded-lg bg-white border border-blue-300 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 cursor-pointer transition-all"
            >
              Confirm Registration
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      {/* Edit Employee Modal — Compact High-Density Grid Fitting Page Perfectly */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Employee (${activeEmployee?.id})`}
        subtitle="Modify operational parameters, assigned shift, and employment status."
        icon={Edit3}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-2 sm:space-y-2.5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Mobile (10 Digits) *</label>
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
                  value={formData.mobile}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, mobile: digits });
                  }}
                  className="w-full pl-11 pr-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Plant Location</label>
              <select
                value={formData.plant}
                onChange={(e) => setFormData({ ...formData, plant: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                {MOCK_PLANTS.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
                <option value="Resigned">Resigned</option>
              </select>
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Shift</label>
              <select
                value={formData.shiftId}
                onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{formatShiftOption(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Basic Salary (₹)</label>
              <input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Edit Login Credentials — Sleek Compact Strip */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-bold text-slate-900">Login Credentials & Access</span>
              <span className="text-[10px] text-slate-500 hidden sm:inline">• Used for portal authentication</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-blue-300 text-slate-900 font-mono font-bold text-xs focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-0.5 text-[11px]">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-2.5 pr-8 py-1.5 rounded-lg bg-white border border-blue-300 text-slate-900 font-mono font-bold text-xs focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 cursor-pointer transition-all"
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

            {/* Daily Portal Login Credentials Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 font-mono">
                  <Key className="w-3.5 h-3.5 text-amber-700" />
                  <span>Daily Portal Login Credentials</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Username:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-amber-300 inline-block shadow-2xs">
                      @{activeEmployee.username || activeEmployee.id?.toLowerCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Password:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-amber-300 inline-block shadow-2xs">
                      {showPassword ? (activeEmployee.password || 'Pass@123') : '••••••••••••'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer mt-3"
                  >
                    {showPassword ? 'Hide' : 'Reveal'}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopyCredentials(activeEmployee)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
              >
                {copiedKey === activeEmployee.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-slate-950" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-950" />
                    <span>Copy Credentials</span>
                  </>
                )}
              </button>
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

      {/* Delete Employee Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        title="Confirm Employee Record Deletion"
        subtitle="Permanent removal from enterprise workforce directory."
        icon={AlertTriangle}
        maxWidth="max-w-md"
      >
        {employeeToDelete && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200/90 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-rose-950 text-sm">
                  Delete {employeeToDelete.name}?
                </h4>
                <p className="text-rose-800/90 text-xs mt-0.5 leading-relaxed">
                  This action cannot be undone. All role authorizations, shift rosters, and employee profile records for this account will be permanently erased.
                </p>
              </div>
            </div>

            {/* Target Employee Summary Card */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between items-center text-slate-600">
                <span>Employee ID:</span>
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {employeeToDelete.id}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Assigned Role:</span>
                <span className="font-semibold text-slate-900">
                  {employeeToDelete.role}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Plant Node:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                  {employeeToDelete.plant || 'Main Plant'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Current Status:</span>
                <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${employeeToDelete.status === 'Active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                  }`}>
                  {employeeToDelete.status || 'Active'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md shadow-rose-600/25 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
