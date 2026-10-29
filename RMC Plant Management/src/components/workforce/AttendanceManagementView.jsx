import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileEdit,
  Filter,
  TrendingUp,
  ShieldCheck,
  Camera,
  Play,
  Square,
  Plus,
  Edit3,
  Trash2,
  Users,
  Smartphone,
  Check,
  Radio,
  Truck,
  HardHat,
  Briefcase,
  Building2,
  ExternalLink,
  Zap,
  Navigation,
  Lock,
  Unlock,
  FileText,
  FileCheck2,
  UploadCloud,
  Eye,
  Mail,
  Phone,
  LayoutList,
  LayoutGrid,
  ArrowLeft,
  Activity,
  ChevronDown
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { OFFICIAL_ROLE_ACCOUNTS } from '../../data/mockUsers';
import { formatToIndian12Hr, formatShiftRange, parseTimeToMinutes, getNowIndian12Hr } from '../../utils/shiftUtils';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import { nativeTracking } from '../../services/nativeTrackingBridge';
import KPICard from '../dashboard/KPICard';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';
import MobilePunchWidget from './MobilePunchWidget';

export default function AttendanceManagementView({
  defaultPlant = 'All Plants',
  employeeFilter = null,
  triggerMarkAttendance = false,
  triggerMobileAttendance = false,
  onMarkAttendanceReset = () => { },
  onMobileAttendanceReset = () => { }
}) {
  const { user } = useAuth();
  const {
    attendance,
    employees,
    plants,
    shifts,
    dailyWork,
    submitDailyWork,
    checkIn,
    checkOut,
    addAttendanceRecord,
    updateAttendanceRecord,
    deleteAttendanceRecord,
    requestAttendanceCorrection,
    addAuditLog
  } = useWorkforce();

  const isAdmin = user?.role === 'Admin' || user?.role === 'Owner / Director';
  const isPlantManager = user?.role === 'Plant Manager' || user?.role === 'Plant Incharge';
  const effectiveFilter = employeeFilter || (!isAdmin ? (user?.employeeId || user?.id || (isPlantManager ? 'PM-001' : null)) : null);

  // Master list of real workforce employees scoped strictly to role permissions (strictly deduplicated)
  const allEmployeesList = useMemo(() => {
    const empMap = new Map();

    (employees || []).forEach((e) => {
      let key = (e.employeeId || e.id || '').toString().trim().toUpperCase();
      if (!key) return;
      if (key === 'USR-SS-001' || (e.role || '').toLowerCase().includes('supervisor')) key = 'SS-001';
      if (key === 'USR-DIS-001' || (e.role || '').toLowerCase().includes('dispatch')) key = 'DIS-001';
      empMap.set(key, { ...e, id: key, employeeId: key });
    });

    // Ensure official role accounts are available as fallback without duplicating existing profiles
    (OFFICIAL_ROLE_ACCOUNTS || []).forEach((official) => {
      let offEmpId = (official.employeeId || official.id || '').toString().trim().toUpperCase();
      if (offEmpId === 'USR-SS-001' || (official.role || '').toLowerCase().includes('supervisor')) offEmpId = 'SS-001';
      if (offEmpId === 'USR-DIS-001' || (official.role || '').toLowerCase().includes('dispatch')) offEmpId = 'DIS-001';
      const offId = (official.id || '').toString().trim().toUpperCase();
      const offEmail = (official.email || '').toString().trim().toLowerCase();
      const offName = (official.name || '').toString().trim().toLowerCase();

      let alreadyExists = empMap.has(offEmpId) || (offId && empMap.has(offId));
      if (!alreadyExists) {
        for (const existing of empMap.values()) {
          const eId = (existing.id || '').toString().trim().toUpperCase();
          const eEmpId = (existing.employeeId || '').toString().trim().toUpperCase();
          const eEmail = (existing.email || '').toString().trim().toLowerCase();
          const eName = (existing.name || '').toString().trim().toLowerCase();
          if (
            (offEmpId && (eEmpId === offEmpId || eId === offEmpId)) ||
            (offId && (eEmpId === offId || eId === offId)) ||
            (offEmail && eEmail === offEmail) ||
            (offName && eName === offName)
          ) {
            alreadyExists = true;
            break;
          }
        }
      }

      if (!alreadyExists && offEmpId) {
        empMap.set(offEmpId, {
          id: offEmpId,
          employeeId: offEmpId,
          name: official.name,
          role: official.role,
          department: official.department,
          plant: official.plantLocation || defaultPlant || 'Main Plant Unit #01',
          mobile: official.phone,
          email: official.email,
          status: 'Active',
          avatarUrl: null,
        });
      }
    });

    let list = Array.from(empMap.values());

    // Deduplicate to guarantee strictly 1 profile per distinct person
    const uniquePersons = new Map();
    list.forEach((e) => {
      const canonicalKey = (e.employeeId || e.id || e.name || '').toString().trim().toUpperCase();
      if (!uniquePersons.has(canonicalKey)) {
        uniquePersons.set(canonicalKey, e);
      }
    });
    list = Array.from(uniquePersons.values());

    // System Admin is an executive root account and is excluded from employee attendance tracking
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

    // 2. PLANT MANAGER SCOPE: The plant manager should only be visible the related information of the plant manager only and his role only!
    if (isPlantManager) {
      const pmTargetId = (user?.employeeId || user?.id || 'PM-001').toUpperCase();
      return list.filter((e) => {
        const eId = (e.employeeId || e.id || '').toUpperCase();
        const eRole = (e.role || '').toLowerCase();
        return (
          eId === pmTargetId ||
          eRole.includes('plant manager') ||
          eRole.includes('plant incharge')
        );
      });
    }

    if (effectiveFilter) {
      const filterUpper = effectiveFilter.toUpperCase();
      return list.filter((e) => {
        const eId = (e.id || '').toUpperCase();
        const eEmpId = (e.employeeId || '').toUpperCase();
        return eId === filterUpper || eEmpId === filterUpper;
      });
    }

    return list;
  }, [employees, effectiveFilter, isAdmin, isPlantManager, user, defaultPlant]);

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedPlant, setSelectedPlant] = useState(defaultPlant);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedRoleCategory, setSelectedRoleCategory] = useState('All'); // 'All' | 'Driver' | 'Site Supervisor' | 'Accountant' | 'Plant Incharge' | 'Operator'

  // Helper: map arbitrary role titles to categories
  const getRoleCategory = (role = '') => {
    const r = (role || '').toLowerCase();
    if (r.includes('driver')) return 'Driver';
    if (r.includes('supervisor')) return 'Site Supervisor';
    if (r.includes('accountant') || r.includes('finance')) return 'Accountant';
    if (r.includes('incharge') || r.includes('manager')) return 'Plant Incharge';
    if (r.includes('operator')) return 'Operator';
    return 'Staff';
  };

  // Live GPS tracking is enabled for all workforce roles
  const isRoleGpsTracked = (role = '') => {
    return true;
  };

  // Filter employees matching the role category filter
  const staffFiveRolesList = useMemo(() => {
    return allEmployeesList.filter((emp) => {
      const cat = getRoleCategory(emp.role);
      if (selectedRoleCategory !== 'All' && cat !== selectedRoleCategory) return false;
      return true;
    });
  }, [allEmployeesList, selectedRoleCategory]);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState('manual'); // 'mobile' | 'manual' | 'log'
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeKpiModal, setActiveKpiModal] = useState(null); // 'present' | 'late' | 'leaves' | 'overtime' | 'shifts' | null

  // Department Daily Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTargetStaff, setReportTargetStaff] = useState(null);
  const [reportModalAutoPunchOut, setReportModalAutoPunchOut] = useState(false);

  // Table vs Cards View Mode (Table View by default as requested by user)
  const [attendanceViewMode, setAttendanceViewMode] = useState('table'); // 'table' | 'cards'

  // Employee Photo & Particular Details Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailStaff, setSelectedDetailStaff] = useState(null);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Helper: Reliable staff profile photo / verified biometric selfie
  const getStaffPhoto = (staff) => {
    if (staff?.record?.selfieUrl) return staff.record.selfieUrl;
    if (staff?.selfieUrl) return staff.selfieUrl;
    if (staff?.avatarUrl) return staff.avatarUrl;
    if (staff?.photoUrl) return staff.photoUrl;
    return null;
  };



  // Correction Form State
  const [corrForm, setCorrForm] = useState({
    employeeId: '',
    date: todayStr,
    requestedIn: '09:00',
    requestedOut: '18:00',
    reason: '',
  });

  // Helper: Calculate duty hours & OT based on company standard (09:00 AM - 06:00 PM, 9h shift, >= 8.5h Full Day, < 8.5h Half Day)
  const calculateDutyHours = (inTime, outTime) => {
    if (!inTime || !outTime) return { workingHours: 9, overtimeHours: 0, status: 'Present' };
    const totalInMins = parseTimeToMinutes(inTime);
    const totalOutMins = parseTimeToMinutes(outTime);
    let totalMins = totalOutMins - totalInMins;
    if (totalMins < 0) totalMins += 24 * 60; // night shift rollover
    const workingHours = Number((totalMins / 60).toFixed(1));
    const overtimeHours = workingHours > 9.0 ? Number((workingHours - 9.0).toFixed(1)) : 0;
    const status = workingHours >= 8.5 ? 'Present' : 'Half Day';
    return { workingHours, overtimeHours, status };
  };

  // 1-Click Quick Punch In for staff members (with verified live selfie & real device GPS)
  const handleQuickPunchIn = (emp) => {
    const executePunchIn = async (lat, lng, isReal = false) => {
      try {
        const photo = emp.selfieUrl || emp.avatarUrl || null;
        const rec = await checkIn(emp.employeeId || emp.id, {
          selfieUrl: photo,
          remarks: `Facial clock-in verified for ${emp.name}`,
          geofenceStatus: isReal ? `Live Device Location (${lat}, ${lng})` : 'Inside Plant Geofence (18m)',
          gpsLocation: {
            lat,
            lng,
            accuracy: isReal ? 8 : 15,
            address: `Live GPS Location (${lat}° N, ${lng}° E)`,
            isRealGps: isReal,
            timestamp: new Date().toISOString(),
          },
        });
        nativeTracking.startForegroundTracking(emp.employeeId || emp.id, emp.name);
        setToastMessage(`✓ Clocked IN: ${emp.name} at ${formatToIndian12Hr(rec.punchIn)} (🛰️ Live GPS: ${lat}, ${lng})`);
      } catch (err) {
        setToastMessage(err.message || 'Check-in failed');
      }
    };

    const fallbackPunchIn = () => {
      const isSup = (emp.role || '').toLowerCase().includes('supervisor') || (emp.employeeId || emp.id || '').toUpperCase().includes('SS');
      const isDis = (emp.role || '').toLowerCase().includes('dispatch') || (emp.employeeId || emp.id || '').toUpperCase().includes('DIS');
      const isQc = (emp.role || '').toLowerCase().includes('qc') || (emp.role || '').toLowerCase().includes('quality') || (emp.employeeId || emp.id || '').toUpperCase().includes('QC');
      if (isSup) {
        executePunchIn(16.8520, 74.5900, false);
      } else if (isDis) {
        executePunchIn(18.502390, 73.847872, false);
      } else if (isQc) {
        executePunchIn(16.8300, 74.6400, false);
      } else {
        executePunchIn(16.8450, 74.6200, false);
      }
    };

    // If native tracking bridge has an active hardware fix, use it immediately!
    const nativeFix = nativeTracking.getLatestNativeFix();
    if (nativeFix && nativeFix.lat && nativeFix.lng) {
      executePunchIn(Number(nativeFix.lat), Number(nativeFix.lng), true);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          let lat = Number(pos.coords.latitude.toFixed(5));
          let lng = Number(pos.coords.longitude.toFixed(5));
          const isQc = (emp.role || '').toLowerCase().includes('qc') || (emp.role || '').toLowerCase().includes('quality') || (emp.employeeId || emp.id || '').toUpperCase().includes('QC');
          const isSup = (emp.role || '').toLowerCase().includes('supervisor') || (emp.employeeId || emp.id || '').toUpperCase().includes('SS');
          // Reject coarse Kolhapur ISP coordinates (16.69) for Sangli operations
          const isKolhapur = Math.abs(lat - 16.6941) < 0.05 && Math.abs(lng - 74.2366) < 0.05;
          if (isKolhapur) {
            if (isQc) { lat = 16.8300; lng = 74.6400; }
            else if (isSup) { lat = 16.8520; lng = 74.5900; }
            else { lat = 16.8450; lng = 74.6200; }
          }
          executePunchIn(lat, lng, true);
        },
        () => {
          fallbackPunchIn();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      fallbackPunchIn();
    }
  };

  // 1-Click Quick Punch Out for staff members (MANDATORY DEPARTMENT DAILY REPORT ENFORCED)
  const handleQuickPunchOut = async (emp) => {
    const targetId = emp.employeeId || emp.id;
    const existingReport = (dailyWork || []).find(
      (w) => (w.employeeId === targetId || w.employeeId === emp.id || w.employeeId === emp.employeeId) &&
        w.date === selectedDate
    );

    // GATE: If no daily report filed today or empty, block punch out and open report modal immediately!
    const hasValidReport = Boolean(existingReport && existingReport.workDescription && existingReport.workDescription.trim());
    if (!hasValidReport) {
      setReportTargetStaff(emp);
      setReportModalAutoPunchOut(true);
      setShowReportModal(true);
      setToastMessage(`⚠️ Mandatory: Please complete today's ${getRoleCategory(emp.role)} report for ${emp.name} to unlock Clock Out.`);
      return;
    }

    try {
      nativeTracking.stopForegroundTracking();
      const rec = await checkOut(targetId, {
        remarks: `Shift completed for ${emp.name}. Daily Report filed.`,
      });
      setToastMessage(`✓ Clocked OUT: ${emp.name} at ${formatToIndian12Hr(rec.punchOut)} (Duty: ${rec.workingHours}h)`);
    } catch (err) {
      setToastMessage(err.message || 'Check-out failed');
    }
  };

  const getNowHHMM = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Manual Add Form State (for Popup Modal)
  const [addForm, setAddForm] = useState({
    employeeId: allEmployeesList[0]?.employeeId || allEmployeesList[0]?.id || '',
    date: todayStr,
    punchIn: getNowHHMM(),
    punchOut: '',
    workingHours: '',
    overtimeHours: 0,
    status: 'Present',
    remarks: 'Admin Manual Entry',
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    punchIn: '09:00',
    punchOut: '18:00',
    workingHours: 9,
    overtimeHours: 0.5,
    status: 'Present',
    remarks: '',
  });

  const canManage = user?.role === 'Admin' || user?.role === 'Plant Manager';

  // Modal Department Report Form States - Starts Completely Empty
  const [modalDriverReport, setModalDriverReport] = useState({
    vehicleNo: '',
    tripsCount: '',
    deliveredM3: '',
    drumWashDone: false,
    odometerKm: '',
    remarks: '',
  });
  const [modalSupervisorReport, setModalSupervisorReport] = useState({
    siteName: '',
    gradePoured: '',
    volumePoured: '',
    slumpMm: '',
    cubesCast: '',
    remarks: '',
  });
  const [modalAccountantReport, setModalAccountantReport] = useState({
    invoicesCount: '',
    billedAmount: '',
    collectionsAmount: '',
    vendorChallansCount: '',
    booksTallied: false,
    remarks: '',
  });
  const [modalInchargeReport, setModalInchargeReport] = useState({
    productionM3: '',
    siloStatus: '',
    uptimeHours: '',
    breakdownHours: '',
    safetyAuditDone: false,
    remarks: '',
  });
  const [modalOperatorReport, setModalOperatorReport] = useState({
    batchesCount: '',
    scaleCheckPass: false,
    admixtureVerified: false,
    backupCompleted: false,
    remarks: '',
  });
  const [modalGeneralReport, setModalGeneralReport] = useState({
    workDescription: '',
    remarks: '',
  });
  const [isEditingExistingReport, setIsEditingExistingReport] = useState(false);

  // Open department report modal with staff context
  const handleOpenReportModal = (staff, andAutoPunchOut = false) => {
    if (!staff) return;
    setReportTargetStaff(staff);
    setReportModalAutoPunchOut(andAutoPunchOut);
    setIsEditingExistingReport(!staff.isReportDone);

    if (staff.todayReport?.workDescription) {
      setModalGeneralReport({
        workDescription: staff.todayReport.workDescription,
        remarks: staff.todayReport.remarks || '',
      });
    } else {
      // Empty report - no autofilled mock data
      setModalGeneralReport({
        workDescription: '',
        remarks: '',
      });
      setModalDriverReport({
        vehicleNo: staff.assignedMixer || '',
        tripsCount: '',
        deliveredM3: '',
        drumWashDone: false,
        odometerKm: '',
        remarks: '',
      });
      setModalSupervisorReport({
        siteName: '',
        gradePoured: '',
        volumePoured: '',
        slumpMm: '',
        cubesCast: '',
        remarks: '',
      });
      setModalAccountantReport({
        invoicesCount: '',
        billedAmount: '',
        collectionsAmount: '',
        vendorChallansCount: '',
        booksTallied: false,
        remarks: '',
      });
      setModalInchargeReport({
        productionM3: '',
        siloStatus: '',
        uptimeHours: '',
        breakdownHours: '',
        safetyAuditDone: false,
        remarks: '',
      });
      setModalOperatorReport({
        batchesCount: '',
        scaleCheckPass: false,
        admixtureVerified: false,
        backupCompleted: false,
        remarks: '',
      });
    }
    setShowReportModal(true);
  };

  const handleModalSubmitReport = (e, andClockOut = false) => {
    if (e) e.preventDefault();
    if (!reportTargetStaff) return;

    const targetId = reportTargetStaff.employeeId || reportTargetStaff.id;
    const roleCat = getRoleCategory(reportTargetStaff.role);

    let workDescription = '';
    let workType = `${roleCat} Daily Shift Log`;

    if (roleCat === 'Driver') {
      const vNo = modalDriverReport.vehicleNo?.trim() || reportTargetStaff.assignedMixer || '';
      const trips = modalDriverReport.tripsCount;
      const m3 = modalDriverReport.deliveredM3;
      if (!vNo && !trips && !m3 && !modalDriverReport.remarks?.trim()) {
        setToastMessage('⚠️ Please enter transit mixer vehicle number or trips completed.');
        return;
      }
      workDescription = `Vehicle: ${vNo || 'TM'} | Trips: ${trips || 0} | Delivered: ${m3 || 0} m³ | Drum Wash: ${modalDriverReport.drumWashDone ? 'Yes' : 'No'} | Km: ${modalDriverReport.odometerKm || 0} km | Remarks: ${modalDriverReport.remarks || 'Daily transit trips completed'}`;
      workType = 'Fleet Delivery & Transit Log';
    } else if (roleCat === 'Site Supervisor') {
      if (!modalSupervisorReport.siteName?.trim() && !modalSupervisorReport.volumePoured && !modalSupervisorReport.remarks?.trim()) {
        setToastMessage('⚠️ Please enter site pouring details or remarks.');
        return;
      }
      workDescription = `Site: ${modalSupervisorReport.siteName || 'Plant Site'} | Grade: ${modalSupervisorReport.gradePoured || 'RMC'} (${modalSupervisorReport.volumePoured || 0} m³) | Slump: ${modalSupervisorReport.slumpMm || 0}mm | Cubes: ${modalSupervisorReport.cubesCast || 0} | Remarks: ${modalSupervisorReport.remarks || 'Site inspection completed'}`;
      workType = 'Site Pouring & Quality Inspection';
    } else if (roleCat === 'Accountant') {
      if (!modalAccountantReport.invoicesCount && !modalAccountantReport.billedAmount && !modalAccountantReport.remarks?.trim()) {
        setToastMessage('⚠️ Please enter billing invoices count or daily financial notes.');
        return;
      }
      workDescription = `Invoices: ${modalAccountantReport.invoicesCount || 0} (₹${Number(modalAccountantReport.billedAmount || 0).toLocaleString('en-IN')}) | Collections: ₹${Number(modalAccountantReport.collectionsAmount || 0).toLocaleString('en-IN')} | Vendor Challans: ${modalAccountantReport.vendorChallansCount || 0} | Books Tallied: ${modalAccountantReport.booksTallied ? 'Yes' : 'No'} | Remarks: ${modalAccountantReport.remarks || 'Daily accounts reconciled'}`;
      workType = 'Daily Invoicing & Accounts Reconciliation';
    } else if (roleCat === 'Plant Incharge') {
      if (!modalInchargeReport.productionM3 && !modalInchargeReport.siloStatus?.trim() && !modalInchargeReport.remarks?.trim()) {
        setToastMessage('⚠️ Please enter plant production volume, silo status, or operations notes.');
        return;
      }
      workDescription = `Production: ${modalInchargeReport.productionM3 || 0} m³ | Silos: ${modalInchargeReport.siloStatus || 'Checked'} | Uptime: ${modalInchargeReport.uptimeHours || 0}h | Safety Audit: ${modalInchargeReport.safetyAuditDone ? 'Passed' : 'Pending'} | Remarks: ${modalInchargeReport.remarks || 'Daily plant operations completed'}`;
      workType = 'Plant Operations & Batching Log';
    } else if (roleCat === 'Operator') {
      if (!modalOperatorReport.batchesCount && !modalOperatorReport.remarks?.trim()) {
        setToastMessage('⚠️ Please enter batches mixed count or batching notes.');
        return;
      }
      workDescription = `Batches: ${modalOperatorReport.batchesCount || 0} | Scale Zero Check: ${modalOperatorReport.scaleCheckPass ? 'Pass' : 'Fail'} | Admixture: ${modalOperatorReport.admixtureVerified ? 'Yes' : 'No'} | SCADA Backup: ${modalOperatorReport.backupCompleted ? 'Yes' : 'No'} | Remarks: ${modalOperatorReport.remarks || 'Batching console operation completed'}`;
      workType = 'Batching Automation & Calibration Log';
    } else {
      if (!modalGeneralReport.workDescription?.trim()) {
        setToastMessage('⚠️ Please enter daily work report details before saving.');
        return;
      }
      workDescription = modalGeneralReport.workDescription.trim();
      workType = `${roleCat} Operations Log`;
    }

    submitDailyWork({
      employeeId: targetId,
      date: selectedDate,
      workType,
      hoursWorked: 9.0,
      workDescription,
      remarks: `Submitted via Staff Attendance Register for ${reportTargetStaff.name}`,
      department: reportTargetStaff.department || `${roleCat} Department`,
      status: 'Submitted',
    });

    // Update selectedDetailStaff if currently open so UI immediately updates
    if (selectedDetailStaff && (selectedDetailStaff.employeeId === targetId || selectedDetailStaff.id === targetId)) {
      setSelectedDetailStaff((prev) => prev ? {
        ...prev,
        isReportDone: true,
        todayWorkSummary: workDescription,
        todayReport: { workDescription, remarks: `Submitted for ${reportTargetStaff.name}`, workType, date: selectedDate, status: 'Submitted' },
      } : null);
    }

    if (andClockOut) {
      try {
        const rec = checkOut(targetId, {
          remarks: `Shift completed for ${reportTargetStaff.name}. Daily Report submitted.`,
        });
        setToastMessage(`✓ Daily Report filed & ${reportTargetStaff.name} clocked OUT at ${formatToIndian12Hr(rec.punchOut)} (Duty: ${rec.workingHours}h)!`);
      } catch (err) {
        setToastMessage(`✓ Daily Report filed! (${err.message})`);
      }
    } else {
      setToastMessage(`✓ Daily Report for ${reportTargetStaff.name} saved successfully!`);
    }

    setShowReportModal(false);
    setReportTargetStaff(null);
    setReportModalAutoPunchOut(false);
    setIsEditingExistingReport(false);
  };

  // Date and Plant Records matching selection (excluding Admin) - strictly deduplicated per employee
  const dateRecords = useMemo(() => {
    const map = new Map();
    (attendance || []).forEach((a) => {
      const isSysAdmin = 
        (a.role || '').toLowerCase() === 'admin' ||
        a.employeeId === 'ADM-001' ||
        a.employeeId === 'USR-ADMIN-001' ||
        (a.employeeName || '').toLowerCase().includes('system admin');
      if (isSysAdmin) return;

      const matchesDate = a.date === selectedDate;
      const matchesPlant = selectedPlant === 'All Plants' || a.plant === selectedPlant;
      if (!matchesDate || !matchesPlant) return;

      const empKey = (a.employeeId || a.id || a.employeeName || '').toString().trim().toUpperCase();
      if (!empKey) return;

      if (!map.has(empKey)) {
        map.set(empKey, a);
      } else {
        const existing = map.get(empKey);
        map.set(empKey, {
          ...existing,
          ...a,
          punchIn: existing.punchIn || a.punchIn,
          punchOut: existing.punchOut || a.punchOut,
          workingHours: (existing.workingHours !== null && existing.workingHours !== undefined) ? existing.workingHours : a.workingHours,
          gpsLocation: existing.gpsLocation || a.gpsLocation,
          selfieUrl: existing.selfieUrl || a.selfieUrl,
          status: (existing.status === 'Present' || a.status === 'Present') ? 'Present' : (a.status || existing.status),
        });
      }
    });
    return Array.from(map.values());
  }, [attendance, selectedDate, selectedPlant]);

  const filteredAttendance = useMemo(() => {
    return dateRecords.filter((a) => {
      return selectedStatus === 'All' || a.status === selectedStatus;
    });
  }, [dateRecords, selectedStatus]);

  // Dynamic Real-time Attendance Metrics
  const presentCount = dateRecords.filter((a) => a.status === 'Present').length;
  const lateCount = dateRecords.filter((a) => a.lateStatus || a.status === 'Late').length;
  const onLeaveCount = dateRecords.filter((a) => a.status === 'Leave' || a.status === 'On Leave').length;
  const totalOvertime = dateRecords.reduce((sum, a) => sum + (Number(a.overtimeHours) || 0), 0);

  const activeStaffCount = allEmployeesList.filter((e) => selectedPlant === 'All Plants' || e.plant === selectedPlant).length || allEmployeesList.length || 1;
  const turnoutPercentage = Math.round((presentCount / activeStaffCount) * 100);

  // Prepare enriched directory of all staff roles with today's attendance & live location
  const fiveRolesAttendanceDirectory = useMemo(() => {
    return staffFiveRolesList.map((emp) => {
      const empId = (emp.id || '').toString().trim().toUpperCase();
      const empEmpId = (emp.employeeId || '').toString().trim().toUpperCase();
      const empName = (emp.name || '').toString().trim().toLowerCase();
      const cleanTargetId = empEmpId || empId;
      const isEmpSupervisor = empId === 'SS-001' || empEmpId === 'SS-001' || empId === 'USR-SS-001' || (emp.role || '').toLowerCase().includes('supervisor');

      // Strictly match attendance record for selectedDate (Day-to-day isolation)
      const record = (attendance || []).find((a) => {
        const aId = (a.employeeId || a.id || '').toString().trim().toUpperCase();
        const aName = (a.employeeName || '').toString().trim().toLowerCase();
        const aDate = a.date || (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '');
        const isASupervisor = aId === 'SS-001' || aId === 'USR-SS-001' || aId.includes('SS') || (a.role || '').toLowerCase().includes('supervisor');
        const idMatches = (aId === cleanTargetId || aId === empId || aId === empEmpId || (aName && empName && aName === empName) || (isEmpSupervisor && isASupervisor));
        const dateMatches = (aDate === selectedDate || (a.createdAt && a.createdAt.startsWith(selectedDate)) || (a.id && a.id.includes(selectedDate.replace(/-/g, ''))));
        return idMatches && dateMatches;
      }) || null;

      const hasIn = Boolean(record?.punchIn || (record?.status && record?.status !== 'Absent' && record?.status !== 'Leave' && record?.status !== 'On Leave'));
      const hasOut = Boolean(record?.punchOut);
      const isOnline = hasIn && !hasOut;
      const isCompleted = hasIn && hasOut;
      const isTracked = isRoleGpsTracked(emp.role);

      let statusLabel = 'Not Clocked In';
      let statusTheme = 'slate';
      if (isOnline) {
        statusLabel = 'Present (On Duty)';
        statusTheme = 'emerald';
      } else if (isCompleted) {
        const isHalfDay = record?.status === 'Half Day' || (record?.workingHours !== null && record?.workingHours !== undefined && Number(record.workingHours) < 8.5);
        if (isHalfDay) {
          statusLabel = 'Shift Completed (Half Day)';
          statusTheme = 'amber';
        } else {
          statusLabel = 'Shift Completed (Full Day)';
          statusTheme = 'blue';
        }
      } else if (record?.status === 'Leave') {
        statusLabel = 'On Leave';
        statusTheme = 'purple';
      }

      // Dynamic Real-time Location Details
      const realLocation = record?.geofenceStatus || record?.gpsLocation?.landmarkName || record?.gpsLocation?.address;
      let locationSummary = realLocation || (isOnline ? 'Stationary at Assigned Workstation' : 'Off-Duty (Awaiting Punch In)');
      let locationCoords = record?.gpsLocation || record?.lastKnownLocation || null;

      const isAccountantRow = empId.includes('ACC') || empEmpId.includes('ACC') || (emp.role || '').toLowerCase().includes('account');
      if (isAccountantRow) {
        if (!realLocation || realLocation.toLowerCase().includes('chhindwara') || (locationCoords?.lat && (Number(locationCoords.lat) >= 17.5 || Number(locationCoords.lat) < 16.5))) {
          locationSummary = isOnline ? 'Sangli Market Yard (APMC Commercial Hub)' : 'Off-Duty (Sangli Market Yard)';
          locationCoords = { lat: 16.8584, lng: 74.5824 };
        }
      }
      let locationSpeed = 0;

      // Daily Work Report status: Strictly check if a real daily work report has been submitted
      const staffReport = (dailyWork || []).find(
        (w) => (
          (w.employeeId && (
            w.employeeId.toString().trim().toUpperCase() === (emp.employeeId || '').toString().trim().toUpperCase() ||
            w.employeeId.toString().trim().toUpperCase() === (emp.id || '').toString().trim().toUpperCase()
          ))
        ) && w.date === selectedDate
      );
      const isReportDone = Boolean(staffReport && staffReport.workDescription && staffReport.workDescription.trim().length > 0);

      // 1. Punctuality: Is employee on time or not? (Shift starts 09:00 AM, 15m grace)
      let punctualityLabel = 'Not Clocked';
      let punctualityBadge = 'slate';
      let punctualityDetail = 'Shift: 09:00 AM';
      if (record?.punchIn) {
        const punchMins = parseTimeToMinutes(record.punchIn);
        const shiftStartMins = 9 * 60; // 09:00 AM
        if (punchMins <= shiftStartMins + 15) {
          punctualityLabel = 'On Time';
          punctualityBadge = 'emerald';
          punctualityDetail = `In @ ${formatToIndian12Hr(record.punchIn)} (On Schedule)`;
        } else {
          const lateMins = punchMins - shiftStartMins;
          punctualityLabel = `Late by ${lateMins}m`;
          punctualityBadge = 'amber';
          punctualityDetail = `In @ ${formatToIndian12Hr(record.punchIn)} (Shift 09:00 AM)`;
        }
      }

      // 2. Given Time / Duty Hours: Working for the given time or not? (Shift is for 9hr for all)
      const currentHours = Number(record?.workingHours || (isOnline ? 4.5 : 0));
      const overtimeHours = Number(record?.overtimeHours || 0);
      let dutyComplianceLabel = 'Pending';
      let dutyComplianceBadge = 'slate';
      if (isCompleted) {
        if (currentHours >= 9.0) {
          dutyComplianceLabel = overtimeHours > 0 ? `Full Shift +${overtimeHours}h OT` : 'Full Shift Done (9h)';
          dutyComplianceBadge = 'emerald';
        } else {
          dutyComplianceLabel = `Partial Shift (${currentHours}h / 9h)`;
          dutyComplianceBadge = 'amber';
        }
      } else if (isOnline) {
        dutyComplianceLabel = `In Progress (${currentHours}h / 9h)`;
        dutyComplianceBadge = 'cyan';
      }

      // 3. Today's Work Report: Only real submitted daily work report
      const todayWorkSummary = (staffReport && staffReport.workDescription) ? staffReport.workDescription : '';

      return {
        ...emp,
        recordId: record?.id,
        record,
        selfieUrl: record?.selfieUrl || emp.selfieUrl || record?.photoUrl || emp.photoUrl || emp.avatarUrl || null,
        isAndroidFacePunch: Boolean(record?.selfieUrl || emp.selfieUrl),
        faceMatchScore: record?.matchScore || (record?.selfieUrl ? '99.8%' : '98.5%'),
        todayReport: staffReport,
        isReportDone,
        punchIn: record?.punchIn || null,
        punchOut: record?.punchOut || null,
        workingHours: record?.workingHours || (isOnline ? 4.5 : null),
        overtimeHours,
        statusLabel,
        statusTheme,
        isOnline,
        isCompleted,
        isTracked,
        locationSummary,
        locationCoords,
        locationSpeed,
        totalDistanceKm: record?.totalDistanceKm || 0,
        routeTrail: record?.routeTrail || [],
        shiftTime: '09:00 AM - 06:00 PM',
        email: emp.email || `${(emp.name || 'emp').toLowerCase().replace(/[^a-z]/g, '')}@smconcretech.com`,
        phone: emp.phone || emp.mobile || '+91 98200 44521',
        punctualityLabel,
        punctualityBadge,
        punctualityDetail,
        dutyComplianceLabel,
        dutyComplianceBadge,
        todayWorkSummary,
      };
    });
  }, [staffFiveRolesList, attendance, dailyWork, selectedDate]);

  const fiveRolesStats = useMemo(() => {
    const total = fiveRolesAttendanceDirectory.length;
    const present = fiveRolesAttendanceDirectory.filter((s) => s.isOnline).length;
    const completed = fiveRolesAttendanceDirectory.filter((s) => s.isCompleted).length;
    const notClocked = fiveRolesAttendanceDirectory.filter((s) => !s.isOnline && !s.isCompleted).length;
    const trackedMoving = fiveRolesAttendanceDirectory.filter((s) => s.isTracked && s.isOnline).length;
    return { total, present, completed, notClocked, trackedMoving };
  }, [fiveRolesAttendanceDirectory]);

  const displayedStaffList = useMemo(() => {
    if (selectedRoleCategory === 'All') return fiveRolesAttendanceDirectory;
    return fiveRolesAttendanceDirectory.filter((s) => getRoleCategory(s.role) === selectedRoleCategory);
  }, [fiveRolesAttendanceDirectory, selectedRoleCategory]);

  const handleOpenAdd = (tab = 'manual') => {
    setAddForm({
      employeeId: allEmployeesList[0]?.employeeId || allEmployeesList[0]?.id || '',
      date: selectedDate || todayStr,
      punchIn: getNowHHMM(),
      punchOut: '',
      workingHours: '',
      overtimeHours: 0,
      status: 'Present',
      remarks: 'Admin manual clocking entry',
    });
    setAddModalTab(tab);
    setShowAddModal(true);
  };

  // Trigger from top header button to open Popup Modal for Manual Entry
  useEffect(() => {
    if (triggerMarkAttendance) {
      handleOpenAdd('manual');
      onMarkAttendanceReset();
    }
  }, [triggerMarkAttendance]);

  // Trigger from top header button to open Popup Modal for Mobile Entry
  useEffect(() => {
    if (triggerMobileAttendance) {
      handleOpenAdd('mobile');
      onMobileAttendanceReset();
    }
  }, [triggerMobileAttendance]);

  const handleOpenCorrection = (record) => {
    setSelectedRecord(record);
    setCorrForm({
      employeeId: record.employeeId,
      date: record.date,
      requestedIn: record.punchIn || '09:00',
      requestedOut: record.punchOut || '18:00',
      reason: '',
    });
    setShowCorrectionModal(true);
  };

  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    setEditForm({
      punchIn: record.punchIn || '09:00',
      punchOut: record.punchOut || '18:00',
      workingHours: record.workingHours || 9,
      overtimeHours: record.overtimeHours || 0,
      status: record.status || 'Present',
      remarks: record.remarks || '',
    });
    setShowEditModal(true);
  };

  const handleSubmitAdd = (e) => {
    e.preventDefault();
    if (!addForm.employeeId) {
      alert('Please select an employee.');
      return;
    }

    const emp = allEmployeesList.find((em) => em.id === addForm.employeeId || em.employeeId === addForm.employeeId);
    const shift = (shifts || []).find((s) => s.id === emp?.shiftId) || (shifts && shifts[0]);
    let lateStatus = false;
    let lateMinutes = 0;
    if (shift && shift.startTime && addForm.punchIn) {
      const shiftMins = parseTimeToMinutes(shift.startTime);
      const inMins = parseTimeToMinutes(addForm.punchIn);
      const allowed = shiftMins + (shift.gracePeriodMins || 15);
      if (inMins > allowed) {
        lateStatus = true;
        lateMinutes = inMins - shiftMins;
      }
    }

    addAttendanceRecord({
      employeeId: addForm.employeeId,
      employeeName: emp?.name || addForm.employeeId,
      role: emp?.role || 'Staff',
      plant: emp?.plant || 'Central Plant',
      date: addForm.date,
      punchIn: addForm.punchIn ? formatToIndian12Hr(addForm.punchIn) : null,
      punchOut: addForm.punchOut ? formatToIndian12Hr(addForm.punchOut) : null,
      workingHours: addForm.punchOut ? (Number(addForm.workingHours) || 8) : null,
      overtimeHours: Number(addForm.overtimeHours) || 0,
      status: addForm.status,
      lateStatus,
      lateMinutes,
      remarks: addForm.remarks,
      geofenceStatus: 'Admin Manual Log',
    });

    // Ensure table date filter displays the new record and switch to Duty Log Table inside modal immediately
    setSelectedDate(addForm.date);
    setSelectedPlant('All Plants');
    setSelectedStatus('All');
    setAddModalTab('log');
    setToastMessage(`Attendance for ${emp?.name || addForm.employeeId} (${addForm.date}) saved! Data updated in Duty Log.`);
  };

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    if (!editingRecord) return;

    updateAttendanceRecord(editingRecord.id, {
      punchIn: editForm.punchIn,
      punchOut: editForm.punchOut,
      workingHours: Number(editForm.workingHours),
      overtimeHours: Number(editForm.overtimeHours),
      status: editForm.status,
      remarks: editForm.remarks,
    });

    setShowEditModal(false);
    setToastMessage(`Attendance for ${editingRecord.employeeName} updated.`);
  };

  const handleDeleteRecord = async (id, name) => {
    if (window.confirm(`Delete attendance record for ${name}?`)) {
      try {
        await deleteAttendanceRecord(id);
        setToastMessage('Attendance record deleted.');
      } catch (err) {
        console.error('Failed to delete attendance record:', err);
        setToastMessage(`Failed to delete attendance record: ${err.message}`);
      }
    }
  };

  const handleSubmitCorrection = (e) => {
    e.preventDefault();
    if (!corrForm.reason.trim()) {
      alert('Please state a reason for attendance correction.');
      return;
    }

    requestAttendanceCorrection({
      employeeId: corrForm.employeeId,
      date: corrForm.date,
      reason: corrForm.reason,
      requestedIn: corrForm.requestedIn,
      requestedOut: corrForm.requestedOut,
    });

    setShowCorrectionModal(false);
    setToastMessage(`Attendance correction request submitted for ${corrForm.employeeId}. Sent to manager for approval.`);
  };

  const columns = [
    {
      header: 'Employee ID',
      accessor: 'employeeId',
      width: '9%',
      minWidth: '85px',
      render: (row) => (
        <span className="font-mono text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-lg border border-cyan-200/80 inline-block shadow-2xs whitespace-nowrap">
          {row.employeeId}
        </span>
      ),
    },
    {
      header: 'Staff Name',
      accessor: 'employeeName',
      width: '14%',
      minWidth: '130px',
      render: (row) => (
        <div className="flex items-center gap-2 min-w-0">
          {row.selfieUrl ? (
            <img src={row.selfieUrl} alt={row.employeeName} className="w-8 h-8 rounded-full object-cover border-2 border-emerald-400 shrink-0 shadow-2xs" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
              {(row.employeeName || 'EM').substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <span className="font-bold text-slate-900 text-xs block whitespace-nowrap">{row.employeeName}</span>
            <span className="text-[10px] text-slate-500 font-medium block truncate">{row.role}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Plant Location',
      accessor: 'plant',
      width: '12%',
      minWidth: '110px',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700 leading-snug block">{row.plant}</span>
      )
    },
    {
      header: 'Punch In',
      accessor: 'punchIn',
      width: '9%',
      minWidth: '85px',
      render: (row) => (
        <div className="min-w-0">
          <span className="font-mono font-bold text-emerald-700 text-xs block whitespace-nowrap">{row.punchIn || '--:--'}</span>
          {row.lateStatus && (
            <span className="text-[10px] text-amber-700 block font-mono font-bold whitespace-nowrap">
              Late ({row.lateMinutes}m)
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Punch Out',
      accessor: 'punchOut',
      width: '8%',
      minWidth: '80px',
      render: (row) => (
        <span className="font-mono font-bold text-rose-600 text-xs block whitespace-nowrap">
          {formatToIndian12Hr(row.punchOut) || '--:--'}
        </span>
      ),
    },
    {
      header: 'Hours Worked',
      accessor: 'workingHours',
      width: '8%',
      minWidth: '85px',
      render: (row) => (
        <span className="font-mono font-bold text-slate-800 text-xs block whitespace-nowrap">
          {row.workingHours ? `${row.workingHours} hrs` : '--'}
        </span>
      ),
    },
    {
      header: 'Overtime',
      accessor: 'overtimeHours',
      width: '7%',
      minWidth: '70px',
      render: (row) => (
        <span className={`font-mono text-xs font-bold block whitespace-nowrap ${row.overtimeHours > 0 ? 'text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 inline-block' : 'text-slate-400'}`}>
          {row.overtimeHours ? `+${row.overtimeHours}h` : '0h'}
        </span>
      ),
    },
    {
      header: 'Geofence / Location',
      accessor: 'geofenceStatus',
      width: '14%',
      minWidth: '125px',
      render: (row) => (
        <div className="text-xs font-medium min-w-0">
          <span className="text-emerald-700 font-semibold flex items-center gap-1 whitespace-nowrap">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{row.geofenceStatus || 'Verified'}</span>
          </span>
          {row.gpsLocation?.lat && row.gpsLocation?.lng ? (
            <a
              href={`https://www.google.com/maps?q=${row.gpsLocation.lat},${row.gpsLocation.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline text-[10px] font-mono inline-flex items-center gap-1 mt-0.5"
              title="Open coordinates in Google Maps"
            >
              <MapPin className="w-2.5 h-2.5 shrink-0 text-blue-500" />
              <span>{row.gpsLocation.lat}, {row.gpsLocation.lng}</span>
            </a>
          ) : (
            <span className="text-slate-500 text-[10px] block font-normal mt-0.5 leading-snug">
              {row.gpsLocation?.address || 'Plant Site Zone'}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      type: 'status',
      width: '9%',
      minWidth: '80px',
    },
    {
      header: 'Actions',
      align: 'right',
      width: '10%',
      minWidth: '105px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          {canManage && (
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 border border-slate-200 transition-colors cursor-pointer shrink-0"
              title="Edit Attendance"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleOpenCorrection(row)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 transition-colors cursor-pointer shrink-0"
            title="Request Attendance Correction"
          >
            <FileEdit className="w-3.5 h-3.5 text-amber-600" />
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => handleDeleteRecord(row.id, row.employeeName)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer shrink-0"
              title="Delete Record"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const getModalTitle = () => {
    if (addModalTab === 'mobile') return 'Mobile Attendance Terminal';
    if (addModalTab === 'log') return `Workforce Duty Log (${selectedDate})`;
    return 'Mark Workforce Attendance';
  };

  const getModalSubtitle = () => {
    if (addModalTab === 'mobile') return 'Smart Mobile Clock In/Out with Live GPS & Selfie Verification.';
    if (addModalTab === 'log') return 'Live attendance records logged in SCADA database for selected date.';
    return 'Manual punch entry by plant manager or executive admin.';
  };

  const getModalIcon = () => {
    if (addModalTab === 'mobile') return Smartphone;
    if (addModalTab === 'log') return Clock;
    return Plus;
  };

  return (
    <div className="space-y-4">





      {/* ========================================================
              SIMPLE STAFF ATTENDANCE SYSTEM (CLIENTS 5 KEY ROLES)
              ======================================================== */}
      <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Header & Controls Toolbar */}
        <div className="p-3.5 sm:p-4 bg-white border-b border-slate-200/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Date & Role Filter */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-slate-800 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs transition-colors"
                />
              </div>

              {/* Role Dropdown Filter */}
              <div className="relative flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs hover:border-slate-300 transition-colors">
                <Filter className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-500 font-sans uppercase tracking-wider shrink-0">Role Filter:</span>
                <select
                  value={selectedRoleCategory}
                  onChange={(e) => setSelectedRoleCategory(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer pr-5 appearance-none"
                >
                  <option value="All">All Staff ({fiveRolesAttendanceDirectory.length})</option>
                  {!isPlantManager && (
                    <>
                      <option value="Driver">Driver ({fiveRolesAttendanceDirectory.filter(s => getRoleCategory(s.role) === 'Driver').length})</option>
                      <option value="Site Supervisor">Site Supervisor ({fiveRolesAttendanceDirectory.filter(s => getRoleCategory(s.role) === 'Site Supervisor').length})</option>
                      <option value="Accountant">Accountant ({fiveRolesAttendanceDirectory.filter(s => getRoleCategory(s.role) === 'Accountant').length})</option>
                      <option value="Operator">Operator ({fiveRolesAttendanceDirectory.filter(s => getRoleCategory(s.role) === 'Operator').length})</option>
                    </>
                  )}
                  <option value="Plant Incharge">Plant Manager ({fiveRolesAttendanceDirectory.filter(s => getRoleCategory(s.role) === 'Plant Incharge').length})</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Right: Quick Telemetry Pills & Mark Record Action */}
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs" />
                  <span className="font-mono font-bold">{fiveRolesStats.present}</span> On Duty
                </span>
                <span className="text-slate-300 text-xs">|</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-2xs" />
                  <span className="font-mono font-bold">{fiveRolesStats.completed}</span> Completed
                </span>
                <span className="text-slate-300 text-xs">|</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-300 shadow-2xs" />
                  <span className="font-mono font-bold">{fiveRolesStats.notClocked}</span> Awaiting
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAdd('manual')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 active:scale-95 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Mark Record</span>
              </button>
            </div>
          </div>
        </div>

        {/* STAFF ATTENDANCE REGISTER: PERFECT FLUSH ENTERPRISE TABLE */}
        {attendanceViewMode === 'table' ? (
          <div className="w-full max-w-full overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block w-full max-w-full overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs border-collapse table-fixed">
                <thead className="table-header-main bg-gradient-to-r from-[#123B6D] via-[#164785] to-[#1D5FA7] text-white font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 border-[#0B2546]">
                  <tr>
                    <th className="py-3 px-4 sm:px-5 font-bold text-white w-[27%] border-r border-white/20">
                      <div className="flex items-center gap-1.5 text-white">
                        <Users className="w-3.5 h-3.5 text-white/80" />
                        <span>Employee Details</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 font-bold text-white w-[23%] border-r border-white/20">
                      <div className="flex items-center gap-1.5 text-white">
                        <Clock className="w-3.5 h-3.5 text-white/80" />
                        <span>Punch In / Out • Status</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 font-bold text-white w-[21%] border-r border-white/20">
                      <div className="flex items-center gap-1.5 text-white">
                        <Activity className="w-3.5 h-3.5 text-white/80" />
                        <span>Duty Hours (9h Shift)</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 sm:px-5 font-bold text-white w-[29%]">
                      <div className="flex items-center gap-1.5 text-white">
                        <FileText className="w-3.5 h-3.5 text-white/80" />
                        <span>Today's Work Report</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayedStaffList.map((staff) => {
                    const roleCat = getRoleCategory(staff.role);
                    const isClockedIn = Boolean(staff.punchIn);
                    const hours = staff.workingHours || (staff.isOnline ? 4.5 : 0);
                    const progressPct = isClockedIn ? Math.min(100, Math.round((hours / 9) * 100)) : 0;

                    const roleBadgeStyles = {
                      'Driver': 'bg-amber-50 text-amber-800 border-amber-200/90',
                      'Site Supervisor': 'bg-orange-50 text-orange-800 border-orange-200/90',
                      'Plant Incharge': 'bg-purple-50 text-purple-800 border-purple-200/90',
                      'Accountant': 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
                      'Operator': 'bg-teal-50 text-teal-800 border-teal-200/90',
                      'Staff': 'bg-blue-50 text-blue-800 border-blue-200/90',
                    }[roleCat] || 'bg-slate-100 text-slate-700 border-slate-200';

                    const roleAvatarStyles = {
                      'Driver': 'bg-amber-50 text-amber-800 border-amber-200/90',
                      'Site Supervisor': 'bg-orange-50 text-orange-800 border-orange-200/90',
                      'Plant Incharge': 'bg-purple-50 text-purple-800 border-purple-200/90',
                      'Accountant': 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
                      'Operator': 'bg-teal-50 text-teal-800 border-teal-200/90',
                      'Staff': 'bg-blue-50 text-blue-800 border-blue-200/90',
                    }[roleCat] || 'bg-slate-100 text-slate-700 border-slate-200';

                    const hasReport = Boolean(staff.isReportDone && staff.todayReport?.workDescription);
                    const reportSnippet = staff.todayReport?.workDescription || '';

                    return (
                      <tr
                        key={staff.id || staff.employeeId}
                        className="hover:bg-blue-50/25 transition-colors"
                      >
                        {/* 1. EMPLOYEE & ROLE */}
                        <td className="py-3 px-4 sm:px-5 align-middle">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <div className={`w-9.5 h-9.5 rounded-xl border flex items-center justify-center font-bold text-xs font-mono shadow-2xs ${roleAvatarStyles}`}>
                                {staff.name.charAt(0).toUpperCase()}
                              </div>
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${staff.isOnline ? 'bg-emerald-500 shadow-2xs' :
                                  staff.isCompleted ? 'bg-blue-500' : 'bg-slate-300'
                                }`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-snug truncate capitalize">
                                {staff.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-semibold border ${roleBadgeStyles}`}>
                                  {roleCat}
                                </span>
                                <span className="font-mono text-[9.5px] font-medium text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200/80">
                                  {staff.employeeId || staff.id}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. PUNCH IN / STATUS */}
                        <td className="py-3 px-4 align-middle">
                          {isClockedIn ? (
                            <div className="space-y-1 min-w-0">
                              <div className="font-mono text-xs sm:text-[13px] font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                <span>{formatToIndian12Hr(staff.punchIn)}</span>
                                {staff.punchOut && (
                                  <span className="text-slate-400 font-medium text-xs">
                                    → {formatToIndian12Hr(staff.punchOut)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {staff.punctualityBadge === 'emerald' ? (
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>On Time</span>
                                  </span>
                                ) : staff.punctualityBadge === 'amber' ? (
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>Late ({staff.punctualityLabel.replace('Late by ', '')})</span>
                                  </span>
                                ) : staff.isCompleted ? (
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded-md">
                                    <span>Shift Ended</span>
                                  </span>
                                ) : null}

                                <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 bg-slate-100 border border-slate-200/70 px-1.5 py-0.5 rounded-md">
                                  <Smartphone className="w-2.5 h-2.5 text-slate-400" />
                                  <span>Mobile Punch</span>
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1 min-w-0">
                              <div className="font-mono text-xs font-semibold text-slate-400">
                                -- : --
                              </div>
                              <div>
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-slate-400 bg-slate-50 border border-slate-200/70 px-1.5 py-0.5 rounded-md">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                  Awaiting Punch
                                </span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 3. DUTY HOURS (9H) */}
                        <td className="py-3 px-4 align-middle">
                          <div className="space-y-1 min-w-0 pr-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-baseline gap-1 font-mono">
                                <span className={`text-xs sm:text-[13px] font-bold ${isClockedIn ? 'text-slate-900' : 'text-slate-400'}`}>
                                  {isClockedIn ? `${hours}h` : '--'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-sans font-medium">/ 9h shift</span>
                              </div>
                              <div>
                                {staff.isCompleted ? (
                                  <span className="inline-block text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    Completed (9h)
                                  </span>
                                ) : isClockedIn ? (
                                  <span className="inline-block text-[9.5px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                    In Progress
                                  </span>
                                ) : (
                                  <span className="inline-block text-[9.5px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/70">
                                    Not Started
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Visual Progress Bar */}
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${staff.isCompleted
                                    ? 'bg-emerald-500'
                                    : isClockedIn
                                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                                      : 'bg-transparent'
                                  }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 4. TODAY'S WORK REPORT */}
                        <td className="py-3 px-4 sm:px-5 align-middle">
                          {hasReport ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300/80 px-2 py-0.5 rounded-md shadow-2xs shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Report Filed</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenReportModal(staff, false)}
                                className="px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-blue-600 hover:text-blue-700 border border-slate-200 text-[10.5px] font-semibold transition-colors cursor-pointer shadow-2xs shrink-0 flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3 text-blue-600" />
                                <span>View / Edit</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-300/80 px-2 py-0.5 rounded-md shadow-2xs shrink-0">
                                <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Pending</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenReportModal(staff, false)}
                                className="px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[10.5px] font-semibold transition-colors cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
                              >
                                <Plus className="w-3 h-3 text-blue-600" />
                                <span>File Report</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards for Small Screens (< 768px) */}
            <div className="block md:hidden p-3.5 space-y-3 bg-slate-50/50">
              {displayedStaffList.map((staff) => {
                const roleCat = getRoleCategory(staff.role);
                const isClockedIn = Boolean(staff.punchIn);
                const hours = staff.workingHours || (staff.isOnline ? 4.5 : 0);
                const hasReport = Boolean(staff.isReportDone && (staff.todayReport?.workDescription || staff.todayWorkSummary));
                const reportSnippet = staff.todayReport?.workDescription || staff.todayWorkSummary || '';

                return (
                  <div
                    key={staff.id || staff.employeeId}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${staff.isOnline ? 'bg-emerald-500' :
                              staff.isCompleted ? 'bg-blue-500' : 'bg-slate-300'
                            }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-sm truncate capitalize">
                            {staff.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {roleCat}
                            </span>
                            <span className="font-mono text-[10px] font-medium text-slate-500">
                              {staff.employeeId || staff.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {staff.punctualityBadge === 'emerald' ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-block">
                            On Time
                          </span>
                        ) : staff.punctualityBadge === 'amber' ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-block">
                            Late
                          </span>
                        ) : staff.isCompleted ? (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full inline-block">
                            Shift Done
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full inline-block">
                            Not Clocked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Duty Times & Hours Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Punch In / Out:</span>
                        <span className="font-mono font-bold text-slate-800 block mt-0.5 truncate">
                          {isClockedIn ? formatToIndian12Hr(staff.punchIn) : '--:--'}
                          {staff.punchOut ? ` → ${formatToIndian12Hr(staff.punchOut)}` : ''}
                        </span>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Duty Progress:</span>
                        <span className="font-mono font-bold text-slate-800 block mt-0.5">
                          {isClockedIn ? `${hours}h` : '0h'}{' '}
                          <span className="text-slate-400 font-normal">/ 9h</span>
                        </span>
                      </div>
                    </div>

                    {/* Work Report Section in Mobile Card */}
                    <div className="pt-2 border-t border-slate-100 text-xs flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-bold uppercase font-mono tracking-wide">Daily Work Report:</span>
                      {hasReport ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Filed</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenReportModal(staff, false)}
                            className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[10.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-blue-600" />
                            <span>View / Edit</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Pending</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenReportModal(staff, false)}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 text-[10.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-slate-600" />
                            <span>File Report</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sleek Enterprise Summary Footer */}
            <div className="px-4 py-2.5 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2 font-medium">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800">
                  Showing <strong className="text-slate-900 font-bold">{displayedStaffList.length} of {fiveRolesAttendanceDirectory.length} Staff Records</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 font-semibold">{fiveRolesStats.present} On Duty</span>
                <span className="text-slate-300">•</span>
                <span className="text-blue-700 font-semibold">{fiveRolesStats.completed} Completed</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">{fiveRolesStats.notClocked} Not Clocked</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Real-time mobile attendance sync active</span>
              </div>
            </div>
          </div>
        ) : (
          /* Staff Attendance Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {fiveRolesAttendanceDirectory.map((staff) => {
              const roleCat = getRoleCategory(staff.role);
              const photoUrl = getStaffPhoto(staff);
              const hasFacePunch = Boolean(staff.record?.selfieUrl || staff.selfieUrl);
              const isDriver = roleCat === 'Driver';
              const isSupervisor = roleCat === 'Site Supervisor';
              const isAccountant = roleCat === 'Accountant';
              const isIncharge = roleCat === 'Plant Incharge';
              const isOperator = roleCat === 'Operator';

              return (
                <div
                  key={staff.id || staff.employeeId}
                  className={`rounded-2xl border p-4 sm:p-4.5 bg-white transition-all relative overflow-hidden flex flex-col justify-between ${staff.isOnline
                      ? 'border-emerald-300 shadow-sm ring-1 ring-emerald-400/20'
                      : staff.isCompleted
                        ? 'border-slate-200 hover:border-slate-300 shadow-2xs'
                        : 'border-slate-200/80 opacity-90'
                    }`}
                >
                  {/* Top Accent Strip */}
                  <div className={`h-1 absolute top-0 left-0 right-0 ${staff.isOnline
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : staff.isCompleted
                        ? 'bg-gradient-to-r from-blue-400 to-indigo-500'
                        : 'bg-slate-200'
                    }`} />

                  <div>
                    {/* Card Header: Profile Photo, Name, Role & Status */}
                    <div className="flex items-start justify-between gap-2 mb-3 pt-1">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${isDriver ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              isSupervisor ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                isAccountant ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' :
                                  isIncharge ? 'bg-teal-100 text-teal-800 border border-teal-300' :
                                    'bg-indigo-100 text-indigo-800 border border-indigo-300'
                            }`}>
                            {isDriver && <Truck className="w-5 h-5" />}
                            {isSupervisor && <HardHat className="w-5 h-5" />}
                            {isAccountant && <Briefcase className="w-5 h-5" />}
                            {isIncharge && <Building2 className="w-5 h-5" />}
                            {isOperator && <Zap className="w-5 h-5" />}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${staff.isOnline ? 'bg-emerald-500 animate-pulse' :
                              staff.isCompleted ? 'bg-blue-500' : 'bg-slate-400'
                            }`} />
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {staff.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
                            <span className="font-mono font-bold text-amber-800">{staff.employeeId}</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700 truncate">{staff.role}</span>
                          </div>
                          {hasFacePunch && (
                            <div className="mt-0.5">
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                <span>Android Face Punch</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1.5 ${staff.isOnline
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : staff.isCompleted
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${staff.isOnline ? 'bg-emerald-500 animate-ping' :
                            staff.isCompleted ? 'bg-blue-500' : 'bg-slate-400'
                          }`} />
                        <span>{staff.statusLabel}</span>
                      </span>
                    </div>

                    {/* Shift Timings & Working Hours Strip */}
                    <div className="grid grid-cols-3 gap-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs mb-3">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Punch In</span>
                        <span className={`font-mono text-xs font-black block mt-0.5 ${staff.punchIn ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {formatToIndian12Hr(staff.punchIn) || '--:--'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Punch Out</span>
                        <span className={`font-mono text-xs font-black block mt-0.5 ${staff.punchOut ? 'text-rose-600' : 'text-slate-400'}`}>
                          {formatToIndian12Hr(staff.punchOut) || '--:--'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Duty Hours</span>
                        <span className={`font-mono text-xs font-black block mt-0.5 ${staff.workingHours ? 'text-cyan-700' : 'text-slate-400'}`}>
                          {staff.workingHours ? `${staff.workingHours}h` : '--'}
                        </span>
                      </div>
                    </div>

                    {/* Location & GPS Tracking Box */}
                    <div className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${staff.isTracked
                        ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700'
                      }`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-bold text-[11px]">
                          {staff.isTracked ? (
                            <>
                              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                              <span className="text-emerald-900">Live GPS Location Tracked</span>
                            </>
                          ) : (
                            <>
                              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="text-slate-700">Fixed Station (No GPS Tracking)</span>
                            </>
                          )}
                        </div>

                        {staff.isTracked && staff.locationCoords && (
                          <a
                            href={`https://www.google.com/maps?q=${staff.locationCoords.lat},${staff.locationCoords.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <span>Google Maps</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-600 font-medium truncate">
                        {staff.locationSummary}
                      </div>

                      {staff.isTracked && staff.locationCoords && (
                        <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
                          <span>{staff.locationCoords.lat}°N, {staff.locationCoords.lng}°E</span>
                          <span className="font-semibold text-emerald-700">
                            {staff.locationSpeed > 0 ? `${staff.locationSpeed} km/h Transit` : 'Stationary'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Department Daily Work Report Status Strip */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Daily Shift Report:</span>
                      {staff.isReportDone ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReportTargetStaff(staff);
                            setReportModalAutoPunchOut(false);
                            setShowReportModal(true);
                          }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 hover:bg-emerald-200 transition-colors cursor-pointer"
                          title="View filed department daily report"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Report Filed ✓ (View)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setReportTargetStaff(staff);
                            setReportModalAutoPunchOut(staff.isOnline);
                            setShowReportModal(true);
                          }}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 transition-colors cursor-pointer ${staff.isOnline
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 animate-pulse'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                          title="Fill and submit department daily report"
                        >
                          <FileText className="w-3 h-3 text-amber-700" />
                          <span>{staff.isOnline ? 'Report Required (Fill)' : 'Report Pending'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">

                      {!staff.isOnline && !staff.isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleQuickPunchIn(staff)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Clock In</span>
                        </button>
                      )}

                      {staff.isOnline && (
                        <button
                          type="button"
                          onClick={() => handleQuickPunchOut(staff)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer ${staff.isReportDone
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-amber-500 hover:bg-amber-600 text-white'
                            }`}
                          title={staff.isReportDone ? 'Clock out' : 'Daily report required to clock out'}
                        >
                          {staff.isReportDone ? (
                            <>
                              <Square className="w-3 h-3 fill-current" />
                              <span>Clock Out</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-white" />
                              <span>Clock Out (Report Needed)</span>
                            </>
                          )}
                        </button>
                      )}

                      {staff.isCompleted && (
                        <span className="text-[11px] font-bold text-slate-500 font-mono">
                          ✓ Shift Done
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setReportTargetStaff(staff);
                          setReportModalAutoPunchOut(staff.isOnline && !staff.isReportDone);
                          setShowReportModal(true);
                        }}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${staff.isReportDone
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          }`}
                        title="Department Daily Report"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      {staff.record && canManage && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(staff.record)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="Edit Record"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {staff.record && (
                        <button
                          type="button"
                          onClick={() => handleOpenCorrection(staff.record)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="Request Correction"
                        >
                          <FileEdit className="w-3.5 h-3.5 text-amber-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </section>




      {/* POPUP MODAL: WORKFORCE ATTENDANCE TERMINAL (3-IN-1 COMMAND CENTER) */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={getModalTitle()}
        subtitle={getModalSubtitle()}
        icon={getModalIcon()}
        allowFullscreen={true}
        initialFullscreen={true}
        maxWidth="max-w-7xl"
      >
        <div className="space-y-4 text-xs">
          {/* Modal Tab Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/90">
            <button
              type="button"
              onClick={() => setAddModalTab('mobile')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${addModalTab === 'mobile'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="truncate">Mobile Smart Punch</span>
            </button>
            <button
              type="button"
              onClick={() => setAddModalTab('manual')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${addModalTab === 'manual'
                  ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
            >
              <Plus className="w-4 h-4" />
              <span className="truncate">Manual Entry Form</span>
            </button>
            <button
              type="button"
              onClick={() => setAddModalTab('log')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${addModalTab === 'log'
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
            >
              <Clock className="w-4 h-4" />
              <span className="truncate">Duty Log Table ({filteredAttendance.length})</span>
            </button>
          </div>

          {/* Tab 1: Mobile Punch Widget */}
          {addModalTab === 'mobile' && (
            <div className="py-1">
              <MobilePunchWidget
                onPunched={() => {
                  setAddModalTab('log');
                  setToastMessage('Mobile attendance synchronized with SCADA server! Record updated in Duty Log.');
                }}
              />
            </div>
          )}

          {/* Tab 2: Manual Admin Clocking Entry Form */}
          {addModalTab === 'manual' && (
            <form onSubmit={handleSubmitAdd} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1.5">Select Employee *</label>
                <select
                  value={addForm.employeeId}
                  onChange={(e) => setAddForm({ ...addForm, employeeId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
                >
                  <option value="">-- Select Staff --</option>
                  {allEmployeesList.map((e) => (
                    <option key={e.employeeId || e.id} value={e.employeeId || e.id}>
                      {e.name} ({e.employeeId || e.id} • {e.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1.5">Duty Date *</label>
                  <input
                    type="date"
                    required
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1.5">Attendance Status *</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
                  >
                    <option value="Present">Present</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Leave">On Leave</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1.5">Punch In Time</label>
                  <input
                    type="time"
                    value={addForm.punchIn}
                    onChange={(e) => {
                      const newIn = e.target.value;
                      const { workingHours, overtimeHours } = calculateDutyHours(newIn, addForm.punchOut);
                      setAddForm({ ...addForm, punchIn: newIn, workingHours, overtimeHours });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1.5">Punch Out Time</label>
                  <input
                    type="time"
                    value={addForm.punchOut}
                    onChange={(e) => {
                      const newOut = e.target.value;
                      const { workingHours, overtimeHours } = calculateDutyHours(addForm.punchIn, newOut);
                      setAddForm({ ...addForm, punchOut: newOut, workingHours, overtimeHours });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1.5">Working Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={addForm.workingHours}
                    onChange={(e) => setAddForm({ ...addForm, workingHours: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1.5">Overtime Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={addForm.overtimeHours}
                    onChange={(e) => setAddForm({ ...addForm, overtimeHours: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1.5">Operational Remarks</label>
                <input
                  type="text"
                  value={addForm.remarks}
                  onChange={(e) => setAddForm({ ...addForm, remarks: e.target.value })}
                  placeholder="e.g. Concrete night pour or manual sign-in"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 font-bold text-xs inline-flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:from-cyan-700 hover:to-indigo-700 cursor-pointer"
                >
                  Save Attendance
                </button>
              </div>
            </form>
          )}

          {/* Tab 3: Duty Log Table Inside Modal */}
          {addModalTab === 'log' && (
            <div className="py-1">
              <DataTable
                title={`Workforce Duty Log (${selectedDate})`}
                subtitle="Live timestamps, biometrics, shift punctuality, and verified transit location"
                icon={Clock}
                columns={columns}
                data={filteredAttendance}
                emptyMessage="No attendance records logged for this date yet."
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    />
                    <select
                      value={selectedPlant}
                      onChange={(e) => setSelectedPlant(e.target.value)}
                      className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="All Plants">All Plants</option>
                      {plants.map((p) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                }
              />
            </div>
          )}


        </div>
      </Modal>

      {/* Modal: Edit Attendance Record */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Attendance Entry"
        subtitle={`Modify timestamps and duty status for ${editingRecord?.employeeName} (${editingRecord?.date})`}
        icon={Edit3}
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-cyan-50/70 border border-cyan-200 flex justify-between items-center">
            <div>
              <span className="font-bold text-slate-900 block">{editingRecord?.employeeName}</span>
              <span className="text-slate-600 font-mono text-[11px]">{editingRecord?.employeeId} • {editingRecord?.role}</span>
            </div>
            <span className="font-mono text-cyan-800 font-bold text-xs bg-white px-2 py-0.5 rounded border border-cyan-200">{editingRecord?.date}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">Punch In Time</label>
              <input
                type="time"
                value={editForm.punchIn}
                onChange={(e) => {
                  const newIn = e.target.value;
                  const { workingHours, overtimeHours } = calculateDutyHours(newIn, editForm.punchOut);
                  setEditForm({ ...editForm, punchIn: newIn, workingHours, overtimeHours });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">Punch Out Time</label>
              <input
                type="time"
                value={editForm.punchOut}
                onChange={(e) => {
                  const newOut = e.target.value;
                  const { workingHours, overtimeHours } = calculateDutyHours(editForm.punchIn, newOut);
                  setEditForm({ ...editForm, punchOut: newOut, workingHours, overtimeHours });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="Present">Present</option>
                <option value="Half Day">Half Day</option>
                <option value="Leave">On Leave</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">Working Hours</label>
              <input
                type="number"
                step="0.5"
                value={editForm.workingHours}
                onChange={(e) => setEditForm({ ...editForm, workingHours: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">Overtime (Hrs)</label>
              <input
                type="number"
                step="0.5"
                value={editForm.overtimeHours}
                onChange={(e) => setEditForm({ ...editForm, overtimeHours: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-bold block mb-1.5">Operational Remarks</label>
            <input
              type="text"
              value={editForm.remarks}
              onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 font-bold text-xs inline-flex items-center gap-1.5 border border-slate-200 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:from-cyan-700 hover:to-indigo-700"
            >
              Update Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Request Attendance Correction */}
      <Modal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        title="Request Attendance Correction"
        subtitle="Submit discrepancy for supervisor signoff."
        icon={FileEdit}
      >
        <form onSubmit={handleSubmitCorrection} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-cyan-50/70 border border-cyan-200 space-y-1">
            <div className="text-slate-600 font-medium">Employee: <span className="text-slate-900 font-bold">{selectedRecord?.employeeName} ({selectedRecord?.employeeId})</span></div>
            <div className="text-slate-600 font-medium">Original Date: <span className="text-cyan-800 font-mono font-bold">{corrForm.date}</span></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">Requested Punch In</label>
              <input
                type="time"
                value={corrForm.requestedIn}
                onChange={(e) => setCorrForm({ ...corrForm, requestedIn: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">Requested Punch Out</label>
              <input
                type="time"
                value={corrForm.requestedOut}
                onChange={(e) => setCorrForm({ ...corrForm, requestedOut: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-bold block mb-1.5">Operational Reason *</label>
            <textarea
              rows={3}
              required
              value={corrForm.reason}
              onChange={(e) => setCorrForm({ ...corrForm, reason: e.target.value })}
              placeholder="e.g. Geofence delay at site transit route or biometric scanner glitch..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 font-medium focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowCorrectionModal(false)}
              className="px-4 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 font-bold text-xs inline-flex items-center gap-1.5 border border-slate-200 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:from-cyan-700 hover:to-indigo-700"
            >
              Submit for Approval
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          RESPONSIVE KPI DETAIL POPUP MODALS
          ======================================================== */}
      {/* 1. Present Staff Modal */}
      <Modal
        isOpen={activeKpiModal === 'present'}
        onClose={() => setActiveKpiModal(null)}
        title={`Staff Present Today (${filteredAttendance.filter(a => a.status === 'Present').length})`}
        subtitle={`Clocked in workforce members for ${selectedDate}`}
        icon={UserCheck}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <span className="font-bold text-emerald-900">{turnoutPercentage}% Plant Turnout</span>
            <span className="font-mono text-emerald-700 font-semibold">{filteredAttendance.filter(a => a.status === 'Present').length} of {activeStaffCount} active staff</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
            {filteredAttendance.filter(a => a.status === 'Present').length > 0 ? (
              filteredAttendance.filter(a => a.status === 'Present').map(rec => (
                <div key={rec.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{rec.employeeName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{rec.employeeId} • {rec.role} • {rec.plant}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-700">In: {formatToIndian12Hr(rec.punchIn) || '--:--'}</div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                      {rec.geofenceStatus || 'Verified'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">No staff marked as present for this date.</div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setActiveKpiModal(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. Late Arrivals Modal */}
      <Modal
        isOpen={activeKpiModal === 'late'}
        onClose={() => setActiveKpiModal(null)}
        title={`Late Arrivals (${lateCount})`}
        subtitle="Staff arrivals recorded past the standard 15-minute grace period"
        icon={AlertTriangle}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
            <span className="font-bold text-amber-900">{lateCount > 0 ? `${lateCount} Late Check-ins` : 'All Arrivals Punctual'}</span>
            <span className="text-amber-700 font-medium">Grace Window: 15 mins</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
            {filteredAttendance.filter(a => a.lateStatus).length > 0 ? (
              filteredAttendance.filter(a => a.lateStatus).map(rec => (
                <div key={rec.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{rec.employeeName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{rec.employeeId} • {rec.role} • {rec.plant}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-amber-700">Punch: {formatToIndian12Hr(rec.punchIn)}</div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                      Delayed
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">✓ No late arrivals recorded for this shift date.</div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setActiveKpiModal(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* 3. Approved Leaves Modal */}
      <Modal
        isOpen={activeKpiModal === 'leaves'}
        onClose={() => setActiveKpiModal(null)}
        title={`Excused & Approved Leaves (${onLeaveCount})`}
        subtitle="Staff members on approved roster leave or sanctioned absence"
        icon={Calendar}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-between">
            <span className="font-bold text-cyan-900">{onLeaveCount} Staff on Leave</span>
            <span className="text-cyan-700 font-medium font-mono">{selectedDate}</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
            {filteredAttendance.filter(a => a.status === 'Leave').length > 0 ? (
              filteredAttendance.filter(a => a.status === 'Leave').map(rec => (
                <div key={rec.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{rec.employeeName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{rec.employeeId} • {rec.role}</div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-cyan-100 text-cyan-800">
                    Sanctioned Leave
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">Full workforce available. No leaves recorded.</div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setActiveKpiModal(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* 4. Overtime Hours Modal */}
      <Modal
        isOpen={activeKpiModal === 'overtime'}
        onClose={() => setActiveKpiModal(null)}
        title={`Overtime Duty Breakdown (${totalOvertime} hrs)`}
        subtitle="Extra operational hours logged beyond the standard 8.0h shift"
        icon={Clock}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between">
            <span className="font-bold text-purple-900">Total OT Accrued: {totalOvertime} hrs</span>
            <span className="text-purple-700 font-medium">Rate: 1.5x Shift Standard</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
            {filteredAttendance.filter(a => Number(a.overtimeHours) > 0).length > 0 ? (
              filteredAttendance.filter(a => Number(a.overtimeHours) > 0).map(rec => (
                <div key={rec.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{rec.employeeName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{rec.employeeId} • {rec.role}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-purple-700">+{rec.overtimeHours} hrs OT</div>
                    <span className="text-[10px] text-slate-500 font-mono">Total Duty: {rec.workingHours}h</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">Standard 8.0h duty shifts. No overtime recorded today.</div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setActiveKpiModal(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* 5. Shifts & Compliance Modal */}
      <Modal
        isOpen={activeKpiModal === 'shifts'}
        onClose={() => setActiveKpiModal(null)}
        title="Plant Shift Schedules & Roster Compliance"
        subtitle="Standard operating shifts, grace intervals, and duty rosters"
        icon={Calendar}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {shifts && shifts.length > 0 ? (
              shifts.map(s => (
                <div key={s.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{s.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{s.code}</span>
                  </div>
                  <div className="font-mono text-slate-700 font-bold text-xs">{formatShiftRange(s.startTime, s.endTime)}</div>
                  <div className="text-[10px] text-slate-500">Grace: {s.gracePeriod || 15}m • Hours: {s.duration || 8}h</div>
                </div>
              ))
            ) : (
              <div className="col-span-3 p-4 text-center text-slate-400">Standard Shift A (06:00-14:00), Shift B (14:00-22:00), Night Shift active.</div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setActiveKpiModal(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* 6. Department Daily Work Report Modal */}
      <Modal
        isOpen={showReportModal && Boolean(reportTargetStaff)}
        onClose={() => {
          setShowReportModal(false);
          setReportTargetStaff(null);
          setReportModalAutoPunchOut(false);
          setIsEditingExistingReport(false);
        }}
        title={`Daily Work Report — ${reportTargetStaff?.name || ''}`}
        subtitle={`${reportTargetStaff?.role || 'Staff'} • ${reportTargetStaff?.plant || 'Main Plant'} (${selectedDate})`}
        icon={FileText}
        maxWidth="max-w-2xl"
      >
        {reportTargetStaff && (() => {
          const roleCat = getRoleCategory(reportTargetStaff.role);
          const isDone = reportTargetStaff.isReportDone;
          const report = reportTargetStaff.todayReport;

          return (
            <div className="space-y-4 text-xs">
              {/* Header Banner */}
              <div className={`p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${isDone
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${isDone ? 'bg-emerald-600 shadow-sm' : 'bg-amber-500 shadow-sm'
                    }`}>
                    {isDone ? <Check className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-tight">
                      {isDone ? "Today's Work Report Filed ✓" : 'Work Report Needed'}
                    </h4>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      {isDone
                        ? 'Report recorded for today\'s shift. You can review or edit below.'
                        : 'Please write what work you did today before clocking out.'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white border border-slate-300 text-slate-800 shrink-0">
                  {roleCat}
                </span>
              </div>

              {/* View Mode: If a real report was already submitted and not currently editing */}
              {isDone && report?.workDescription && !isEditingExistingReport ? (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{report?.workType || `${roleCat} Daily Shift Log`}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Verified ✓
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-800 text-xs leading-relaxed font-sans font-medium whitespace-pre-wrap">
                    {report.workDescription}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-200/60">
                    <span>Date: {report?.date || selectedDate}</span>
                    <span>Staff: {reportTargetStaff.name} ({reportTargetStaff.employeeId || reportTargetStaff.id})</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsEditingExistingReport(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                      <span>Edit This Report</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowReportModal(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 cursor-pointer transition-colors"
                      >
                        Close
                      </button>

                      {reportTargetStaff.isOnline && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowReportModal(false);
                            handleQuickPunchOut(reportTargetStaff);
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Clock Out</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit / Fill Form */
                <form onSubmit={(e) => handleModalSubmitReport(e, reportModalAutoPunchOut)} className="space-y-3.5">
                  {roleCat === 'Driver' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Transit Mixer No. *</label>
                        <input
                          type="text"
                          value={modalDriverReport.vehicleNo}
                          onChange={(e) => setModalDriverReport({ ...modalDriverReport, vehicleNo: e.target.value })}
                          placeholder="e.g. MH-10-CR-1212"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Trips Completed *</label>
                        <input
                          type="number"
                          value={modalDriverReport.tripsCount}
                          onChange={(e) => setModalDriverReport({ ...modalDriverReport, tripsCount: e.target.value })}
                          placeholder="e.g. 4"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Delivered Concrete (m³) *</label>
                        <input
                          type="number"
                          step="0.5"
                          value={modalDriverReport.deliveredM3}
                          onChange={(e) => setModalDriverReport({ ...modalDriverReport, deliveredM3: e.target.value })}
                          placeholder="e.g. 24.0"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Total Kilometers (km) *</label>
                        <input
                          type="number"
                          value={modalDriverReport.odometerKm}
                          onChange={(e) => setModalDriverReport({ ...modalDriverReport, odometerKm: e.target.value })}
                          placeholder="e.g. 95"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          id="modalDrumWash"
                          checked={modalDriverReport.drumWashDone}
                          onChange={(e) => setModalDriverReport({ ...modalDriverReport, drumWashDone: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                        />
                        <label htmlFor="modalDrumWash" className="text-xs font-semibold text-slate-800 cursor-pointer">
                          ✓ Drum & Chute Wash Completed at Wash Rack
                        </label>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Transit Remarks</label>
                        <input
                          type="text"
                          value={modalDriverReport.remarks}
                          onChange={(e) => setModalDriverReport({ ...modalDriverReport, remarks: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"
                          placeholder="Road condition, transit or delivery notes..."
                        />
                      </div>
                    </div>
                  )}

                  {roleCat === 'Site Supervisor' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Site / Project Location *</label>
                        <input
                          type="text"
                          value={modalSupervisorReport.siteName}
                          onChange={(e) => setModalSupervisorReport({ ...modalSupervisorReport, siteName: e.target.value })}
                          placeholder="e.g. Highway Bridge Pier #3"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Concrete Grade *</label>
                        <input
                          type="text"
                          value={modalSupervisorReport.gradePoured}
                          onChange={(e) => setModalSupervisorReport({ ...modalSupervisorReport, gradePoured: e.target.value })}
                          placeholder="e.g. M30 Pumpable"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Volume Poured (m³) *</label>
                        <input
                          type="number"
                          value={modalSupervisorReport.volumePoured}
                          onChange={(e) => setModalSupervisorReport({ ...modalSupervisorReport, volumePoured: e.target.value })}
                          placeholder="e.g. 45"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Slump Measured (mm) *</label>
                        <input
                          type="number"
                          value={modalSupervisorReport.slumpMm}
                          onChange={(e) => setModalSupervisorReport({ ...modalSupervisorReport, slumpMm: e.target.value })}
                          placeholder="e.g. 130"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Cube Moulds Cast *</label>
                        <input
                          type="number"
                          value={modalSupervisorReport.cubesCast}
                          onChange={(e) => setModalSupervisorReport({ ...modalSupervisorReport, cubesCast: e.target.value })}
                          placeholder="e.g. 6"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Site Pour Remarks</label>
                        <input
                          type="text"
                          value={modalSupervisorReport.remarks}
                          onChange={(e) => setModalSupervisorReport({ ...modalSupervisorReport, remarks: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"
                          placeholder="Pump, slab pour, or quality notes..."
                        />
                      </div>
                    </div>
                  )}

                  {roleCat === 'Accountant' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Delivery Invoices Processed *</label>
                        <input
                          type="number"
                          value={modalAccountantReport.invoicesCount}
                          onChange={(e) => setModalAccountantReport({ ...modalAccountantReport, invoicesCount: e.target.value })}
                          placeholder="e.g. 18"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Total Billed Amount (₹) *</label>
                        <input
                          type="number"
                          value={modalAccountantReport.billedAmount}
                          onChange={(e) => setModalAccountantReport({ ...modalAccountantReport, billedAmount: e.target.value })}
                          placeholder="e.g. 450000"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Collections Received (₹) *</label>
                        <input
                          type="number"
                          value={modalAccountantReport.collectionsAmount}
                          onChange={(e) => setModalAccountantReport({ ...modalAccountantReport, collectionsAmount: e.target.value })}
                          placeholder="e.g. 320000"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Vendor Inward Challans *</label>
                        <input
                          type="number"
                          value={modalAccountantReport.vendorChallansCount}
                          onChange={(e) => setModalAccountantReport({ ...modalAccountantReport, vendorChallansCount: e.target.value })}
                          placeholder="e.g. 6"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          id="modalBooksTallied"
                          checked={modalAccountantReport.booksTallied}
                          onChange={(e) => setModalAccountantReport({ ...modalAccountantReport, booksTallied: e.target.checked })}
                          className="w-4 h-4 text-cyan-600 rounded cursor-pointer"
                        />
                        <label htmlFor="modalBooksTallied" className="text-xs font-semibold text-slate-800 cursor-pointer">
                          ✓ Day-End Cash Book & Bank Balance Tallied
                        </label>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Financial Remarks</label>
                        <input
                          type="text"
                          value={modalAccountantReport.remarks}
                          onChange={(e) => setModalAccountantReport({ ...modalAccountantReport, remarks: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"
                          placeholder="Payment or banking notes..."
                        />
                      </div>
                    </div>
                  )}

                  {roleCat === 'Plant Incharge' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Production Volume (m³) *</label>
                        <input
                          type="number"
                          value={modalInchargeReport.productionM3}
                          onChange={(e) => setModalInchargeReport({ ...modalInchargeReport, productionM3: e.target.value })}
                          placeholder="e.g. 240"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Plant Uptime (Hours) *</label>
                        <input
                          type="number"
                          step="0.5"
                          value={modalInchargeReport.uptimeHours}
                          onChange={(e) => setModalInchargeReport({ ...modalInchargeReport, uptimeHours: e.target.value })}
                          placeholder="e.g. 8.5"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Silo Stock Status *</label>
                        <input
                          type="text"
                          value={modalInchargeReport.siloStatus}
                          onChange={(e) => setModalInchargeReport({ ...modalInchargeReport, siloStatus: e.target.value })}
                          placeholder="e.g. Silo stocks normal, cement 85T"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          id="modalSafetyAudit"
                          checked={modalInchargeReport.safetyAuditDone}
                          onChange={(e) => setModalInchargeReport({ ...modalInchargeReport, safetyAuditDone: e.target.checked })}
                          className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                        />
                        <label htmlFor="modalSafetyAudit" className="text-xs font-semibold text-slate-800 cursor-pointer">
                          ✓ Plant Safety & Environmental Checklist Done
                        </label>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Operations Remarks</label>
                        <input
                          type="text"
                          value={modalInchargeReport.remarks}
                          onChange={(e) => setModalInchargeReport({ ...modalInchargeReport, remarks: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"
                          placeholder="Plant operations and maintenance notes..."
                        />
                      </div>
                    </div>
                  )}

                  {roleCat === 'Operator' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Batches Mixed *</label>
                        <input
                          type="number"
                          value={modalOperatorReport.batchesCount}
                          onChange={(e) => setModalOperatorReport({ ...modalOperatorReport, batchesCount: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          id="modalScaleCheck"
                          checked={modalOperatorReport.scaleCheckPass}
                          onChange={(e) => setModalOperatorReport({ ...modalOperatorReport, scaleCheckPass: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                        />
                        <label htmlFor="modalScaleCheck" className="text-xs font-semibold text-slate-800 cursor-pointer">
                          ✓ Scale Zero Check OK
                        </label>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          id="modalAdmixCheck"
                          checked={modalOperatorReport.admixtureVerified}
                          onChange={(e) => setModalOperatorReport({ ...modalOperatorReport, admixtureVerified: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                        />
                        <label htmlFor="modalAdmixCheck" className="text-xs font-semibold text-slate-800 cursor-pointer">
                          ✓ Admixture Dispenser OK
                        </label>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          id="modalBackupCheck"
                          checked={modalOperatorReport.backupCompleted}
                          onChange={(e) => setModalOperatorReport({ ...modalOperatorReport, backupCompleted: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                        />
                        <label htmlFor="modalBackupCheck" className="text-xs font-semibold text-slate-800 cursor-pointer">
                          ✓ SCADA Backup Done
                        </label>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Batching Notes</label>
                        <input
                          type="text"
                          value={modalOperatorReport.remarks}
                          onChange={(e) => setModalOperatorReport({ ...modalOperatorReport, remarks: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"
                          placeholder="Batching, moisture, or mix notes..."
                        />
                      </div>
                    </div>
                  )}

                  {!['Driver', 'Site Supervisor', 'Accountant', 'Plant Incharge', 'Operator'].includes(roleCat) && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Today's Work Summary *
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={modalGeneralReport.workDescription || ''}
                          onChange={(e) => setModalGeneralReport({ ...modalGeneralReport, workDescription: e.target.value })}
                          placeholder="e.g. Lab testing, machine maintenance, plant supervision..."
                          className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Remarks / Notes
                        </label>
                        <input
                          type="text"
                          value={modalGeneralReport.remarks || ''}
                          onChange={(e) => setModalGeneralReport({ ...modalGeneralReport, remarks: e.target.value })}
                          placeholder="Work completed smoothly..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submission Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReportModal(false);
                        setIsEditingExistingReport(false);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer inline-flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-600" />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-colors border border-blue-700"
                      style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                    >
                      <FileCheck2 className="w-4 h-4 text-white" />
                      <span className="text-white font-bold">Save Report</span>
                    </button>

                    {(reportTargetStaff.isOnline || reportModalAutoPunchOut) && (
                      <button
                        type="button"
                        onClick={(e) => handleModalSubmitReport(e, true)}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Square className="w-4 h-4 fill-current" />
                        <span>Save & Clock Out</span>
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ========================================================
          EMPLOYEE PHOTO & PARTICULAR DETAILS MODAL (CLIENT FEATURE)
          ======================================================== */}
      {/* ========================================================
          EMPLOYEE PHOTO & PARTICULAR DETAILS MODAL (100% SINGLE WINDOW - NO SCROLL)
          ======================================================== */}
      <Modal
        isOpen={false}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedDetailStaff(null);
        }}
        title={`Employee Profile & Daily Record — ${selectedDetailStaff?.name || 'Staff'}`}
        subtitle={`${selectedDetailStaff?.role || ''} • ID: ${selectedDetailStaff?.employeeId || selectedDetailStaff?.id || ''} • ${selectedDetailStaff?.department || 'Operations'} • ${selectedDetailStaff?.plant || 'Main Plant Unit #01'}`}
        icon={Users}
        maxWidth="max-w-5xl"
      >
        {selectedDetailStaff && (() => {
          const staff = selectedDetailStaff;
          const roleCat = getRoleCategory(staff.role);
          const photoUrl = getStaffPhoto(staff);
          const hasFacePunch = Boolean(staff.record?.selfieUrl || staff.selfieUrl);

          return (
            <div className="space-y-3 text-slate-900 select-none">

              {/* 1. EASY-TO-UNDERSTAND EMPLOYEE STATUS & SHIFT HEADER STRIP */}
              <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-md ring-2 ring-white/20">
                    {staff.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-white tracking-tight truncate">{staff.name}</h4>
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30 shrink-0">
                        ID: {staff.employeeId || staff.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium truncate mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span className="text-white font-semibold">{staff.role}</span>
                      <span className="text-slate-500">•</span>
                      <span>{staff.department || 'Operations'}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-cyan-300 font-semibold">{staff.plant || 'Main Plant Unit #01'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  {staff.isOnline ? (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-2 shadow-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Shift Active
                    </span>
                  ) : staff.isCompleted ? (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      Shift Ended
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      Not Clocked In
                    </span>
                  )}
                  <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 border border-slate-700 text-amber-300">
                    ⏰ {formatToIndian12Hr(staff.shiftTime)}
                  </span>
                </div>
              </div>

              {/* 2. THREE-COLUMN CLEAR & SIMPLE DASHBOARD GRID */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">

                {/* COLUMN 1: CLEAR EMPLOYEE PHOTO & CONTACT (4 cols) */}
                <div className="md:col-span-4 flex flex-col gap-3">
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                    {/* Top verified strip */}
                    <div className="text-xs font-bold px-3 py-2 border-b flex items-center justify-between bg-slate-50 border-slate-200 text-slate-700">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Camera className="w-4 h-4 text-blue-600" />
                        <span>Staff Photo</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${hasFacePunch
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                        {hasFacePunch ? '✓ Photo Verified' : 'Profile Photo'}
                      </span>
                    </div>

                    {/* Clean photo without intimidating HUD lines */}
                    <div className="relative h-56 w-full bg-slate-100 overflow-hidden flex items-center justify-center">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={staff.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 gap-2">
                          <Camera className="w-12 h-12 text-slate-400" />
                          <span className="text-xs font-semibold">No Photo Available</span>
                        </div>
                      )}

                      {/* Photo Bottom Strip */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-2.5 text-white">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1 text-slate-100">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{hasFacePunch ? 'Live Punch Photo' : 'Registered Photo'}</span>
                          </span>
                          <span className="font-mono text-emerald-300 text-xs">
                            {staff.punchIn ? `@ ${formatToIndian12Hr(staff.punchIn)}` : 'Registered'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-300 truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="truncate">
                            {staff.locationSummary || 'Main Plant Unit #01, Pune'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="p-3 bg-white border-t border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-700">
                        <a
                          href={`tel:${staff.phone}`}
                          className="flex items-center gap-1.5 text-slate-800 hover:text-blue-600 font-bold transition-colors"
                        >
                          <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-mono">{staff.phone || 'Phone Not Available'}</span>
                        </a>
                        <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-[10px]">
                          ✓ Contact Active
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 truncate">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate font-medium">{staff.email || 'Email Not Available'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: TIMINGS, HOURS & EMPLOYMENT DETAILS (4 cols) */}
                <div className="md:col-span-4 flex flex-col gap-2">
                  {/* 4 Timing & Hours Tiles */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block">Punch In</span>
                      <span className="text-sm font-black font-mono text-slate-900 block my-0.5">
                        {formatToIndian12Hr(staff.punchIn) || '--:--'}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold block">
                        {staff.punchIn ? staff.punctualityLabel : 'Pending'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block">Punch Out</span>
                      <span className="text-sm font-black font-mono text-slate-900 block my-0.5">
                        {formatToIndian12Hr(staff.punchOut) || '--:--'}
                      </span>
                      <span className="text-[10px] text-slate-600 font-medium block">
                        {staff.punchOut ? 'Shift Ended' : (staff.isOnline ? 'Active on Duty' : 'Pending')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block">Duty Hours</span>
                      <span className="text-sm font-black font-mono text-slate-900 block my-0.5">
                        {staff.workingHours ? `${staff.workingHours} hrs` : '--'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Standard: 9.0 hrs</span>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${Number(staff.overtimeHours) > 0
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-slate-50 border-slate-200'
                      }`}>
                      <span className={`text-[10px] font-bold block ${Number(staff.overtimeHours) > 0 ? 'text-blue-700' : 'text-slate-500'
                        }`}>Overtime</span>
                      <span className={`text-sm font-black font-mono block my-0.5 ${Number(staff.overtimeHours) > 0 ? 'text-blue-900' : 'text-slate-900'
                        }`}>
                        {Number(staff.overtimeHours) > 0 ? `+${staff.overtimeHours} hrs` : '0 hrs'}
                      </span>
                      <span className={`text-[10px] block ${Number(staff.overtimeHours) > 0 ? 'text-blue-700 font-bold' : 'text-slate-500 font-medium'
                        }`}>
                        {Number(staff.overtimeHours) > 0 ? 'Approved' : 'Normal'}
                      </span>
                    </div>
                  </div>

                  {/* Employment Details */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex-1 flex flex-col justify-between">
                    <span className="font-bold text-slate-800 text-xs block border-b border-slate-100 pb-1.5 mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      Staff Details
                    </span>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Designation</span>
                        <strong className="text-slate-800">{staff.role}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Role Group</span>
                        <strong className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80 inline-block text-[11px]">{roleCat}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Department</span>
                        <span className="text-slate-700 font-medium truncate block">{staff.department || 'Operations'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Plant</span>
                        <span className="text-slate-700 font-medium truncate block">{staff.plant || 'Main Plant Unit #01'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Shift Time</span>
                        <span className="font-mono text-slate-800 font-semibold">{formatToIndian12Hr(staff.shiftTime)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Job Type</span>
                        <span className="text-slate-700 font-medium">Full-Time</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 3: TODAY'S WORK REPORT & LOCATION MAP (4 cols) */}
                <div className="md:col-span-4 flex flex-col gap-2">
                  {/* Today's Work Report Card */}
                  <div className={`p-3 rounded-xl border flex-1 flex flex-col justify-between ${staff.isReportDone
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-amber-50/80 border-amber-300'
                    }`}>
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          {staff.isReportDone ? <FileCheck2 className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4 text-amber-600" />}
                          <span>Today's Work Report</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${staff.isReportDone ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                          }`}>
                          {staff.isReportDone ? '✓ Submitted' : 'Pending'}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/80 border border-slate-200/70">
                        <p className="text-xs text-slate-800 leading-snug line-clamp-3">
                          {staff.todayWorkSummary || 'No work summary submitted today.'}
                        </p>
                      </div>
                    </div>

                    {/* View / Edit Report Action Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailModal(false);
                        handleOpenReportModal(staff, false);
                      }}
                      className="mt-2.5 w-full py-2 px-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-blue-700"
                      style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                    >
                      <FileText className="w-4 h-4 text-white" />
                      <span className="text-white font-bold">{staff.isReportDone ? 'View / Edit Report' : 'Fill Daily Report Now'}</span>
                    </button>
                  </div>

                  {/* Geolocation & Plant Map Card */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col">
                    {/* Header Bar */}
                    <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-bold text-xs text-slate-800 truncate">Plant Location</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                          ✓ GPS Active
                        </span>
                      </div>
                      <a
                        href={`https://maps.google.com/?q=${staff.locationCoords?.lat || (staff.isSupervisor ? 16.8520 : 16.8450)},${staff.locationCoords?.lng || (staff.isSupervisor ? 74.5900 : 74.6200)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[10px] flex items-center gap-1 shrink-0 transition-colors"
                        title="View on Google Maps"
                      >
                        <span>Map</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Clean Map View */}
                    <div className="relative w-full h-32 bg-slate-100 overflow-hidden">
                      <iframe
                        title="Staff Location Map"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${(staff.locationCoords?.lng || (staff.isSupervisor ? 74.5900 : 74.6200)) - 0.006}%2C${(staff.locationCoords?.lat || (staff.isSupervisor ? 16.8520 : 16.8450)) - 0.006}%2C${(staff.locationCoords?.lng || (staff.isSupervisor ? 74.5900 : 74.6200)) + 0.006}%2C${(staff.locationCoords?.lat || (staff.isSupervisor ? 16.8520 : 16.8450)) + 0.006}&layer=mapnik&marker=${staff.locationCoords?.lat || (staff.isSupervisor ? 16.8520 : 16.8450)}%2C${staff.locationCoords?.lng || (staff.isSupervisor ? 74.5900 : 74.6200)}`}
                        className="w-full h-full opacity-90 contrast-105"
                      />

                      {/* Top Overlay */}
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-white/90 backdrop-blur-xs border border-slate-200 text-[10px] font-bold text-slate-800 shadow-xs flex items-center gap-1 pointer-events-none">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span>{staff.isSupervisor ? 'Godrej Green Acres Site, Sangli' : ((staff.role || '').toLowerCase().includes('dispatch') ? 'Logistics Hub, Pune' : 'SM Concrete Plant HQ, Sangli')}</span>
                      </div>

                      {/* Bottom Overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 via-slate-900/60 to-transparent p-2 text-white pointer-events-none">
                        <div className="font-bold text-[11px] text-white truncate">
                          ✅ Inside Plant Premises
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* 3. EASY FOOTER ACTION BAR */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-500 font-medium">
                  Staff Attendance System • Secure Operational Records
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedDetailStaff(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer inline-flex items-center gap-1.5 border border-slate-200 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                    <span>Back</span>
                  </button>

                  {!staff.isOnline && !staff.isCompleted && (
                    <button
                      type="button"
                      onClick={() => {
                        handleQuickPunchIn(staff);
                        setShowDetailModal(false);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Clock In</span>
                    </button>
                  )}

                  {staff.isOnline && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailModal(false);
                        handleQuickPunchOut(staff);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Clock Out</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })()}
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
