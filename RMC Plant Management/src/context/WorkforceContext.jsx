import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  INITIAL_SHIFTS, 
  INITIAL_DAILY_WORK, 
  INITIAL_LEAVES, 
  INITIAL_ADVANCES, 
  INITIAL_LOANS, 
  INITIAL_DOCUMENTS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_HR_SETTINGS 
} from '../data/mockWorkforceData';
import { MOCK_PLANTS } from '../data/mockDashboardData';
import { DEFAULT_COMPANIES } from '../data/companies';
import { useAuth } from './AuthContext';
import { 
  COLLECTIONS, 
  fetchCollection, 
  saveDocumentWithId as saveRawDocumentWithId,
  updateDocument as updateRawDocument,
  removeDocument as removeRawDocument,
  subscribeToCollection,
  createDocument,
  batchSaveDocuments
} from '../services/firestoreService.js';
import { 
  EMPLOYEE_STATUS, 
  validateEmployeeForRegistration 
} from '../services/employeeAuthService.js';
import { OFFICIAL_ROLE_ACCOUNTS } from '../data/mockUsers.js';

const WorkforceContext = createContext(null);

const STORAGE_WORKFORCE_KEY = 'rmc_workforce_state_v9';
const STORAGE_COMPANIES_KEY = 'rmc_companies_v1';
const STORAGE_ACTIVE_COMPANY_KEY = 'rmc_active_company_v1';
const DEFAULT_COMPANY_ID = DEFAULT_COMPANIES[0].id;

function getInitialCompanies() {
  try {
    const stored = localStorage.getItem(STORAGE_COMPANIES_KEY);
    if (stored) {
      const companies = JSON.parse(stored);
      if (Array.isArray(companies) && companies.length > 0) return companies;
    }
  } catch (error) {
    console.error('Failed to load company directory:', error);
  }
  return DEFAULT_COMPANIES;
}

function createEmptyCompanyData(companyId) {
  if (companyId !== DEFAULT_COMPANY_ID) {
    return {
      employees: [],
      shifts: [],
      plants: [],
      attendance: [],
      dailyWork: [],
      leaves: [],
      advances: [],
      loans: [],
      documents: [],
      auditLogs: [],
      hrSettings: INITIAL_HR_SETTINGS,
      payrollRecords: [],
      notifications: [],
      trips: [],
    };
  }

  return {
    employees: [],
    shifts: INITIAL_SHIFTS,
    plants: MOCK_PLANTS,
    attendance: [],
    dailyWork: INITIAL_DAILY_WORK,
    leaves: INITIAL_LEAVES,
    advances: INITIAL_ADVANCES,
    loans: INITIAL_LOANS,
    documents: INITIAL_DOCUMENTS,
    auditLogs: INITIAL_AUDIT_LOGS,
    hrSettings: INITIAL_HR_SETTINGS,
    payrollRecords: [],
    notifications: [],
    trips: [],
  };
}

function loadCompanyData(companyId) {
  try {
    const saved = localStorage.getItem(`${STORAGE_WORKFORCE_KEY}_${companyId}`);
    if (saved) return { ...createEmptyCompanyData(companyId), ...JSON.parse(saved) };

    if (companyId === DEFAULT_COMPANY_ID) {
      const legacy = localStorage.getItem(STORAGE_WORKFORCE_KEY);
      if (legacy) return { ...createEmptyCompanyData(companyId), ...JSON.parse(legacy) };
    }
  } catch (error) {
    console.error(`Failed to load workforce data for company ${companyId}:`, error);
  }
  return createEmptyCompanyData(companyId);
}

function companyCollection(collectionName, companyId) {
  return `${collectionName}_${companyId}`;
}

export const WorkforceProvider = ({ children }) => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState(getInitialCompanies);
  const [activeCompanyId, setActiveCompanyId] = useState(() => {
    try {
      const storedId = localStorage.getItem(STORAGE_ACTIVE_COMPANY_KEY);
      return getInitialCompanies().some((company) => company.id === storedId) ? storedId : DEFAULT_COMPANY_ID;
    } catch {
      return DEFAULT_COMPANY_ID;
    }
  });

  const [data, setData] = useState(() => loadCompanyData(activeCompanyId));
  const activeCompany = companies.find((company) => company.id === activeCompanyId) || companies[0];
  const scopeCollection = (collectionName) => (
    collectionName === COLLECTIONS.USERS || collectionName === COLLECTIONS.COMPANIES
      ? collectionName
      : companyCollection(collectionName, activeCompanyId)
  );
  const saveDocumentWithId = (collectionName, docId, documentData) =>
    saveRawDocumentWithId(scopeCollection(collectionName), docId, documentData);
  const updateDocument = (collectionName, docId, fields) =>
    updateRawDocument(scopeCollection(collectionName), docId, fields);
  const removeDocument = (collectionName, docId) =>
    removeRawDocument(scopeCollection(collectionName), docId);

  useEffect(() => {
    try {
      localStorage.removeItem('rmc_workforce_state_v1');
      localStorage.removeItem('rmc_workforce_state_v2');
      localStorage.removeItem('rmc_workforce_state_v3');
      localStorage.removeItem('rmc_workforce_state_v4');
      localStorage.removeItem('rmc_workforce_state_v5');
      localStorage.removeItem('rmc_workforce_state_v6');
      localStorage.removeItem('rmc_workforce_state_v7');
      localStorage.removeItem('rmc_workforce_state_v8');
      localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(companies));
      localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, activeCompanyId);
    } catch (error) {
      console.error('Failed to persist company selection:', error);
    }
  }, [companies, activeCompanyId]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`, JSON.stringify(data));
    } catch (err) {
      console.error('Workforce storage sync error:', err);
    }
  }, [data, activeCompanyId]);

  useEffect(() => {
    const unsubs = [];
    let isCurrentCompany = true;

    const syncCollection = (collectionName, stateKey) => {
      const scopedCollectionName = companyCollection(collectionName, activeCompanyId);
      const mergeWithDefaults = (items) => {
        return items || [];
      };

      fetchCollection(scopedCollectionName)
        .then(async (scopedItems) => {
          let cloudItems = scopedItems;
          if (activeCompanyId === DEFAULT_COMPANY_ID && scopedItems.length === 0) {
            const legacyItems = await fetchCollection(collectionName);
            if (legacyItems.length > 0) {
              cloudItems = legacyItems;
              await batchSaveDocuments(scopedCollectionName, legacyItems);
            }
          }
          if (isCurrentCompany && cloudItems && cloudItems.length > 0) {
            setData((prev) => ({
              ...prev,
              [stateKey]: mergeWithDefaults(cloudItems, stateKey),
            }));
          }
        })
        .catch((err) => {
          console.warn(`Firestore initial sync for ${collectionName}:`, err.message);
        });

      const unsub = subscribeToCollection(scopedCollectionName, (cloudItems) => {
        if (isCurrentCompany && cloudItems && cloudItems.length > 0) {
          setData((prev) => ({
            ...prev,
            [stateKey]: mergeWithDefaults(cloudItems, stateKey),
          }));
        }
      });
      if (typeof unsub === 'function') unsubs.push(unsub);
    };

    syncCollection(COLLECTIONS.EMPLOYEES, 'employees');
    syncCollection(COLLECTIONS.PLANTS, 'plants');
    syncCollection(COLLECTIONS.ATTENDANCE, 'attendance');
    syncCollection(COLLECTIONS.SHIFTS, 'shifts');
    syncCollection(COLLECTIONS.LEAVES, 'leaves');
    syncCollection(COLLECTIONS.ADVANCES, 'advances');
    syncCollection(COLLECTIONS.LOANS, 'loans');
    syncCollection(COLLECTIONS.DAILY_WORK, 'dailyWork');
    syncCollection(COLLECTIONS.DOCUMENTS, 'documents');

    return () => {
      isCurrentCompany = false;
      unsubs.forEach((u) => typeof u === 'function' && u());
    };
  }, [activeCompanyId]);

  useEffect(() => {
    fetchCollection(COLLECTIONS.COMPANIES)
      .then((cloudCompanies) => {
        if (cloudCompanies.length > 0) {
          setCompanies((current) => {
            const merged = new Map(current.map((company) => [company.id, company]));
            cloudCompanies.forEach((company) => merged.set(company.id, { ...merged.get(company.id), ...company }));
            return Array.from(merged.values());
          });
        }
      })
      .catch((error) => console.warn('Company directory sync unavailable:', error.message));

    const unsubscribe = subscribeToCollection(COLLECTIONS.COMPANIES, (cloudCompanies) => {
      if (cloudCompanies.length > 0) {
        setCompanies((current) => {
          const merged = new Map(current.map((company) => [company.id, company]));
          cloudCompanies.forEach((company) => merged.set(company.id, { ...merged.get(company.id), ...company }));
          return Array.from(merged.values());
        });
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const switchCompany = (companyId) => {
    if (companyId === activeCompanyId || !companies.some((company) => company.id === companyId)) return;
    setData(loadCompanyData(companyId));
    setActiveCompanyId(companyId);
    try {
      localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, companyId);
    } catch (error) {
      console.error('Failed to save active company:', error);
    }
  };

  const addCompany = (companyData) => {
    const name = (companyData.name || '').trim();
    const code = (companyData.code || '').trim().toUpperCase();
    if (!name) throw new Error('Company name is required.');
    if (companies.some((company) => company.name.trim().toLowerCase() === name.toLowerCase())) {
      throw new Error('A company with this name already exists.');
    }
    if (code && companies.some((company) => (company.code || '').trim().toUpperCase() === code)) {
      throw new Error('A company with this node code already exists.');
    }

    const baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company';
    let id = baseId;
    let suffix = 2;
    while (companies.some((company) => company.id === id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    const company = { ...companyData, id, name, code };
    setCompanies((current) => [...current, company]);
    saveRawDocumentWithId(COLLECTIONS.COMPANIES, company.id, company).catch((error) => {
      console.warn('Company saved locally but cloud sync failed:', error.message);
    });
    setData(loadCompanyData(id));
    setActiveCompanyId(id);
    try {
      localStorage.setItem(STORAGE_WORKFORCE_KEY + '_' + id, JSON.stringify(createEmptyCompanyData(id)));
      localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, id);
    } catch (error) {
      console.error('Failed to initialize company workspace:', error);
    }
    return company;
  };

  const removeCompany = (companyId) => {
    if (!companyId) return;
    if (companies.length <= 1) {
      throw new Error('At least one plant or company must remain active.');
    }
    const targetCompany = companies.find((c) => c.id === companyId);
    if (!targetCompany) return;

    const remainingCompanies = companies.filter((c) => c.id !== companyId);
    setCompanies(remainingCompanies);

    if (activeCompanyId === companyId) {
      const nextCompany = remainingCompanies[0];
      setActiveCompanyId(nextCompany.id);
      setData(loadCompanyData(nextCompany.id));
      try {
        localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, nextCompany.id);
      } catch (err) {
        console.error('Failed to update active company:', err);
      }
    }

    try {
      localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(remainingCompanies));
      localStorage.removeItem(`${STORAGE_WORKFORCE_KEY}_${companyId}`);
    } catch (err) {
      console.error('Failed to persist company deletion:', err);
    }

    removeRawDocument(COLLECTIONS.COMPANIES, companyId).catch((error) => {
      console.warn('Company removed locally but cloud delete notice:', error.message);
    });

    addAuditLog(`Removed Plant (${targetCompany.name})`, 'Plant Management', `Plant workspace removed: ${targetCompany.name}`);
    return targetCompany;
  };

  // Helper: record an audit log entry
  const addAuditLog = (action, module, record, status = 'Success') => {
    const newLog = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user: user?.name || 'System Operator',
      role: user?.role || 'Admin',
      action,
      module,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      record,
      status,
    };
    setData((prev) => ({
      ...prev,
      auditLogs: [newLog, ...prev.auditLogs],
    }));
    // Sync to Cloud Firestore
    saveDocumentWithId(COLLECTIONS.AUDIT_LOGS, newLog.id, newLog).catch(() => {});
  };

  // Helper: emit a system notification
  const addNotification = ({ title, desc, type = 'info', category = 'system' }) => {
    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      title,
      desc,
      type,
      category,
      time: 'Just now',
      read: false,
    };
    setData((prev) => ({
      ...prev,
      notifications: [newNotif, ...prev.notifications],
    }));
  };

  const markNotificationRead = (id) => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  };

  const clearNotifications = () => {
    setData((prev) => ({
      ...prev,
      notifications: [],
    }));
  };

  /* -------------------------------------------------------------
   * 1. EMPLOYEE MANAGEMENT & REGISTRATION VERIFICATION
   * ------------------------------------------------------------- */
  const addEmployee = (empData) => {
    // Unique ID check
    const existing = data.employees.find((e) => e.id.toLowerCase() === empData.id.trim().toLowerCase());
    if (existing) {
      throw new Error(`Employee ID "${empData.id}" already exists. Please provide a unique ID.`);
    }

    const newEmp = {
      ...empData,
      id: empData.id.trim().toUpperCase(),
      status: empData.status || EMPLOYEE_STATUS.PENDING_REGISTRATION,
      salary: Number(empData.salary) || 30000,
      joiningDate: empData.joiningDate || new Date().toISOString().split('T')[0],
      shiftId: empData.shiftId || 'SFT-GEN',
    };

    // Save to Cloud Firestore
    saveDocumentWithId(COLLECTIONS.EMPLOYEES, newEmp.id, newEmp).catch(() => {});

    setData((prev) => ({
      ...prev,
      employees: [newEmp, ...prev.employees],
    }));

    addAuditLog(`Created Employee Profile (${newEmp.id})`, 'Employee Management', `${newEmp.name} (${newEmp.role})`);
    addNotification({
      title: 'New Employee Added',
      desc: `${newEmp.name} (${newEmp.id}) created with status ${newEmp.status}.`,
      type: 'success',
      category: 'employee',
    });

    return newEmp;
  };

  const registerEmployeeAccount = (registrationPayload) => {
    const validation = validateEmployeeForRegistration(registrationPayload, data.employees);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { employee } = validation;
    const updatedEmployee = {
      ...employee,
      status: EMPLOYEE_STATUS.PENDING_APPROVAL,
      registeredAt: new Date().toISOString(),
      registeredMobile: registrationPayload.mobile,
      registeredEmail: registrationPayload.email,
      password: registrationPayload.password,
    };

    updateDocument(COLLECTIONS.EMPLOYEES, employee.id, {
      status: EMPLOYEE_STATUS.PENDING_APPROVAL,
      registeredAt: updatedEmployee.registeredAt,
      registeredMobile: updatedEmployee.registeredMobile,
      registeredEmail: updatedEmployee.registeredEmail,
      password: updatedEmployee.password,
    }).catch(() => {});

    setData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => ((e.id || '').toUpperCase() === (employee.id || '').toUpperCase() ? updatedEmployee : e)),
    }));

    addAuditLog(`Registration Submitted (${employee.id})`, 'Employee Verification', `${employee.name} submitted registration for role ${employee.role}. Awaiting Admin verification.`);
    addNotification({
      title: 'New Registration Submitted',
      desc: `${employee.name} (${employee.id}) registered for ${employee.role}. Pending Admin approval.`,
      type: 'warning',
      category: 'registration',
    });

    return {
      success: true,
      employee: updatedEmployee,
      assignedRole: employee.role,
      message: 'Registration successful. Your account is waiting for Admin verification.',
    };
  };

  const approveEmployeeRegistration = (employeeId) => {
    const cleanId = (employeeId || '').toUpperCase();
    const emp = data.employees.find((e) => (e.id || '').toUpperCase() === cleanId);
    if (!emp) throw new Error(`Employee ${employeeId} not found.`);

    const updatedEmp = {
      ...emp,
      status: EMPLOYEE_STATUS.ACTIVE,
      approvedAt: new Date().toISOString(),
      approvedBy: user?.name || 'System Administrator',
    };

    updateDocument(COLLECTIONS.EMPLOYEES, emp.id, {
      status: EMPLOYEE_STATUS.ACTIVE,
      approvedAt: updatedEmp.approvedAt,
      approvedBy: updatedEmp.approvedBy,
    }).catch(() => {});

    setData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => ((e.id || '').toUpperCase() === cleanId ? updatedEmp : e)),
    }));

    // Sync to users database so employee can log in immediately
    try {
      const storedUsersRaw = localStorage.getItem('rmc_users_db_v2');
      const currentUsers = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
      const userIndex = currentUsers.findIndex((u) => (u.employeeId || '').toUpperCase() === cleanId || u.id === `USR-${cleanId}`);
      
      const userRecord = {
        id: `USR-${cleanId}`,
        name: emp.name,
        email: emp.email || emp.registeredEmail,
        employeeId: emp.id,
        phone: emp.mobile || emp.registeredMobile,
        role: emp.role, // TRUSTED role from Admin record
        department: emp.department || 'Operations',
        plantLocation: emp.plant || 'Plant Unit #01',
        password: emp.password,
        status: EMPLOYEE_STATUS.ACTIVE,
        mustChangePassword: false,
        avatar: (emp.name || 'EM').substring(0, 2).toUpperCase(),
        createdAt: emp.registeredAt || new Date().toISOString(),
        lastLoginAt: null,
      };

      if (userIndex >= 0) {
        currentUsers[userIndex] = { ...currentUsers[userIndex], ...userRecord };
      } else {
        currentUsers.unshift(userRecord);
      }
      localStorage.setItem('rmc_users_db_v2', JSON.stringify(currentUsers));
      saveDocumentWithId(COLLECTIONS.USERS, userRecord.id, userRecord).catch(() => {});
    } catch (err) {
      console.warn('Failed to sync approved employee to users store:', err);
    }

    addAuditLog(`Approved Registration (${cleanId})`, 'Employee Verification', `Approved ${emp.name} for ${emp.role}`);
    addNotification({
      title: 'Registration Approved',
      desc: `Employee ${emp.name} (${cleanId}) has been approved and activated.`,
      type: 'success',
      category: 'registration',
    });

    return updatedEmp;
  };

  const rejectEmployeeRegistration = (employeeId, reason = 'Verification requirements not met') => {
    const cleanId = (employeeId || '').toUpperCase();
    const emp = data.employees.find((e) => (e.id || '').toUpperCase() === cleanId);
    if (!emp) throw new Error(`Employee ${employeeId} not found.`);

    const updatedEmp = {
      ...emp,
      status: EMPLOYEE_STATUS.REJECTED,
      rejectedAt: new Date().toISOString(),
      rejectedBy: user?.name || 'System Administrator',
      rejectionReason: reason,
    };

    updateDocument(COLLECTIONS.EMPLOYEES, emp.id, {
      status: EMPLOYEE_STATUS.REJECTED,
      rejectedAt: updatedEmp.rejectedAt,
      rejectedBy: updatedEmp.rejectedBy,
      rejectionReason: reason,
    }).catch(() => {});

    setData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => ((e.id || '').toUpperCase() === cleanId ? updatedEmp : e)),
    }));

    // Remove or deactivate from users database
    try {
      const storedUsersRaw = localStorage.getItem('rmc_users_db_v2');
      if (storedUsersRaw) {
        const currentUsers = JSON.parse(storedUsersRaw);
        const filteredUsers = currentUsers.filter((u) => (u.employeeId || '').toUpperCase() !== cleanId && u.id !== `USR-${cleanId}`);
        localStorage.setItem('rmc_users_db_v2', JSON.stringify(filteredUsers));
      }
      removeDocument(COLLECTIONS.USERS, `USR-${cleanId}`).catch(() => {});
    } catch {
      // ignore
    }

    addAuditLog(`Rejected Registration (${cleanId})`, 'Employee Verification', `Rejected ${emp.name}. Reason: ${reason}`);
    addNotification({
      title: 'Registration Rejected',
      desc: `Registration for ${emp.name} (${cleanId}) was rejected.`,
      type: 'warning',
      category: 'registration',
    });

    return updatedEmp;
  };

  // Driver Trips Management for Task-Level Access
  const addTrip = (tripData) => {
    const newTrip = {
      id: tripData.id || `TRIP-${Date.now().toString().slice(-4)}`,
      dispatchId: tripData.dispatchId || `DSP-${Date.now().toString().slice(-4)}`,
      driverId: (tripData.driverId || '').toUpperCase(),
      driverName: tripData.driverName || 'Driver',
      vehicleNo: tripData.vehicleNo || 'MH-04-AZ-9921',
      customer: tripData.customer || 'L&T Infrastructure',
      site: tripData.site || 'Metro Terminal #04',
      siteAddress: tripData.siteAddress || 'Sector 15, Vashi, Navi Mumbai',
      concreteGrade: tripData.concreteGrade || 'M35 Pumpable',
      quantity: tripData.quantity || '7.5 m³',
      status: tripData.status || 'Active',
      currentStep: tripData.currentStep || 1,
      expectedDeliveryTime: tripData.expectedDeliveryTime || '45 mins',
      assignedAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      trips: [newTrip, ...(prev.trips || [])],
    }));

    addAuditLog(`Assigned Trip (${newTrip.id})`, 'Logistics & Dispatch', `Assigned to Driver ${newTrip.driverId}`);
    return newTrip;
  };

  const updateTripMilestone = (tripId, step) => {
    setData((prev) => ({
      ...prev,
      trips: (prev.trips || []).map((t) => (t.id === tripId ? { ...t, currentStep: step, status: step >= 7 ? 'Delivered' : 'Active' } : t)),
    }));
  };

  const getDriverTrips = (driverId) => {
    if (!driverId) return [];
    const cleanDriverId = driverId.toUpperCase();
    return (data.trips || []).filter(
      (t) => (t.driverId || '').toUpperCase() === cleanDriverId
    );
  };

  const updateEmployee = (id, fields) => {
    // Update in Cloud Firestore
    updateDocument(COLLECTIONS.EMPLOYEES, id, fields).catch(() => {});

    setData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === id ? { ...e, ...fields } : e)),
    }));

    addAuditLog(`Updated Employee (${id})`, 'Employee Management', `Fields modified: ${Object.keys(fields).join(', ')}`);
  };

  const setEmployeeStatus = (id, status) => {
    // Update status in Cloud Firestore
    updateDocument(COLLECTIONS.EMPLOYEES, id, { status }).catch(() => {});

    setData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === id ? { ...e, status } : e)),
    }));

    addAuditLog(`Changed Employee Status (${id})`, 'Employee Management', `Status set to: ${status}`);
    addNotification({
      title: 'Employee Status Changed',
      desc: `Employee ${id} status updated to ${status}.`,
      type: 'info',
      category: 'employee',
    });
  };

  const deleteEmployee = (id) => {
    const empToDelete = data.employees.find((e) => e.id === id);
    const empName = empToDelete?.name || id;

    // Remove from Cloud Firestore
    removeDocument(COLLECTIONS.EMPLOYEES, id).catch(() => {});

    setData((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== id),
      attendance: prev.attendance.filter((a) => a.employeeId !== id),
      leaves: prev.leaves.filter((l) => l.employeeId !== id),
      advances: prev.advances.filter((a) => a.employeeId !== id),
      loans: prev.loans.filter((l) => l.employeeId !== id),
      dailyWork: prev.dailyWork.filter((w) => w.employeeId !== id),
      documents: prev.documents.filter((d) => d.employeeId !== id),
    }));

    addAuditLog(`Deleted Employee (${id})`, 'Employee Management', `Permanently removed ${empName} from workforce records`);
    addNotification({
      title: 'Employee Removed',
      desc: `Employee ${empName} (${id}) has been removed from the directory.`,
      type: 'warning',
      category: 'employee',
    });
  };

  /* -------------------------------------------------------------
   * 2. SHIFT MANAGEMENT & PLANT INFRASTRUCTURE
   * ------------------------------------------------------------- */
  const createShift = (shiftData) => {
    const newShift = {
      ...shiftData,
      id: shiftData.id || `SFT-${Date.now().toString().slice(-4)}`,
      status: shiftData.status || 'Active',
      gracePeriodMins: Number(shiftData.gracePeriodMins) || 15,
      otThresholdHours: Number(shiftData.otThresholdHours) || 8.5,
      otRatePerHour: Number(shiftData.otRatePerHour) || 200,
    };

    saveDocumentWithId(COLLECTIONS.SHIFTS, newShift.id, newShift).catch(() => {});

    setData((prev) => ({
      ...prev,
      shifts: [...prev.shifts, newShift],
    }));
    addAuditLog(`Created Shift (${newShift.name})`, 'Shift Management', `${newShift.startTime} - ${newShift.endTime}`);
    return newShift;
  };

  const updateShift = (id, fields) => {
    updateDocument(COLLECTIONS.SHIFTS, id, fields).catch(() => {});

    setData((prev) => ({
      ...prev,
      shifts: prev.shifts.map((s) => (s.id === id ? { ...s, ...fields } : s)),
    }));
    addAuditLog(`Updated Shift (${id})`, 'Shift Management', `Shift parameters updated.`);
  };

  const deleteShift = (id) => {
    const shift = data.shifts.find((s) => s.id === id);
    removeDocument(COLLECTIONS.SHIFTS, id).catch(() => {});

    setData((prev) => ({
      ...prev,
      shifts: prev.shifts.filter((s) => s.id !== id),
      employees: prev.employees.map((e) => (e.shiftId === id ? { ...e, shiftId: null } : e)),
    }));
    addAuditLog(`Deleted Shift (${shift?.name || id})`, 'Shift Management', `Shift removed from rosters.`);
  };

  const assignShift = (employeeId, shiftId) => {
    updateDocument(COLLECTIONS.EMPLOYEES, employeeId, { shiftId }).catch(() => {});

    setData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === employeeId ? { ...e, shiftId } : e)),
    }));
    const shift = data.shifts.find((s) => s.id === shiftId);
    addAuditLog(`Assigned Shift to ${employeeId}`, 'Shift Management', `Assigned to ${shift?.name || shiftId}`);
  };

  // Plant Node Management
  const addPlant = (plantData) => {
    const newPlant = {
      ...plantData,
      id: plantData.id || `PLT-${Date.now().toString().slice(-4)}`,
      status: plantData.status || 'Online',
    };

    saveDocumentWithId(COLLECTIONS.PLANTS, newPlant.id, newPlant).catch(() => {});

    setData((prev) => ({
      ...prev,
      plants: [...(prev.plants || []), newPlant],
    }));
    addAuditLog(`Registered Concrete Plant (${newPlant.name})`, 'Plant Infrastructure', `Capacity: ${newPlant.capacity}`);
    return newPlant;
  };

  const updatePlant = (id, fields) => {
    updateDocument(COLLECTIONS.PLANTS, id, fields).catch(() => {});

    setData((prev) => ({
      ...prev,
      plants: (prev.plants || []).map((p) => (p.id === id ? { ...p, ...fields } : p)),
    }));
    addAuditLog(`Updated Plant Node (${id})`, 'Plant Infrastructure', `Parameters adjusted.`);
  };

  const deletePlant = (id) => {
    removeDocument(COLLECTIONS.PLANTS, id).catch(() => {});

    setData((prev) => ({
      ...prev,
      plants: (prev.plants || []).filter((p) => p.id !== id),
    }));
    addAuditLog(`De-registered Plant Node (${id})`, 'Plant Infrastructure', `Node removed from plant grid.`);
  };


  /* -------------------------------------------------------------
   * 3. ATTENDANCE MANAGEMENT
   * ------------------------------------------------------------- */
  const checkIn = (employeeId, options = {}) => {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = options.time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const targetId = employeeId || user?.employeeId || user?.id || 'ADM-001';
    
    // 1. Search in data.employees
    let emp = data.employees.find(
      (e) => e.id === targetId || 
             e.employeeId === targetId || 
             e.id?.toLowerCase() === targetId?.toLowerCase() ||
             e.employeeId?.toLowerCase() === targetId?.toLowerCase()
    );

    // 2. Search in OFFICIAL_ROLE_ACCOUNTS
    if (!emp) {
      const roleAcc = OFFICIAL_ROLE_ACCOUNTS.find(
        (r) => r.employeeId === targetId || 
               r.id === targetId || 
               r.employeeId?.toLowerCase() === targetId?.toLowerCase() ||
               r.email?.toLowerCase() === targetId?.toLowerCase()
      );
      if (roleAcc) {
        emp = {
          id: roleAcc.employeeId || roleAcc.id,
          employeeId: roleAcc.employeeId || roleAcc.id,
          name: roleAcc.name,
          role: roleAcc.role,
          department: roleAcc.department || 'Operations',
          plant: roleAcc.plantLocation || (data.plants && data.plants[0]?.name) || 'Main Plant HQ',
          status: 'Active',
          salary: 50000,
          mobile: roleAcc.phone || '+91 98200 00000',
          email: roleAcc.email,
          joiningDate: today,
          shiftId: data.shifts[0]?.id || 'SFT-01',
        };
        setData((prev) => ({
          ...prev,
          employees: [emp, ...prev.employees],
        }));
        saveDocumentWithId(COLLECTIONS.EMPLOYEES, emp.id, emp).catch(() => {});
      }
    }

    // 3. Fallback: check currently authenticated user
    if (!emp && user && (user.employeeId === targetId || user.id === targetId || user.email === targetId || !employeeId)) {
      emp = {
        id: user.employeeId || user.id || 'EMP-001',
        employeeId: user.employeeId || user.id || 'EMP-001',
        name: user.name || 'Staff User',
        role: user.role || 'Staff',
        department: user.department || 'Operations',
        plant: user.plantLocation || (data.plants && data.plants[0]?.name) || 'Main Plant Unit #01',
        status: 'Active',
        salary: 40000,
        mobile: user.phone || '+91 98200 44004',
        email: user.email || 'user@smconcretech.com',
        joiningDate: today,
        shiftId: data.shifts[0]?.id || 'SFT-01',
      };
      setData((prev) => ({
        ...prev,
        employees: [emp, ...prev.employees],
      }));
      saveDocumentWithId(COLLECTIONS.EMPLOYEES, emp.id, emp).catch(() => {});
    }

    // 4. Dynamic provision for any employee ID so attendance never breaks
    if (!emp) {
      emp = {
        id: targetId,
        employeeId: targetId,
        name: options.name || `Staff (${targetId})`,
        role: options.role || 'Staff',
        department: 'Operations',
        plant: (data.plants && data.plants[0]?.name) || 'Main Plant HQ',
        status: 'Active',
        salary: 35000,
        mobile: '+91 98200 00000',
        email: `${targetId.toLowerCase()}@smconcretech.com`,
        joiningDate: today,
        shiftId: data.shifts[0]?.id || 'SFT-01',
      };
      setData((prev) => ({
        ...prev,
        employees: [emp, ...prev.employees],
      }));
      saveDocumentWithId(COLLECTIONS.EMPLOYEES, emp.id, emp).catch(() => {});
    }

    const shift = data.shifts.find((s) => s.id === emp.shiftId) || data.shifts[0];

    // Determine late status
    let lateStatus = false;
    let lateMinutes = 0;
    if (shift && shift.startTime) {
      const [shiftHour, shiftMin] = shift.startTime.split(':').map(Number);
      const [nowHour, nowMin] = nowTime.split(':').map(Number);
      const shiftTotalMins = shiftHour * 60 + shiftMin + (shift.gracePeriodMins || 15);
      const nowTotalMins = nowHour * 60 + nowMin;
      if (nowTotalMins > shiftTotalMins) {
        lateStatus = true;
        lateMinutes = nowTotalMins - (shiftHour * 60 + shiftMin);
      }
    }

    const existingIndex = data.attendance.findIndex(
      (a) => a.date === today && (a.employeeId === emp.id || a.employeeId === emp.employeeId || a.employeeId === targetId)
    );

    const newRecord = {
      id: existingIndex >= 0 ? data.attendance[existingIndex].id : `ATT-${today.replace(/-/g, '')}-${emp.employeeId || emp.id}`,
      date: today,
      employeeId: emp.employeeId || emp.id,
      employeeName: emp.name,
      role: emp.role,
      plant: emp.plant || (data.plants && data.plants[0]?.name) || 'Central Plant',
      punchIn: existingIndex >= 0 && data.attendance[existingIndex].punchIn ? data.attendance[existingIndex].punchIn : nowTime,
      punchOut: existingIndex >= 0 ? data.attendance[existingIndex].punchOut : null,
      workingHours: existingIndex >= 0 ? data.attendance[existingIndex].workingHours : null,
      status: 'Present',
      lateStatus,
      lateMinutes,
      overtimeHours: existingIndex >= 0 ? data.attendance[existingIndex].overtimeHours : 0,
      remarks: options.remarks || 'Clocked in via RMC Mobile/Web Console',
      selfieUrl: options.selfieUrl || (existingIndex >= 0 ? data.attendance[existingIndex].selfieUrl : null),
      gpsLocation: options.gpsLocation || { lat: 18.5204, lng: 73.8567, address: options.address || 'Plant Geofence Area' },
      geofenceStatus: options.geofenceStatus || 'Inside Plant Fence (18m)',
    };

    saveDocumentWithId(COLLECTIONS.ATTENDANCE, newRecord.id, newRecord).catch(() => {});

    setData((prev) => {
      let updatedAttendance;
      if (existingIndex >= 0) {
        updatedAttendance = [...prev.attendance];
        updatedAttendance[existingIndex] = newRecord;
      } else {
        updatedAttendance = [newRecord, ...prev.attendance];
      }
      return { ...prev, attendance: updatedAttendance };
    });

    addAuditLog(`Punch In (${emp.name})`, 'Attendance', `In: ${nowTime} (${newRecord.geofenceStatus})`);
    addNotification({
      title: 'Employee Punched In',
      desc: `${emp.name} (${emp.employeeId || emp.id}) clocked in at ${nowTime} (${lateStatus ? `Late by ${lateMinutes}m` : 'On Time'}).`,
      type: lateStatus ? 'warning' : 'success',
      category: 'attendance',
    });

    return newRecord;
  };

  const checkOut = (employeeId, options = {}) => {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = options.time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const targetId = employeeId || user?.employeeId || user?.id || 'ADM-001';
    
    let emp = data.employees.find(
      (e) => e.id === targetId || 
             e.employeeId === targetId || 
             e.id?.toLowerCase() === targetId?.toLowerCase() ||
             e.employeeId?.toLowerCase() === targetId?.toLowerCase()
    );
    if (!emp) {
      const roleAcc = OFFICIAL_ROLE_ACCOUNTS.find(
        (r) => r.employeeId === targetId || 
               r.id === targetId || 
               r.employeeId?.toLowerCase() === targetId?.toLowerCase() ||
               r.email?.toLowerCase() === targetId?.toLowerCase()
      );
      if (roleAcc) {
        emp = { id: roleAcc.employeeId || roleAcc.id, employeeId: roleAcc.employeeId || roleAcc.id, name: roleAcc.name, role: roleAcc.role, plant: roleAcc.plantLocation };
      }
    }
    if (!emp && user && (user.employeeId === targetId || user.id === targetId || !employeeId)) {
      emp = { id: user.employeeId || user.id, employeeId: user.employeeId || user.id, name: user.name, role: user.role, plant: user.plantLocation };
    }
    if (!emp) {
      emp = { id: targetId, employeeId: targetId, name: targetId, role: 'Staff' };
    }

    const recordIndex = data.attendance.findIndex(
      (a) => a.date === today && (a.employeeId === emp.id || a.employeeId === emp.employeeId || a.employeeId === targetId)
    );
    if (recordIndex < 0 || !data.attendance[recordIndex].punchIn) {
      throw new Error(`No punch-in recorded for ${emp.name || targetId} today (${today}). Please punch in first.`);
    }

    const currentRecord = data.attendance[recordIndex];
    const [inHour, inMin] = currentRecord.punchIn.split(':').map(Number);
    const [outHour, outMin] = nowTime.split(':').map(Number);
    let totalMins = (outHour * 60 + outMin) - (inHour * 60 + inMin);
    if (totalMins < 0) totalMins += 24 * 60; // night shift rollover

    const workingHours = Number((totalMins / 60).toFixed(1));
    const shift = data.shifts.find((s) => s.id === emp.shiftId) || data.shifts[0];
    const otThreshold = shift?.otThresholdHours || 8.5;
    const overtimeHours = workingHours > otThreshold ? Number((workingHours - otThreshold).toFixed(1)) : 0;

    const updatedRecord = {
      ...currentRecord,
      punchOut: nowTime,
      workingHours,
      overtimeHours,
      exitGpsLocation: options.gpsLocation || options.exitGpsLocation || currentRecord.gpsLocation || { lat: 19.0558, lng: 73.0163, address: 'Plant HQ Gate' },
      lastKnownLocation: options.gpsLocation || options.exitGpsLocation || currentRecord.gpsLocation || { lat: 19.0558, lng: 73.0163, address: 'Plant HQ Gate' },
      exitGeofenceStatus: options.geofenceStatus || 'Shift Concluded',
      remarks: options.remarks ? `${currentRecord.remarks} | Out: ${options.remarks}` : currentRecord.remarks,
    };

    saveDocumentWithId(COLLECTIONS.ATTENDANCE, updatedRecord.id, updatedRecord).catch(() => {});

    setData((prev) => {
      const copy = [...prev.attendance];
      copy[recordIndex] = updatedRecord;
      return { ...prev, attendance: copy };
    });

    addAuditLog(`Punch Out (${emp.name})`, 'Attendance', `Out: ${nowTime} | Worked: ${workingHours}h | OT: ${overtimeHours}h`);
    addNotification({
      title: 'Employee Punched Out',
      desc: `${emp.name} (${emp.employeeId || emp.id}) completed duty. Total hours: ${workingHours}h (OT: ${overtimeHours}h).`,
      type: 'info',
      category: 'attendance',
    });

    return updatedRecord;
  };

  const addAttendanceRecord = (attData) => {
    const emp = data.employees.find(
      (e) => e.id === attData.employeeId || e.employeeId === attData.employeeId
    ) || OFFICIAL_ROLE_ACCOUNTS.find(
      (r) => r.employeeId === attData.employeeId || r.id === attData.employeeId
    );

    const newRecord = {
      id: `ATT-${Date.now().toString().slice(-6)}`,
      date: attData.date || new Date().toISOString().split('T')[0],
      employeeId: attData.employeeId,
      employeeName: emp?.name || attData.employeeName || attData.employeeId,
      role: emp?.role || attData.role || 'Staff',
      plant: emp?.plant || attData.plant || (data.plants && data.plants[0]?.name) || 'Central Plant',
      punchIn: attData.punchIn,
      punchOut: attData.punchOut || null,
      workingHours: attData.workingHours || null,
      overtimeHours: attData.overtimeHours || 0,
      status: attData.status || 'Present',
      lateStatus: attData.lateStatus || false,
      lateMinutes: attData.lateMinutes || 0,
      remarks: attData.remarks || 'Admin Manual Entry',
      geofenceStatus: attData.geofenceStatus || 'Verified Inside Plant',
      gpsLocation: attData.gpsLocation || { lat: 18.5204, lng: 73.8567, address: 'Plant Dispatch Hub' }
    };
    saveDocumentWithId(COLLECTIONS.ATTENDANCE, newRecord.id, newRecord).catch(() => {});
    setData((prev) => ({
      ...prev,
      attendance: [newRecord, ...prev.attendance],
    }));
    addAuditLog(`Manual Attendance Added (${newRecord.employeeName})`, 'Attendance', `${newRecord.date} | Status: ${newRecord.status}`);
    return newRecord;
  };

  const updateAttendanceRecord = (id, fields) => {
    updateDocument(COLLECTIONS.ATTENDANCE, id, fields).catch(() => {});

    setData((prev) => ({
      ...prev,
      attendance: prev.attendance.map((a) => (a.id === id ? { ...a, ...fields } : a)),
    }));
    addAuditLog(`Updated Attendance (${id})`, 'Attendance', `Record parameters updated`);
  };

  const deleteAttendanceRecord = (id) => {
    removeDocument(COLLECTIONS.ATTENDANCE, id).catch(() => {});

    setData((prev) => ({
      ...prev,
      attendance: prev.attendance.filter((a) => a.id !== id),
    }));
    addAuditLog(`Deleted Attendance (${id})`, 'Attendance', `Record removed`);
  };

  const requestAttendanceCorrection = ({ employeeId, date, reason, requestedIn, requestedOut }) => {
    const emp = data.employees.find((e) => e.id === employeeId);
    const correctionRequest = {
      id: `CORR-${Date.now()}`,
      employeeId,
      employeeName: emp?.name || employeeId,
      date,
      reason,
      requestedIn,
      requestedOut,
      status: 'Pending',
      submittedAt: new Date().toISOString(),
    };

    // Store in approvals list
    addAuditLog(`Requested Attendance Correction`, 'Attendance', `${emp?.name} for ${date}: In ${requestedIn}, Out ${requestedOut}`);
    addNotification({
      title: 'Attendance Correction Requested',
      desc: `${emp?.name} requested attendance correction for ${date}.`,
      type: 'warning',
      category: 'attendance',
    });

    return correctionRequest;
  };

  /* -------------------------------------------------------------
   * 4. DAILY WORK
   * ------------------------------------------------------------- */
  const submitDailyWork = (workData) => {
    const emp = data.employees.find((e) => e.id === workData.employeeId);
    const newWork = {
      id: `WRK-${Date.now()}`,
      employeeId: workData.employeeId,
      employeeName: emp?.name || workData.employeeName,
      date: workData.date || new Date().toISOString().split('T')[0],
      workDescription: workData.workDescription,
      department: emp?.department || workData.department,
      workType: workData.workType || 'Operational Duty',
      hoursWorked: Number(workData.hoursWorked) || 8,
      remarks: workData.remarks || '',
      status: workData.status || 'Submitted',
      supervisorRemarks: null,
      reviewedBy: null,
    };

    saveDocumentWithId(COLLECTIONS.DAILY_WORK, newWork.id, newWork).catch(() => {});

    setData((prev) => ({
      ...prev,
      dailyWork: [newWork, ...prev.dailyWork],
    }));

    addAuditLog(`Submitted Daily Work Log`, 'Daily Work', `${emp?.name} (${newWork.workType})`);
    addNotification({
      title: 'Daily Work Submitted',
      desc: `${emp?.name} submitted daily log: "${newWork.workDescription.substring(0, 40)}..."`,
      type: 'info',
      category: 'work',
    });

    return newWork;
  };

  const reviewDailyWork = (id, status, supervisorRemarks = '', reviewerUser = null) => {
    const reviewerName = reviewerUser ? `${reviewerUser.name} (${reviewerUser.role})` : user?.name || 'Supervisor';
    updateDocument(COLLECTIONS.DAILY_WORK, id, { status, supervisorRemarks, reviewedBy: reviewerName }).catch(() => {});

    setData((prev) => ({
      ...prev,
      dailyWork: prev.dailyWork.map((w) =>
        w.id === id ? { ...w, status, supervisorRemarks, reviewedBy: reviewerName } : w
      ),
    }));

    addAuditLog(`Reviewed Daily Work (${id})`, 'Daily Work', `Decision: ${status} by ${reviewerName}`);
  };

  const updateDailyWork = (id, fields) => {
    updateDocument(COLLECTIONS.DAILY_WORK, id, fields).catch(() => {});

    setData((prev) => ({
      ...prev,
      dailyWork: prev.dailyWork.map((w) => (w.id === id ? { ...w, ...fields } : w)),
    }));
    addAuditLog(`Updated Daily Work (${id})`, 'Daily Work', `Parameters modified.`);
  };

  const deleteDailyWork = (id) => {
    removeDocument(COLLECTIONS.DAILY_WORK, id).catch(() => {});

    setData((prev) => ({
      ...prev,
      dailyWork: prev.dailyWork.filter((w) => w.id !== id),
    }));
    addAuditLog(`Deleted Daily Work (${id})`, 'Daily Work', `Record removed.`);
  };

  /* -------------------------------------------------------------
   * 5. LEAVE MANAGEMENT
   * ------------------------------------------------------------- */
  const applyLeave = (leaveData) => {
    const emp = data.employees.find((e) => e.id === leaveData.employeeId);
    const newLeave = {
      id: `LEV-${Date.now()}`,
      employeeId: leaveData.employeeId,
      employeeName: emp?.name || leaveData.employeeName,
      role: emp?.role || 'Staff',
      plant: emp?.plant || 'Main Plant Unit #01',
      leaveType: leaveData.leaveType || 'Casual Leave',
      fromDate: leaveData.fromDate,
      toDate: leaveData.toDate,
      days: Number(leaveData.days) || 1,
      reason: leaveData.reason,
      status: 'Pending',
      appliedDate: new Date().toISOString().split('T')[0],
      reviewedBy: null,
      reviewerRemarks: null,
    };

    saveDocumentWithId(COLLECTIONS.LEAVES, newLeave.id, newLeave).catch(() => {});

    setData((prev) => ({
      ...prev,
      leaves: [newLeave, ...prev.leaves],
    }));

    addAuditLog(`Applied for Leave (${newLeave.id})`, 'Leave Management', `${emp?.name} - ${newLeave.days} Days (${newLeave.leaveType})`);
    addNotification({
      title: 'New Leave Request',
      desc: `${emp?.name} requested ${newLeave.days} days ${newLeave.leaveType} (${newLeave.fromDate} to ${newLeave.toDate}).`,
      type: 'warning',
      category: 'leave',
    });

    return newLeave;
  };

  const reviewLeave = (id, status, reviewerRemarks = '', reviewerUser = null) => {
    const reviewerName = reviewerUser ? `${reviewerUser.name} (${reviewerUser.role})` : user?.name || 'Manager';
    const targetLeave = data.leaves.find((l) => l.id === id);

    updateDocument(COLLECTIONS.LEAVES, id, { status, reviewerRemarks, reviewedBy: reviewerName }).catch(() => {});

    setData((prev) => {
      const updatedLeaves = prev.leaves.map((l) =>
        l.id === id ? { ...l, status, reviewerRemarks, reviewedBy: reviewerName } : l
      );

      // If approved, dynamically reflect the leave in the attendance record for the dates!
      let updatedAttendance = [...prev.attendance];
      if (status === 'Approved' && targetLeave) {
        // Mark today or leave dates as Leave in attendance
        const leaveDate = targetLeave.fromDate;
        const existingAtt = updatedAttendance.find((a) => a.date === leaveDate && a.employeeId === targetLeave.employeeId);
        if (existingAtt) {
          updatedAttendance = updatedAttendance.map((a) =>
            a.id === existingAtt.id ? { ...a, status: 'Leave', remarks: `Approved ${targetLeave.leaveType}` } : a
          );
        } else {
          const newLeaveAtt = {
            id: `ATT-${leaveDate.replace(/-/g, '')}-${targetLeave.employeeId}`,
            date: leaveDate,
            employeeId: targetLeave.employeeId,
            employeeName: targetLeave.employeeName,
            role: targetLeave.role,
            plant: targetLeave.plant,
            punchIn: null,
            punchOut: null,
            workingHours: 0,
            status: 'Leave',
            lateStatus: false,
            lateMinutes: 0,
            overtimeHours: 0,
            remarks: `Approved ${targetLeave.leaveType}`,
            selfieUrl: null,
            gpsLocation: null,
            geofenceStatus: 'N/A',
          };
          saveDocumentWithId(COLLECTIONS.ATTENDANCE, newLeaveAtt.id, newLeaveAtt).catch(() => {});
          updatedAttendance.unshift(newLeaveAtt);
        }
      }

      return {
        ...prev,
        leaves: updatedLeaves,
        attendance: updatedAttendance,
      };
    });

    addAuditLog(`Reviewed Leave Application (${id})`, 'Leave Management', `Decision: ${status} by ${reviewerName}`);
    addNotification({
      title: `Leave ${status}`,
      desc: `Leave application for ${targetLeave?.employeeName} was ${status.toLowerCase()}.`,
      type: status === 'Approved' ? 'success' : 'urgent',
      category: 'leave',
    });
  };

  const updateLeave = (id, fields) => {
    updateDocument(COLLECTIONS.LEAVES, id, fields).catch(() => {});

    setData((prev) => ({
      ...prev,
      leaves: prev.leaves.map((l) => (l.id === id ? { ...l, ...fields } : l)),
    }));
    addAuditLog(`Updated Leave (${id})`, 'Leave Management', `Parameters updated.`);
  };

  const deleteLeave = (id) => {
    removeDocument(COLLECTIONS.LEAVES, id).catch(() => {});

    setData((prev) => ({
      ...prev,
      leaves: prev.leaves.filter((l) => l.id !== id),
    }));
    addAuditLog(`Deleted Leave (${id})`, 'Leave Management', `Record removed.`);
  };

  /* -------------------------------------------------------------
   * 6. ADVANCE MANAGEMENT
   * ------------------------------------------------------------- */
  const requestAdvance = (advData) => {
    const emp = data.employees.find((e) => e.id === advData.employeeId);
    const amount = Number(advData.advanceAmount);
    if (!amount || amount <= 0) throw new Error('Please enter a valid advance amount');

    const newAdvance = {
      id: `ADV-${Date.now()}`,
      employeeId: advData.employeeId,
      employeeName: emp?.name || advData.employeeName,
      role: emp?.role || 'Staff',
      plant: emp?.plant || 'Main Plant Unit #01',
      advanceAmount: amount,
      approvedAmount: 0,
      recoveredAmount: 0,
      balance: amount,
      requestDate: new Date().toISOString().split('T')[0],
      reason: advData.reason,
      status: 'Pending',
      remarks: 'Awaiting Accountant approval',
      reviewedBy: null,
    };

    saveDocumentWithId(COLLECTIONS.ADVANCES, newAdvance.id, newAdvance).catch(() => {});

    setData((prev) => ({
      ...prev,
      advances: [newAdvance, ...prev.advances],
    }));

    addAuditLog(`Requested Salary Advance`, 'Advance Management', `${emp?.name} - ₹ ${amount.toLocaleString('en-IN')}`);
    addNotification({
      title: 'Salary Advance Requested',
      desc: `${emp?.name} requested advance of ₹ ${amount.toLocaleString('en-IN')}.`,
      type: 'warning',
      category: 'advance',
    });

    return newAdvance;
  };

  const reviewAdvance = (id, status, approvedAmount = null, reviewerUser = null) => {
    const reviewerName = reviewerUser ? `${reviewerUser.name} (${reviewerUser.role})` : user?.name || 'Accountant';
    const targetAdv = data.advances.find((a) => a.id === id);
    const appAmt = status === 'Approved' ? (approvedAmount !== null ? Number(approvedAmount) : targetAdv.advanceAmount) : 0;

    updateDocument(COLLECTIONS.ADVANCES, id, {
      status,
      approvedAmount: appAmt,
      balance: appAmt,
      remarks: status === 'Approved' ? `Approved for payroll deduction by ${reviewerName}` : 'Rejected',
      reviewedBy: reviewerName,
    }).catch(() => {});

    setData((prev) => ({
      ...prev,
      advances: prev.advances.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              approvedAmount: appAmt,
              balance: appAmt,
              remarks: status === 'Approved' ? `Approved for payroll deduction by ${reviewerName}` : 'Rejected',
              reviewedBy: reviewerName,
            }
          : a
      ),
    }));

    addAuditLog(`Reviewed Advance (${id})`, 'Advance Management', `Decision: ${status} (₹ ${appAmt}) by ${reviewerName}`);
    addNotification({
      title: `Advance Request ${status}`,
      desc: `Advance request of ${targetAdv?.employeeName} was ${status.toLowerCase()} for ₹ ${appAmt.toLocaleString('en-IN')}.`,
      type: status === 'Approved' ? 'success' : 'urgent',
      category: 'advance',
    });
  };

  const updateAdvance = (id, fields) => {
    updateDocument(COLLECTIONS.ADVANCES, id, fields).catch(() => {});

    setData((prev) => ({
      ...prev,
      advances: prev.advances.map((a) => (a.id === id ? { ...a, ...fields } : a)),
    }));
    addAuditLog(`Updated Advance (${id})`, 'Advance Management', `Parameters updated.`);
  };

  const deleteAdvance = (id) => {
    removeDocument(COLLECTIONS.ADVANCES, id).catch(() => {});

    setData((prev) => ({
      ...prev,
      advances: prev.advances.filter((a) => a.id !== id),
    }));
    addAuditLog(`Deleted Advance (${id})`, 'Advance Management', `Record removed.`);
  };

  /* -------------------------------------------------------------
   * 7. LOAN MANAGEMENT
   * ------------------------------------------------------------- */
  const requestLoan = (loanData) => {
    const emp = data.employees.find((e) => e.id === loanData.employeeId);
    const loanAmount = Number(loanData.loanAmount);
    const totalEmis = Number(loanData.totalEmis) || 10;
    const emiAmount = Number(loanData.emiAmount) || Math.round(loanAmount / totalEmis);

    const newLoan = {
      id: `LON-${Date.now()}`,
      employeeId: loanData.employeeId,
      employeeName: emp?.name || loanData.employeeName,
      role: emp?.role || 'Staff',
      loanAmount,
      loanDate: new Date().toISOString().split('T')[0],
      emiAmount,
      totalEmis,
      paidEmis: 0,
      remainingEmis: totalEmis,
      outstandingBalance: loanAmount,
      reason: loanData.reason,
      status: 'Pending',
      approvedBy: null,
    };

    saveDocumentWithId(COLLECTIONS.LOANS, newLoan.id, newLoan).catch(() => {});

    setData((prev) => ({
      ...prev,
      loans: [newLoan, ...prev.loans],
    }));

    addAuditLog(`Applied for Employee Loan`, 'Loan Management', `${emp?.name} - ₹ ${loanAmount.toLocaleString('en-IN')}`);
    addNotification({
      title: 'Employee Loan Application',
      desc: `${emp?.name} applied for company loan of ₹ ${loanAmount.toLocaleString('en-IN')} (${totalEmis} EMIs).`,
      type: 'info',
      category: 'loan',
    });

    return newLoan;
  };

  const reviewLoan = (id, status, reviewerUser = null) => {
    const reviewerName = reviewerUser ? `${reviewerUser.name} (${reviewerUser.role})` : user?.name || 'Director';
    const newStatus = status === 'Approved' ? 'Active' : 'Rejected';

    updateDocument(COLLECTIONS.LOANS, id, { status: newStatus, approvedBy: reviewerName }).catch(() => {});

    setData((prev) => ({
      ...prev,
      loans: prev.loans.map((l) =>
        l.id === id ? { ...l, status: newStatus, approvedBy: reviewerName } : l
      ),
    }));

    addAuditLog(`Reviewed Employee Loan (${id})`, 'Loan Management', `Status set to ${status} by ${reviewerName}`);
  };

  const updateLoan = (id, fields) => {
    updateDocument(COLLECTIONS.LOANS, id, fields).catch(() => {});

    setData((prev) => ({
      ...prev,
      loans: prev.loans.map((l) => (l.id === id ? { ...l, ...fields } : l)),
    }));
    addAuditLog(`Updated Loan (${id})`, 'Loan Management', `Parameters updated.`);
  };

  const deleteLoan = (id) => {
    removeDocument(COLLECTIONS.LOANS, id).catch(() => {});

    setData((prev) => ({
      ...prev,
      loans: prev.loans.filter((l) => l.id !== id),
    }));
    addAuditLog(`Deleted Loan (${id})`, 'Loan Management', `Record removed.`);
  };

  /* -------------------------------------------------------------
   * 8. PAYROLL PREPARATION ENGINE
   * Pure operational computation without mock seeds.
   * ------------------------------------------------------------- */
  const generatePayroll = (monthYear = 'October 2026') => {
    const workingDaysStandard = data.hrSettings.monthlyWorkingDays || 26;
    const standardHours = data.hrSettings.standardWorkingHours || 8;
    const otMultiplier = data.hrSettings.otMultiplier || 1.5;

    const computedRecords = data.employees
      .filter((e) => e.status !== 'Resigned')
      .map((emp) => {
        // Actual attendance stats without dummy seeds
        const empAtt = data.attendance.filter((a) => a.employeeId === emp.id);
        const presentCount = empAtt.filter((a) => a.status === 'Present').length;
        const halfDayCount = empAtt.filter((a) => a.status === 'Half Day').length;
        const presentDays = presentCount + halfDayCount * 0.5;
        const leaveDays = data.leaves
          .filter((l) => l.employeeId === emp.id && l.status === 'Approved')
          .reduce((sum, l) => sum + (Number(l.days) || 0), 0);

        const absentDays = Math.max(0, workingDaysStandard - (presentDays + leaveDays));

        // Actual recorded overtime without fake seed
        const overtimeHours = empAtt.reduce((sum, a) => sum + (Number(a.overtimeHours) || 0), 0);

        // Daily & Hourly Rates
        const basicSalary = Number(emp.salary) || 0;
        const dailyRate = workingDaysStandard > 0 ? basicSalary / workingDaysStandard : 0;
        const hourlyRate = standardHours > 0 ? dailyRate / standardHours : 0;
        const otAmount = Math.round(overtimeHours * hourlyRate * otMultiplier);

        // Earned Basic
        const payableDays = Math.min(workingDaysStandard, presentDays + leaveDays);
        const earnedBasic = Math.round(dailyRate * payableDays);

        // Advance Deductions
        const activeAdv = data.advances.find(
          (a) => a.employeeId === emp.id && (a.status === 'Approved' || a.status === 'Partially Recovered') && a.balance > 0
        );
        const advanceDeduction = activeAdv ? Math.min(activeAdv.balance, 5000) : 0;

        // Loan EMI
        const activeLoan = data.loans.find(
          (l) => l.employeeId === emp.id && l.status === 'Active' && l.remainingEmis > 0
        );
        const loanEmi = activeLoan ? activeLoan.emiAmount : 0;

        // Gross & Net Calculation (zero dummy deduction)
        const allowances = 0;
        const otherDeductions = 0;
        const grossSalary = earnedBasic + otAmount + allowances;
        const totalDeductions = advanceDeduction + loanEmi + otherDeductions;
        const netPayable = Math.max(0, grossSalary - totalDeductions);

        return {
          id: `PAY-${monthYear.replace(/\s+/g, '')}-${emp.id}`,
          monthYear,
          employeeId: emp.id,
          employeeName: emp.name,
          role: emp.role,
          department: emp.department,
          plant: emp.plant,
          basicSalary,
          workingDays: workingDaysStandard,
          presentDays,
          leaveDays,
          absentDays,
          overtimeHours,
          overtimeRate: Math.round(hourlyRate * otMultiplier),
          otAmount,
          allowances,
          advanceDeduction,
          loanEmi,
          otherDeductions,
          earnedBasic,
          grossSalary,
          netPayable,
          status: 'Calculated',
          approvedBy: null,
          approvedAt: null,
        };
      });

    setData((prev) => ({
      ...prev,
      payrollRecords: computedRecords,
    }));

    addAuditLog(`Calculated Payroll Sheet`, 'Payroll Preparation', `Generated ${computedRecords.length} payslips for ${monthYear}`);
    addNotification({
      title: 'Payroll Preparation Computed',
      desc: `Payroll calculated for ${computedRecords.length} active employees (${monthYear}). Ready for review.`,
      type: 'info',
      category: 'payroll',
    });

    return computedRecords;
  };

  const addPayrollRecord = (recordData) => {
    const basicSalary = Number(recordData.basicSalary) || 0;
    const workingDays = Number(recordData.workingDays) || 26;
    const presentDays = Number(recordData.presentDays) || 0;
    const leaveDays = Number(recordData.leaveDays) || 0;
    const overtimeHours = Number(recordData.overtimeHours) || 0;
    const hourlyRate = workingDays > 0 ? (basicSalary / workingDays) / 8 : 0;
    const overtimeRate = Number(recordData.overtimeRate) || Math.round(hourlyRate * 1.5);
    const otAmount = recordData.otAmount !== undefined ? Number(recordData.otAmount) : Math.round(overtimeHours * overtimeRate);
    const allowances = Number(recordData.allowances) || 0;
    const earnedBasic = recordData.earnedBasic !== undefined ? Number(recordData.earnedBasic) : Math.round((basicSalary / (workingDays || 1)) * Math.min(workingDays, presentDays + leaveDays));
    const grossSalary = recordData.grossSalary !== undefined ? Number(recordData.grossSalary) : (earnedBasic + otAmount + allowances);
    const advanceDeduction = Number(recordData.advanceDeduction) || 0;
    const loanEmi = Number(recordData.loanEmi) || 0;
    const otherDeductions = Number(recordData.otherDeductions) || 0;
    const totalDeductions = advanceDeduction + loanEmi + otherDeductions;
    const netPayable = recordData.netPayable !== undefined ? Number(recordData.netPayable) : Math.max(0, grossSalary - totalDeductions);

    const emp = data.employees.find((e) => e.id === recordData.employeeId);

    const newRecord = {
      id: recordData.id || `PAY-${(recordData.monthYear || 'Current').replace(/\s+/g, '')}-${recordData.employeeId}`,
      monthYear: recordData.monthYear || 'October 2026',
      employeeId: recordData.employeeId,
      employeeName: emp?.name || recordData.employeeName || recordData.employeeId,
      role: emp?.role || recordData.role || 'Staff',
      department: emp?.department || recordData.department || 'Operations',
      plant: emp?.plant || recordData.plant || (data.plants && data.plants[0]?.name) || 'Central Plant',
      basicSalary,
      workingDays,
      presentDays,
      leaveDays,
      absentDays: Math.max(0, workingDays - (presentDays + leaveDays)),
      overtimeHours,
      overtimeRate,
      otAmount,
      allowances,
      advanceDeduction,
      loanEmi,
      otherDeductions,
      earnedBasic,
      grossSalary,
      netPayable,
      status: recordData.status || 'Calculated',
      approvedBy: recordData.approvedBy || null,
      approvedAt: recordData.approvedAt || null,
      remarks: recordData.remarks || '',
    };

    setData((prev) => ({
      ...prev,
      payrollRecords: [newRecord, ...prev.payrollRecords.filter((p) => p.id !== newRecord.id)],
    }));
    addAuditLog(`Added Payroll Record`, 'Payroll Preparation', `Record for ${newRecord.employeeName} (${newRecord.monthYear})`);
    return newRecord;
  };

  const updatePayrollRecord = (id, fields) => {
    setData((prev) => ({
      ...prev,
      payrollRecords: prev.payrollRecords.map((p) => {
        if (p.id !== id) return p;
        const merged = { ...p, ...fields };
        const basicSalary = Number(merged.basicSalary) || 0;
        const workingDays = Number(merged.workingDays) || 26;
        const presentDays = Number(merged.presentDays) || 0;
        const leaveDays = Number(merged.leaveDays) || 0;
        const overtimeHours = Number(merged.overtimeHours) || 0;
        const hourlyRate = workingDays > 0 ? (basicSalary / workingDays) / 8 : 0;
        const overtimeRate = Number(merged.overtimeRate) || Math.round(hourlyRate * 1.5);
        const otAmount = fields.otAmount !== undefined ? Number(fields.otAmount) : Math.round(overtimeHours * overtimeRate);
        const allowances = Number(merged.allowances) || 0;
        const earnedBasic = fields.earnedBasic !== undefined ? Number(fields.earnedBasic) : Math.round((basicSalary / (workingDays || 1)) * Math.min(workingDays, presentDays + leaveDays));
        const grossSalary = fields.grossSalary !== undefined ? Number(fields.grossSalary) : (earnedBasic + otAmount + allowances);
        const advanceDeduction = Number(merged.advanceDeduction) || 0;
        const loanEmi = Number(merged.loanEmi) || 0;
        const otherDeductions = Number(merged.otherDeductions) || 0;
        const totalDeductions = advanceDeduction + loanEmi + otherDeductions;
        const netPayable = fields.netPayable !== undefined ? Number(fields.netPayable) : Math.max(0, grossSalary - totalDeductions);

        return {
          ...merged,
          basicSalary,
          workingDays,
          presentDays,
          leaveDays,
          absentDays: Math.max(0, workingDays - (presentDays + leaveDays)),
          overtimeHours,
          overtimeRate,
          otAmount,
          allowances,
          advanceDeduction,
          loanEmi,
          otherDeductions,
          earnedBasic,
          grossSalary,
          netPayable,
        };
      }),
    }));
    addAuditLog(`Updated Payroll Record (${id})`, 'Payroll Preparation', `Record parameters updated`);
  };

  const deletePayrollRecord = (id) => {
    setData((prev) => ({
      ...prev,
      payrollRecords: prev.payrollRecords.filter((p) => p.id !== id),
    }));
    addAuditLog(`Deleted Payroll Record (${id})`, 'Payroll Preparation', `Record removed.`);
  };

  const approvePayroll = (monthYear, approverUser = null) => {
    const approverName = approverUser ? `${approverUser.name} (${approverUser.role})` : user?.name || 'Accountant';

    setData((prev) => {
      // Mark payroll approved
      const updatedPayroll = prev.payrollRecords.map((p) =>
        p.monthYear === monthYear
          ? {
              ...p,
              status: 'Approved',
              approvedBy: approverName,
              approvedAt: new Date().toISOString(),
            }
          : p
      );

      // Deduct advance balances
      let updatedAdvances = [...prev.advances];
      prev.payrollRecords
        .filter((p) => p.monthYear === monthYear && p.advanceDeduction > 0)
        .forEach((p) => {
          updatedAdvances = updatedAdvances.map((adv) => {
            if (adv.employeeId === p.employeeId && adv.balance > 0) {
              const newRecovered = adv.recoveredAmount + p.advanceDeduction;
              const newBalance = Math.max(0, adv.balance - p.advanceDeduction);
              return {
                ...adv,
                recoveredAmount: newRecovered,
                balance: newBalance,
                status: newBalance === 0 ? 'Fully Recovered' : 'Partially Recovered',
              };
            }
            return adv;
          });
        });

      // Deduct loan EMIs
      let updatedLoans = [...prev.loans];
      prev.payrollRecords
        .filter((p) => p.monthYear === monthYear && p.loanEmi > 0)
        .forEach((p) => {
          updatedLoans = updatedLoans.map((l) => {
            if (l.employeeId === p.employeeId && l.status === 'Active' && l.remainingEmis > 0) {
              const newPaid = l.paidEmis + 1;
              const newRemaining = Math.max(0, l.remainingEmis - 1);
              const newBalance = Math.max(0, l.outstandingBalance - l.emiAmount);
              return {
                ...l,
                paidEmis: newPaid,
                remainingEmis: newRemaining,
                outstandingBalance: newBalance,
                status: newRemaining === 0 ? 'Closed' : 'Active',
              };
            }
            return l;
          });
        });

      return {
        ...prev,
        payrollRecords: updatedPayroll,
        advances: updatedAdvances,
        loans: updatedLoans,
      };
    });

    addAuditLog(`Approved Consolidated Payroll`, 'Payroll Preparation', `${monthYear} finalized and locked by ${approverName}`);
    addNotification({
      title: 'Payroll Approved & Locked',
      desc: `Consolidated payroll for ${monthYear} was approved by ${approverName}. Ledger deductions applied.`,
      type: 'success',
      category: 'payroll',
    });
  };

  /* -------------------------------------------------------------
   * 9. UNIVERSAL APPROVALS HUB
   * ------------------------------------------------------------- */
  const pendingApprovals = useMemo(() => {
    const items = [];

    // Leaves
    data.leaves
      .filter((l) => l.status === 'Pending')
      .forEach((l) => {
        items.push({
          id: l.id,
          type: 'Leave Application',
          requester: l.employeeName,
          employeeId: l.employeeId,
          date: l.appliedDate,
          details: `${l.leaveType} (${l.days} Days: ${l.fromDate} to ${l.toDate}) - ${l.reason}`,
          status: 'Pending',
          category: 'leave',
        });
      });

    // Advances
    data.advances
      .filter((a) => a.status === 'Pending')
      .forEach((a) => {
        items.push({
          id: a.id,
          type: 'Salary Advance',
          requester: a.employeeName,
          employeeId: a.employeeId,
          date: a.requestDate,
          details: `Requested: ₹ ${a.advanceAmount.toLocaleString('en-IN')} - ${a.reason}`,
          status: 'Pending',
          category: 'advance',
        });
      });

    // Daily Work
    data.dailyWork
      .filter((w) => w.status === 'Submitted')
      .forEach((w) => {
        items.push({
          id: w.id,
          type: 'Daily Work Log',
          requester: w.employeeName,
          employeeId: w.employeeId,
          date: w.date,
          details: `${w.workType} (${w.hoursWorked} hrs) - ${w.workDescription}`,
          status: 'Pending',
          category: 'work',
        });
      });

    // Loans
    data.loans
      .filter((l) => l.status === 'Pending')
      .forEach((l) => {
        items.push({
          id: l.id,
          type: 'Company Loan',
          requester: l.employeeName,
          employeeId: l.employeeId,
          date: l.loanDate,
          details: `Loan: ₹ ${l.loanAmount.toLocaleString('en-IN')} (${l.totalEmis} EMIs of ₹ ${l.emiAmount.toLocaleString('en-IN')}) - ${l.reason}`,
          status: 'Pending',
          category: 'loan',
        });
      });

    // Employee Registrations awaiting Admin verification
    data.employees
      .filter((e) => e.status === EMPLOYEE_STATUS.PENDING_APPROVAL)
      .forEach((e) => {
        items.push({
          id: e.id,
          type: 'Employee Verification',
          requester: e.name,
          employeeId: e.id,
          date: e.registeredAt ? e.registeredAt.split('T')[0] : new Date().toISOString().split('T')[0],
          details: `Role: ${e.role} | Plant: ${e.plant || 'Unassigned'} | Mobile: ${e.mobile || e.registeredMobile} | Email: ${e.email || e.registeredEmail}`,
          status: 'Pending Approval',
          category: 'registration',
          employee: e,
        });
      });

    return items;
  }, [data.leaves, data.advances, data.dailyWork, data.loans, data.employees]);

  const approveRequest = (category, id, action, remarks = '') => {
    if (category === 'registration') {
      if (action === 'Approved') {
        approveEmployeeRegistration(id);
      } else {
        rejectEmployeeRegistration(id, remarks || 'Verification rejected by Admin');
      }
    } else if (category === 'leave') {
      reviewLeave(id, action, remarks, user);
    } else if (category === 'advance') {
      reviewAdvance(id, action, null, user);
    } else if (category === 'work') {
      reviewDailyWork(id, action, remarks, user);
    } else if (category === 'loan') {
      reviewLoan(id, action, user);
    }
  };

  /* -------------------------------------------------------------
   * 10. EMPLOYEE DOCUMENTS
   * ------------------------------------------------------------- */
  const addDocument = (docData) => {
    const emp = data.employees.find((e) => e.id === docData.employeeId);
    const newDoc = {
      id: `DOC-${Date.now()}`,
      employeeId: docData.employeeId,
      employeeName: emp?.name || docData.employeeName,
      documentType: docData.documentType,
      documentNumber: docData.documentNumber || 'N/A',
      uploadDate: new Date().toISOString().split('T')[0],
      expiryDate: docData.expiryDate || null,
      status: docData.status || 'Available',
      fileSize: docData.fileSize || '1.4 MB (PDF)',
    };

    saveDocumentWithId(COLLECTIONS.DOCUMENTS, newDoc.id, newDoc).catch(() => {});

    setData((prev) => ({
      ...prev,
      documents: [newDoc, ...prev.documents],
    }));
    addAuditLog(`Uploaded Employee Document`, 'Employee Documents', `${emp?.name}: ${newDoc.documentType}`);
    return newDoc;
  };

  const deleteDocument = (id) => {
    removeDocument(COLLECTIONS.DOCUMENTS, id).catch(() => {});

    setData((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== id),
    }));
    addAuditLog(`Deleted Document (${id})`, 'Employee Documents', `Record removed.`);
  };

  /* -------------------------------------------------------------
   * 11. HR SETTINGS
   * ------------------------------------------------------------- */
  const updateHrSettings = (newSettings) => {
    saveDocumentWithId(COLLECTIONS.HR_SETTINGS, 'config', newSettings).catch(() => {});

    setData((prev) => ({
      ...prev,
      hrSettings: { ...prev.hrSettings, ...newSettings },
    }));
    addAuditLog(`Updated HR Parameters`, 'Settings', 'Workforce & Attendance configuration updated');
  };

  const value = {
    // State
    companies,
    activeCompany,
    activeCompanyId,
    switchCompany,
    addCompany,
    removeCompany,
    employees: data.employees,
    shifts: data.shifts,
    plants: data.plants || MOCK_PLANTS,
    attendance: data.attendance,
    dailyWork: data.dailyWork,
    leaves: data.leaves,
    advances: data.advances,
    loans: data.loans,
    payrollRecords: data.payrollRecords,
    documents: data.documents,
    auditLogs: data.auditLogs,
    hrSettings: data.hrSettings,
    notifications: data.notifications,
    trips: data.trips || [],
    pendingApprovals,
    EMPLOYEE_STATUS,

    // Employee Actions & Registration Verification
    addEmployee,
    updateEmployee,
    setEmployeeStatus,
    deleteEmployee,
    registerEmployeeAccount,
    approveEmployeeRegistration,
    rejectEmployeeRegistration,

    // Driver Trips & Logistics (Task-Level Isolation)
    addTrip,
    updateTripMilestone,
    getDriverTrips,

    // Plant Actions
    addPlant,
    updatePlant,
    deletePlant,

    // Shift Actions
    createShift,
    updateShift,
    deleteShift,
    assignShift,

    // Attendance Actions
    checkIn,
    checkOut,
    addAttendanceRecord,
    updateAttendanceRecord,
    deleteAttendanceRecord,
    requestAttendanceCorrection,

    // Daily Work Actions
    submitDailyWork,
    updateDailyWork,
    deleteDailyWork,
    reviewDailyWork,

    // Leave Actions
    applyLeave,
    updateLeave,
    deleteLeave,
    reviewLeave,

    // Advance Actions
    requestAdvance,
    updateAdvance,
    deleteAdvance,
    reviewAdvance,

    // Loan Actions
    requestLoan,
    updateLoan,
    deleteLoan,
    reviewLoan,

    // Payroll Actions
    generatePayroll,
    addPayrollRecord,
    updatePayrollRecord,
    deletePayrollRecord,
    approvePayroll,

    // Approvals
    approveRequest,

    // Documents
    addDocument,
    deleteDocument,

    // Notifications & Logs
    markNotificationRead,
    clearNotifications,
    addAuditLog,
    addNotification,

    // Settings
    updateHrSettings,
  };

  return <WorkforceContext.Provider value={value}>{children}</WorkforceContext.Provider>;
};

export const useWorkforce = () => {
  const context = useContext(WorkforceContext);
  if (!context) {
    throw new Error('useWorkforce must be used within a WorkforceProvider');
  }
  return context;
};
