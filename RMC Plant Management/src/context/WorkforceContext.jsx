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
import defaultLogo from '../assets/logo.png';
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
  validateEmployeeForRegistration,
  createEmployeeFirebaseAuth,
  saveEmployeeCredentials
} from '../services/employeeAuthService.js';
import { OFFICIAL_ROLE_ACCOUNTS } from '../data/mockUsers.js';
import { formatToIndian12Hr, parseTimeToMinutes, getNowIndian12Hr } from '../utils/shiftUtils.js';
import { deleteEmployeeDocumentFile } from '../services/storageService.js';

const WorkforceContext = createContext(null);

const STORAGE_WORKFORCE_KEY = 'rmc_workforce_state_v9';
const STORAGE_COMPANIES_KEY = 'rmc_companies_v1';
const STORAGE_ACTIVE_COMPANY_KEY = 'rmc_active_company_v1';
const DEFAULT_COMPANY_ID = DEFAULT_COMPANIES[0].id;

export const normalizeCompanyId = (id) => {
  if (!id) return DEFAULT_COMPANY_ID;
  if (id === 'CMP-SM-001') return 'sm-concretech';
  return id;
};

function getInitialCompanies() {
  try {
    const stored = localStorage.getItem(STORAGE_COMPANIES_KEY);
    if (stored) {
      const companies = JSON.parse(stored);
      if (Array.isArray(companies) && companies.length > 0) {
        return companies.map((c) => ({
          ...c,
          logo: c.logo || defaultLogo,
        }));
      }
    }
  } catch (error) {
    console.error('Failed to load company directory:', error);
  }
  return DEFAULT_COMPANIES;
}

export const isDummyEmployee = (e) => {
  if (!e) return true;
  const nameLower = (e.name || '').toLowerCase().trim();
  const emailLower = (e.email || '').toLowerCase().trim();
  const idUpper = (e.id || e.employeeId || '').toUpperCase().trim();
  return (
    nameLower.includes('mukta') ||
    nameLower.includes('aayush') ||
    nameLower.includes('ayush') ||
    nameLower.includes('pranav') ||
    nameLower === 'system administrator' ||
    emailLower.includes('mukta@') ||
    emailLower.includes('ayush@') ||
    emailLower.includes('pranav@') ||
    emailLower.includes('abc@gmail.com') ||
    idUpper === 'ADM-001' ||
    idUpper === 'USR-ADMIN-001'
  );
};

export const sanitizeEmployees = (empList) => {
  if (!Array.isArray(empList)) return [];
  return empList.filter((e) => !isDummyEmployee(e));
};

export const sanitizeAttendance = (attList) => {
  if (!Array.isArray(attList)) return [];
  const map = new Map();
  attList.forEach((item) => {
    if (!item) return;
    const dateStr = item.date || (item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '');
    const empId = (item.employeeId || item.id || item.userId || item.employeeName || '').toString().trim().toUpperCase();
    if (!empId) return;

    const key = `${dateStr}_${empId}`;
    if (!map.has(key)) {
      map.set(key, item);
    } else {
      const existing = map.get(key);
      const merged = {
        ...existing,
        ...item,
        punchIn: item.punchIn || existing.punchIn,
        punchOut: item.punchOut || existing.punchOut,
        workingHours: (item.workingHours !== null && item.workingHours !== undefined) ? item.workingHours : existing.workingHours,
        gpsLocation: item.gpsLocation || existing.gpsLocation,
        selfieUrl: item.selfieUrl || existing.selfieUrl,
        geofenceStatus: item.geofenceStatus || existing.geofenceStatus,
        status: (item.status === 'Present' || existing.status === 'Present') ? 'Present' : (item.status || existing.status),
        lateStatus: item.lateStatus || existing.lateStatus,
      };
      map.set(key, merged);
    }
  });
  return Array.from(map.values());
};

export const sanitizeDailyWork = (list) => {
  if (!Array.isArray(list)) return [];
  const map = new Map();
  list.forEach((w) => {
    if (!w) return;
    const empId = (w.employeeId || '').toString().trim().toUpperCase();
    const dateStr = w.date || '';
    const key = w.id || `${empId}_${dateStr}`;
    if (!map.has(key)) {
      map.set(key, w);
    } else {
      map.set(key, { ...map.get(key), ...w });
    }
  });
  return Array.from(map.values());
};

export const sanitizeLeaves = (list) => {
  if (!Array.isArray(list)) return [];
  const map = new Map();
  list.forEach((l) => {
    if (!l) return;
    const empId = (l.employeeId || '').toString().trim().toUpperCase();
    const key = l.id || `${empId}_${l.fromDate}_${l.toDate}`;
    if (!map.has(key)) {
      map.set(key, l);
    } else {
      map.set(key, { ...map.get(key), ...l });
    }
  });
  return Array.from(map.values());
};

export const sanitizeAdvances = (list) => {
  if (!Array.isArray(list)) return [];
  const map = new Map();
  list.forEach((a) => {
    if (!a) return;
    const empId = (a.employeeId || '').toString().trim().toUpperCase();
    const dateStr = a.requestDate || a.date || '';
    const key = a.id || `${empId}_${dateStr}_${a.advanceAmount}`;
    if (!map.has(key)) {
      map.set(key, a);
    } else {
      map.set(key, { ...map.get(key), ...a });
    }
  });
  return Array.from(map.values());
};

export const sanitizeLoans = (list) => {
  if (!Array.isArray(list)) return [];
  const map = new Map();
  list.forEach((l) => {
    if (!l) return;
    const empId = (l.employeeId || '').toString().trim().toUpperCase();
    const key = l.id || `${empId}_${l.loanDate}_${l.loanAmount}`;
    if (!map.has(key)) {
      map.set(key, l);
    } else {
      map.set(key, { ...map.get(key), ...l });
    }
  });
  return Array.from(map.values());
};

function createEmptyCompanyData(companyId) {
  return {
    employees: [],
    shifts: companyId === DEFAULT_COMPANY_ID ? INITIAL_SHIFTS : [],
    plants: companyId === DEFAULT_COMPANY_ID ? MOCK_PLANTS : [],
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
    orders: [],
  };
}

function loadCompanyData(companyId) {
  try {
    const saved = localStorage.getItem(`${STORAGE_WORKFORCE_KEY}_${companyId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...createEmptyCompanyData(companyId),
        ...parsed,
        shifts: Array.isArray(parsed.shifts) ? parsed.shifts : (companyId === DEFAULT_COMPANY_ID ? INITIAL_SHIFTS : []),
        plants: Array.isArray(parsed.plants) ? parsed.plants : (companyId === DEFAULT_COMPANY_ID ? MOCK_PLANTS : []),
        employees: Array.isArray(parsed.employees) ? sanitizeEmployees(parsed.employees) : [],
        attendance: Array.isArray(parsed.attendance) ? sanitizeAttendance(parsed.attendance) : [],
        leaves: Array.isArray(parsed.leaves) ? sanitizeLeaves(parsed.leaves) : [],
        advances: Array.isArray(parsed.advances) ? sanitizeAdvances(parsed.advances) : [],
        loans: Array.isArray(parsed.loans) ? sanitizeLoans(parsed.loans) : [],
        documents: Array.isArray(parsed.documents) ? parsed.documents : [],
        dailyWork: Array.isArray(parsed.dailyWork) ? sanitizeDailyWork(parsed.dailyWork) : [],
        payrollRecords: Array.isArray(parsed.payrollRecords) ? parsed.payrollRecords : [],
      };
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
      const normalized = normalizeCompanyId(storedId);
      return getInitialCompanies().some((company) => company.id === normalized) ? normalized : DEFAULT_COMPANY_ID;
    } catch {
      return DEFAULT_COMPANY_ID;
    }
  });

  // Ensure active company aligns with authenticated user's assigned company partition
  useEffect(() => {
    if (user?.companyId) {
      const normalized = normalizeCompanyId(user.companyId);
      if (normalized !== activeCompanyId && companies.some((c) => c.id === normalized)) {
        setActiveCompanyId(normalized);
        try {
          localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, normalized);
        } catch {}
      }
    }
  }, [user?.companyId, companies, activeCompanyId]);

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
  const removeDocument = async (collectionName, docId) => {
    const scopedCol = scopeCollection(collectionName);
    await removeRawDocument(scopedCol, docId);
    if (activeCompanyId === DEFAULT_COMPANY_ID && scopedCol !== collectionName) {
      await removeRawDocument(collectionName, docId).catch(() => {});
    }
  };

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
      // Purge any stored dummy employees across all localStorage keys on load
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('rmc_workforce_state_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed && Array.isArray(parsed.employees)) {
                const cleaned = sanitizeEmployees(parsed.employees);
                if (cleaned.length !== parsed.employees.length) {
                  parsed.employees = cleaned;
                  localStorage.setItem(key, JSON.stringify(parsed));
                }
              }
            } catch {}
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const sanitizedData = {
        ...data,
        employees: sanitizeEmployees(data.employees),
        attendance: sanitizeAttendance(data.attendance),
        dailyWork: sanitizeDailyWork(data.dailyWork),
        leaves: sanitizeLeaves(data.leaves),
        advances: sanitizeAdvances(data.advances),
        loans: sanitizeLoans(data.loans),
      };
      localStorage.setItem(`${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`, JSON.stringify(sanitizedData));
    } catch (err) {
      console.error('Workforce storage sync error:', err);
    }
  }, [data, activeCompanyId]);

  useEffect(() => {
    const unsubs = [];
    let isCurrentCompany = true;

    const syncCollection = (collectionName, stateKey) => {
      const scopedCollectionName = companyCollection(collectionName, activeCompanyId);

      fetchCollection(scopedCollectionName)
        .then(async (scopedItems) => {
          let cloudItems = scopedItems;
          if (activeCompanyId === DEFAULT_COMPANY_ID && scopedItems.length === 0) {
            const hasInitializedKey = `rmc_initialized_${scopedCollectionName}`;
            const alreadyInitialized = localStorage.getItem(hasInitializedKey);
            if (!alreadyInitialized) {
              const legacyItems = await fetchCollection(collectionName);
              if (legacyItems.length > 0) {
                cloudItems = legacyItems;
                await batchSaveDocuments(scopedCollectionName, legacyItems);
              } else if (stateKey === 'shifts') {
                cloudItems = INITIAL_SHIFTS;
                await batchSaveDocuments(scopedCollectionName, INITIAL_SHIFTS);
              } else if (stateKey === 'plants') {
                cloudItems = MOCK_PLANTS;
                await batchSaveDocuments(scopedCollectionName, MOCK_PLANTS);
              }
              localStorage.setItem(hasInitializedKey, 'true');
            }
          }
          if (stateKey === 'employees' && Array.isArray(cloudItems)) {
            // Auto-clean dummy accounts from Firestore
            const dummyItems = cloudItems.filter(isDummyEmployee);
            if (dummyItems.length > 0) {
              dummyItems.forEach((d) => {
                if (d.id) {
                  removeRawDocument(scopedCollectionName, d.id).catch(() => {});
                  removeRawDocument(collectionName, d.id).catch(() => {});
                }
              });
            }
            cloudItems = sanitizeEmployees(cloudItems);
          }
          if (stateKey === 'attendance' && Array.isArray(cloudItems)) {
            cloudItems = sanitizeAttendance(cloudItems);
          }
          if (isCurrentCompany && Array.isArray(cloudItems)) {
            setData((prev) => ({
              ...prev,
              [stateKey]: cloudItems,
            }));
          }
        })
        .catch((err) => {
          console.warn(`Firestore initial sync for ${collectionName}:`, err.message);
        });

      const unsub = subscribeToCollection(scopedCollectionName, (cloudItems) => {
        let finalItems = cloudItems;
        if (stateKey === 'employees' && Array.isArray(cloudItems)) {
          finalItems = sanitizeEmployees(cloudItems);
        } else if (stateKey === 'attendance' && Array.isArray(cloudItems)) {
          finalItems = sanitizeAttendance(cloudItems);
        } else if (stateKey === 'dailyWork' && Array.isArray(cloudItems)) {
          finalItems = sanitizeDailyWork(cloudItems);
        } else if (stateKey === 'leaves' && Array.isArray(cloudItems)) {
          finalItems = sanitizeLeaves(cloudItems);
        } else if (stateKey === 'advances' && Array.isArray(cloudItems)) {
          finalItems = sanitizeAdvances(cloudItems);
        } else if (stateKey === 'loans' && Array.isArray(cloudItems)) {
          finalItems = sanitizeLoans(cloudItems);
        }
        if (isCurrentCompany && Array.isArray(finalItems)) {
          setData((prev) => ({
            ...prev,
            [stateKey]: finalItems,
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
    syncCollection(COLLECTIONS.ORDERS, 'orders');
    syncCollection(COLLECTIONS.PAYROLL, 'payrollRecords');

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
    
    // 1. Explicitly persist current company data before switching
    try {
      if (activeCompanyId && data) {
        localStorage.setItem(`${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`, JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Failed to save current company before switch:', err);
    }

    // 2. Load target company data and update active ID
    const targetData = loadCompanyData(companyId);
    setData(targetData);
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

    // 1. Explicitly persist current active company data before switching
    try {
      if (activeCompanyId && data) {
        localStorage.setItem(`${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`, JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Failed to save current company before adding new one:', err);
    }

    // 2. Initialize new company workspace with its primary plant node
    const initialCompanyData = {
      ...createEmptyCompanyData(id),
      plants: [
        {
          id: `${id}-plant-01`,
          name: `${name} Main Facility`,
          code: code || 'PLT-1',
          capacity: companyData.capacity || '90 m³/hr',
          location: companyData.location || 'Headquarters Site',
          status: 'Online',
        }
      ]
    };

    try {
      localStorage.setItem(`${STORAGE_WORKFORCE_KEY}_${id}`, JSON.stringify(initialCompanyData));
      localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, id);
    } catch (error) {
      console.error('Failed to initialize company workspace:', error);
    }
    setData(initialCompanyData);
    setActiveCompanyId(id);
    return company;
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
    saveDocumentWithId(COLLECTIONS.AUDIT_LOGS, newLog.id, newLog).catch(() => {});
  };

  const removeCompany = async (companyId) => {
    if (!companyId) return;
    if (companies.length <= 1) {
      throw new Error('At least one plant or company must remain active.');
    }
    const targetCompany = companies.find((c) => c.id === companyId);
    if (!targetCompany) return;

    try {
      await removeRawDocument(COLLECTIONS.COMPANIES, companyId);
    } catch (error) {
      console.warn('Company removed locally but cloud delete notice:', error.message);
    }

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

    addAuditLog(`Removed Plant (${targetCompany.name})`, 'Plant Management', `Plant workspace removed: ${targetCompany.name}`);
    return targetCompany;
  };

  const updateCompany = (companyId, fields) => {
    if (!companyId) return;
    setCompanies((current) => {
      const updated = current.map((c) => (c.id === companyId ? { ...c, ...fields } : c));
      try {
        localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save updated company:', err);
      }
      return updated;
    });

    updateRawDocument(COLLECTIONS.COMPANIES, companyId, fields).catch((err) => {
      console.warn('Company updated locally but cloud sync notice:', err.message);
    });

    addAuditLog(`Updated Company (${companyId})`, 'Company Management', `Company properties updated.`);
  };

  const updateCompanyLogo = (companyId, logoDataUrl) => {
    updateCompany(companyId, { logo: logoDataUrl });
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
    const cleanId = empData.id.trim().toUpperCase();
    const cleanUsername = (empData.username || empData.id).trim().toLowerCase().replace(/^@+/, '');

    // Unique ID check
    const existing = data.employees.find((e) => e.id.toLowerCase() === cleanId.toLowerCase());
    if (existing) {
      throw new Error(`Employee ID "${empData.id}" already exists. Please provide a unique ID.`);
    }

    // Unique Username check
    if (empData.username && empData.username.trim()) {
      const existingUser = data.employees.find(
        (e) => (e.username || '').toLowerCase().replace(/^@+/, '') === cleanUsername && e.id.toLowerCase() !== cleanId.toLowerCase()
      );
      if (existingUser) {
        throw new Error(`Username "${cleanUsername}" is already assigned to ${existingUser.name}. Please select a different username.`);
      }
    }

    const assignedPassword = empData.password || 'Pass@123';
    const assignedStatus = empData.status || EMPLOYEE_STATUS.ACTIVE;

    const newEmp = {
      ...empData,
      id: cleanId,
      username: cleanUsername,
      password: assignedPassword,
      status: assignedStatus,
      salary: Number(empData.salary) || 30000,
      joiningDate: empData.joiningDate || new Date().toISOString().split('T')[0],
      shiftId: empData.shiftId || 'SFT-GEN',
    };

    // Store credentials in authoritative vault for 100% reliable local/remote employee logins
    saveEmployeeCredentials(newEmp, assignedPassword);

    // If status is Active, automatically provision user account in Firebase Auth
    if (newEmp.status === EMPLOYEE_STATUS.ACTIVE) {
      if (newEmp.email && assignedPassword) {
        createEmployeeFirebaseAuth(newEmp.email, assignedPassword).catch((authErr) => {
          console.warn('Firebase Auth employee account provisioning notice:', authErr.message);
        });
      }

      try {
        const storedUsersRaw = localStorage.getItem('rmc_users_db_v2');
        const currentUsers = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
        const userIndex = currentUsers.findIndex(
          (u) => (u.employeeId || '').toUpperCase() === cleanId || u.id === `USR-${cleanId}`
        );

        const userRecord = {
          id: `USR-${cleanId}`,
          employeeId: newEmp.id,
          name: newEmp.name,
          username: newEmp.username,
          password: assignedPassword,
          email: newEmp.email,
          phone: newEmp.mobile,
          role: newEmp.role,
          department: newEmp.department || 'Operations',
          plantLocation: newEmp.plant || 'Plant Unit #01',
          status: EMPLOYEE_STATUS.ACTIVE,
          mustChangePassword: false,
          avatar: (newEmp.name || 'EM').substring(0, 2).toUpperCase(),
          createdAt: newEmp.joiningDate || new Date().toISOString(),
          lastLoginAt: null,
        };

        if (userIndex >= 0) {
          currentUsers[userIndex] = { ...currentUsers[userIndex], ...userRecord };
        } else {
          currentUsers.unshift(userRecord);
        }
        localStorage.setItem('rmc_users_db_v2', JSON.stringify(currentUsers));

        // Save to Firestore without plaintext password
        const { password: _up, ...cloudUserRecord } = userRecord;
        saveDocumentWithId(COLLECTIONS.USERS, userRecord.id, cloudUserRecord).catch(() => {});
      } catch (err) {
        console.warn('Failed to sync new employee to users store:', err);
      }
    }

    // Save to Cloud Firestore without plaintext password
    const { password: _p, ...cloudEmp } = newEmp;
    saveDocumentWithId(COLLECTIONS.EMPLOYEES, newEmp.id, cloudEmp).catch(() => {});

    setData((prev) => ({
      ...prev,
      employees: [newEmp, ...prev.employees],
    }));

    addAuditLog(`Created Employee Profile (${newEmp.id})`, 'Employee Management', `${newEmp.name} (${newEmp.role})`);
    addNotification({
      title: 'New Employee Added',
      desc: `${newEmp.name} (${newEmp.id}) created with username "${newEmp.username}".`,
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
    };
    delete updatedEmployee.password;

    updateDocument(COLLECTIONS.EMPLOYEES, employee.id, {
      status: EMPLOYEE_STATUS.PENDING_APPROVAL,
      registeredAt: updatedEmployee.registeredAt,
      registeredMobile: updatedEmployee.registeredMobile,
      registeredEmail: updatedEmployee.registeredEmail,
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

    // Sync to users database so employee can log in immediately (without plaintext password)
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

  // Concrete Orders & Logistics Management (Plant Scheduling & Dispatch)
  const createOrder = (orderData) => {
    const orderId = orderData.orderId || orderData.id || `ORD-${Date.now().toString().slice(-6)}`;
    let nowIstDate;
    try {
      nowIstDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch {
      nowIstDate = new Date().toISOString().split('T')[0];
    }

    const clientName = orderData.client || orderData.customer || 'Standard Client';
    const projectName = orderData.project || orderData.projectName || 'Site Project';
    const grade = orderData.grade || orderData.mixGrade || orderData.concreteGrade || 'M25';
    const rawVolume = parseFloat(orderData.volume || orderData.qty) || 6.0;
    const qtyStr = orderData.qty
      ? (String(orderData.qty).includes('m³') ? String(orderData.qty) : `${orderData.qty} m³`)
      : `${rawVolume} m³`;

    const newOrder = {
      id: orderId,
      orderId: orderId,
      plant: orderData.plant || 'Main Plant Unit #01',
      plantId: orderData.plantId || 'PLANT-001',
      client: clientName,
      customer: clientName,
      project: projectName,
      projectName: projectName,
      grade: grade,
      mixGrade: grade,
      concreteGrade: grade,
      qty: qtyStr,
      volume: rawVolume,
      site: orderData.site || orderData.pourLocation || orderData.siteAddress || 'Main Pour Location',
      pourLocation: orderData.pourLocation || orderData.site || 'Main Pour Location',
      timeSlot: orderData.timeSlot || orderData.timeWindow || '09:00 AM - 11:00 AM',
      timeWindow: orderData.timeWindow || orderData.timeSlot || '09:00 AM - 11:00 AM',
      priority: orderData.priority || 'Normal',
      status: orderData.status || 'Scheduled',
      scheduledDate: orderData.scheduledDate || nowIstDate,
      createdAt: orderData.createdAt || new Date().toISOString(),
      createdBy: user?.name || 'Authorized User',
      vehicle: orderData.vehicle || '',
      driver: orderData.driver || '',
      notes: orderData.notes || '',
    };

    saveDocumentWithId(COLLECTIONS.ORDERS, newOrder.id, newOrder).catch((err) => {
      console.warn('Failed to sync new order to Cloud Firestore:', err.message);
    });

    setData((prev) => {
      const existing = prev.orders || [];
      const filtered = existing.filter((o) => o.id !== newOrder.id && o.orderId !== newOrder.id);
      return {
        ...prev,
        orders: [newOrder, ...filtered],
      };
    });

    addAuditLog(`Created Concrete Order (${newOrder.id})`, 'Orders & Scheduling', `${newOrder.client} - ${newOrder.grade} (${newOrder.qty})`);
    addNotification({
      title: 'Order Scheduled',
      desc: `Order ${newOrder.id} for ${newOrder.client} (${newOrder.grade}) scheduled.`,
      type: 'info',
      category: 'order',
    });

    return newOrder;
  };

  const updateOrder = (orderId, fields) => {
    updateDocument(COLLECTIONS.ORDERS, orderId, fields).catch((err) => {
      console.warn('Failed to update order in Cloud Firestore:', err.message);
    });

    setData((prev) => ({
      ...prev,
      orders: (prev.orders || []).map((o) => (o.id === orderId || o.orderId === orderId ? { ...o, ...fields } : o)),
    }));

    addAuditLog(`Updated Concrete Order (${orderId})`, 'Orders & Scheduling', `Updated: ${Object.keys(fields).join(', ')}`);
  };

  const cancelOrder = (orderId, reason = 'Cancelled by operations') => {
    const cancellationFields = {
      status: 'Cancelled',
      cancelReason: reason,
      cancelledAt: new Date().toISOString(),
      cancelledBy: user?.name || 'Plant Manager',
    };

    updateDocument(COLLECTIONS.ORDERS, orderId, cancellationFields).catch((err) => {
      console.warn('Failed to cancel order in Cloud Firestore:', err.message);
    });

    setData((prev) => ({
      ...prev,
      orders: (prev.orders || []).map((o) => (o.id === orderId || o.orderId === orderId ? { ...o, ...cancellationFields } : o)),
    }));

    addAuditLog(`Cancelled Concrete Order (${orderId})`, 'Orders & Scheduling', `Reason: ${reason}`);
    addNotification({
      title: 'Order Cancelled',
      desc: `Order ${orderId} was cancelled. Reason: ${reason}`,
      type: 'warning',
      category: 'order',
    });
  };

  const updateEmployee = (id, fields) => {
    const cleanId = (id || '').toUpperCase();
    const cleanFields = { ...fields };
    if (cleanFields.username) {
      cleanFields.username = cleanFields.username.toLowerCase().replace(/^@+/, '').trim();
    }

    // Save to Vault if password was updated
    if (cleanFields.password) {
      saveEmployeeCredentials({ id: cleanId, ...cleanFields }, cleanFields.password);
    }

    // Update in Cloud Firestore (without password)
    const { password: _p, ...cloudFields } = cleanFields;
    updateDocument(COLLECTIONS.EMPLOYEES, id, cloudFields).catch(() => {});

    setData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === id ? { ...e, ...cleanFields } : e)),
    }));

    // Sync updated credentials and info to user account store
    try {
      const storedUsersRaw = localStorage.getItem('rmc_users_db_v2');
      if (storedUsersRaw) {
        const currentUsers = JSON.parse(storedUsersRaw);
        const userIndex = currentUsers.findIndex(
          (u) => (u.employeeId || '').toUpperCase() === cleanId || u.id === `USR-${cleanId}`
        );
        if (userIndex >= 0) {
          const u = currentUsers[userIndex];
          currentUsers[userIndex] = {
            ...u,
            ...(cleanFields.name && { name: cleanFields.name }),
            ...(cleanFields.username && { username: cleanFields.username }),
            ...(cleanFields.email && { email: cleanFields.email }),
            ...(cleanFields.mobile && { phone: cleanFields.mobile }),
            ...(cleanFields.role && { role: cleanFields.role }),
            ...(cleanFields.status && { status: cleanFields.status }),
            ...(cleanFields.department && { department: cleanFields.department }),
            ...(cleanFields.plant && { plantLocation: cleanFields.plant }),
            ...(cleanFields.password && { password: cleanFields.password }),
          };
          localStorage.setItem('rmc_users_db_v2', JSON.stringify(currentUsers));
          const { password: _up, ...cloudUserRecord } = currentUsers[userIndex];
          updateDocument(COLLECTIONS.USERS, `USR-${cleanId}`, cloudUserRecord).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Failed to sync updated employee to users store:', err);
    }

    addAuditLog(`Updated Employee (${id})`, 'Employee Management', `Fields modified: ${Object.keys(fields).join(', ')}`);
  };

  const setEmployeeStatus = (id, status) => {
    // Update status in Cloud Firestore
    updateDocument(COLLECTIONS.EMPLOYEES, id, { status }).catch(() => {});

    setData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === id ? { ...e, status } : e)),
    }));

    try {
      const cleanId = (id || '').toUpperCase();
      const storedUsersRaw = localStorage.getItem('rmc_users_db_v2');
      if (storedUsersRaw) {
        const currentUsers = JSON.parse(storedUsersRaw);
        const userIndex = currentUsers.findIndex(
          (u) => (u.employeeId || '').toUpperCase() === cleanId || u.id === `USR-${cleanId}`
        );
        if (userIndex >= 0) {
          currentUsers[userIndex].status = status;
          localStorage.setItem('rmc_users_db_v2', JSON.stringify(currentUsers));
          updateDocument(COLLECTIONS.USERS, `USR-${cleanId}`, { status }).catch(() => {});
        }
      }
    } catch {
      // ignore
    }

    addAuditLog(`Changed Employee Status (${id})`, 'Employee Management', `Status set to: ${status}`);
    addNotification({
      title: 'Employee Status Changed',
      desc: `Employee ${id} status updated to ${status}.`,
      type: 'info',
      category: 'employee',
    });
  };

  const deleteEmployee = async (id) => {
    const empToDelete = data.employees.find((e) => e.id === id);
    const empName = empToDelete?.name || id;
    const cleanId = (id || '').toUpperCase();

    // 1. Remove employee from Cloud Firestore (scoped AND legacy collections)
    await removeDocument(COLLECTIONS.EMPLOYEES, id);

    // 2. Cascade delete all related attendance records from Firestore
    const relatedAtt = (data.attendance || []).filter((a) => (a.employeeId || '').toUpperCase() === cleanId);
    for (const att of relatedAtt) {
      await removeDocument(COLLECTIONS.ATTENDANCE, att.id).catch(() => {});
    }

    // 3. Cascade delete related leaves, advances, loans, dailyWork from Firestore
    const relatedLeaves = (data.leaves || []).filter((l) => (l.employeeId || '').toUpperCase() === cleanId);
    for (const lev of relatedLeaves) {
      await removeDocument(COLLECTIONS.LEAVES, lev.id).catch(() => {});
    }
    const relatedAdvances = (data.advances || []).filter((a) => (a.employeeId || '').toUpperCase() === cleanId);
    for (const adv of relatedAdvances) {
      await removeDocument(COLLECTIONS.ADVANCES, adv.id).catch(() => {});
    }
    const relatedLoans = (data.loans || []).filter((l) => (l.employeeId || '').toUpperCase() === cleanId);
    for (const lon of relatedLoans) {
      await removeDocument(COLLECTIONS.LOANS, lon.id).catch(() => {});
    }
    const relatedWork = (data.dailyWork || []).filter((w) => (w.employeeId || '').toUpperCase() === cleanId);
    for (const wrk of relatedWork) {
      await removeDocument(COLLECTIONS.DAILY_WORK, wrk.id).catch(() => {});
    }

    // 4. Remove associated user credentials from users collection & localStorage
    try {
      const storedUsersRaw = localStorage.getItem('rmc_users_db_v2');
      if (storedUsersRaw) {
        const currentUsers = JSON.parse(storedUsersRaw);
        const filtered = currentUsers.filter(
          (u) => (u.employeeId || '').toUpperCase() !== cleanId && u.id !== `USR-${cleanId}`
        );
        localStorage.setItem('rmc_users_db_v2', JSON.stringify(filtered));
      }
      await removeDocument(COLLECTIONS.USERS, `USR-${cleanId}`).catch(() => {});
      await removeDocument(COLLECTIONS.USERS, cleanId).catch(() => {});
    } catch {
      // ignore
    }

    // 5. Update state and localStorage immediately
    const nextState = {
      ...data,
      employees: data.employees.filter((e) => (e.id || '').toUpperCase() !== cleanId),
      attendance: data.attendance.filter((a) => (a.employeeId || '').toUpperCase() !== cleanId),
      leaves: data.leaves.filter((l) => (l.employeeId || '').toUpperCase() !== cleanId),
      advances: data.advances.filter((a) => (a.employeeId || '').toUpperCase() !== cleanId),
      loans: data.loans.filter((l) => (l.employeeId || '').toUpperCase() !== cleanId),
      dailyWork: data.dailyWork.filter((w) => (w.employeeId || '').toUpperCase() !== cleanId),
      documents: data.documents.filter((d) => (d.employeeId || '').toUpperCase() !== cleanId),
    };
    setData(nextState);

    try {
      localStorage.setItem(`${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`, JSON.stringify(nextState));
    } catch (err) {
      console.warn('Failed to save to localStorage:', err);
    }

    addAuditLog(`Deleted Employee (${id})`, 'Employee Management', `Permanently removed ${empName} from workforce records`);
    addNotification({
      title: 'Employee Removed',
      desc: `Employee ${empName} (${id}) has been removed from active workforce.`,
      type: 'warning',
      category: 'workforce',
    });
  };

  /* -------------------------------------------------------------
   * 2. SHIFT MANAGEMENT & PLANT INFRASTRUCTURE
   * ------------------------------------------------------------- */
  const createShift = async (shiftData) => {
    const newShift = {
      ...shiftData,
      id: shiftData.id || `SFT-${Date.now().toString().slice(-4)}`,
      status: shiftData.status || 'Active',
      gracePeriodMins: Number(shiftData.gracePeriodMins) || 15,
      otThresholdHours: Number(shiftData.otThresholdHours) || 8.5,
      otRatePerHour: Number(shiftData.otRatePerHour) || 200,
    };

    await saveDocumentWithId(COLLECTIONS.SHIFTS, newShift.id, newShift);

    const nextState = {
      ...data,
      shifts: [...data.shifts, newShift],
    };
    setData(nextState);
    try {
      localStorage.setItem(`${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`, JSON.stringify(nextState));
    } catch (err) {
      console.warn('Failed to save to localStorage:', err);
    }

    addAuditLog(`Created Shift (${newShift.name})`, 'Shift Management', `${newShift.startTime} - ${newShift.endTime}`);
    return newShift;
  };

  const updateShift = async (id, fields) => {
    await updateDocument(COLLECTIONS.SHIFTS, id, fields);

    const nextState = {
      ...data,
      shifts: data.shifts.map((s) => (s.id === id ? { ...s, ...fields } : s)),
    };
    setData(nextState);
    try {
      localStorage.setItem(`${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`, JSON.stringify(nextState));
    } catch (err) {
      console.warn('Failed to save to localStorage:', err);
    }
    addAuditLog(`Updated Shift (${id})`, 'Shift Management', `Shift parameters updated.`);
  };

  const deleteShift = async (id) => {
    const shift = data.shifts.find((s) => s.id === id);
    await removeDocument(COLLECTIONS.SHIFTS, id);

    const nextState = {
      ...data,
      shifts: data.shifts.filter((s) => s.id !== id),
      employees: data.employees.map((e) => (e.shiftId === id ? { ...e, shiftId: null } : e)),
    };
    setData(nextState);

    try {
      localStorage.setItem(`${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`, JSON.stringify(nextState));
    } catch (err) {
      console.warn('Failed to save to localStorage:', err);
    }
    addAuditLog(`Deleted Shift (${shift?.name || id})`, 'Shift Management', `Shift removed from rosters.`);
  };

  const assignShift = async (employeeId, shiftId) => {
    await updateDocument(COLLECTIONS.EMPLOYEES, employeeId, { shiftId });

    const nextState = {
      ...data,
      employees: data.employees.map((e) => (e.id === employeeId ? { ...e, shiftId } : e)),
    };
    setData(nextState);
    try {
      localStorage.setItem(`${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`, JSON.stringify(nextState));
    } catch (err) {
      console.warn('Failed to save to localStorage:', err);
    }
    const shift = data.shifts.find((s) => s.id === shiftId);
    addAuditLog(`Assigned Shift to ${employeeId}`, 'Shift Management', `Assigned to ${shift?.name || shiftId}`);
  };

  // Plant Node Management
  const addPlant = async (plantData) => {
    const newPlant = {
      ...plantData,
      id: plantData.id || `PLT-${Date.now().toString().slice(-4)}`,
      status: plantData.status || 'Online',
    };

    await saveDocumentWithId(COLLECTIONS.PLANTS, newPlant.id, newPlant);

    const nextState = {
      ...data,
      plants: [...(data.plants || []), newPlant],
    };
    setData(nextState);
    try {
      localStorage.setItem(`${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`, JSON.stringify(nextState));
    } catch (err) {
      console.warn('Failed to save to localStorage:', err);
    }
    addAuditLog(`Registered Concrete Plant (${newPlant.name})`, 'Plant Infrastructure', `Capacity: ${newPlant.capacity}`);
    return newPlant;
  };

  const updatePlant = async (id, fields) => {
    await updateDocument(COLLECTIONS.PLANTS, id, fields);

    const nextState = {
      ...data,
      plants: (data.plants || []).map((p) => (p.id === id ? { ...p, ...fields } : p)),
    };
    setData(nextState);
    try {
      localStorage.setItem(`${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`, JSON.stringify(nextState));
    } catch (err) {
      console.warn('Failed to save to localStorage:', err);
    }
    addAuditLog(`Updated Plant Node (${id})`, 'Plant Infrastructure', `Parameters adjusted.`);
  };

  const deletePlant = async (id) => {
    await removeDocument(COLLECTIONS.PLANTS, id);

    const nextState = {
      ...data,
      plants: (data.plants || []).filter((p) => p.id !== id),
    };
    setData(nextState);
    try {
      localStorage.setItem(`${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`, JSON.stringify(nextState));
    } catch (err) {
      console.warn('Failed to save to localStorage:', err);
    }
    addAuditLog(`De-registered Plant Node (${id})`, 'Plant Infrastructure', `Node removed from plant grid.`);
  };


  /* -------------------------------------------------------------
   * 3. ATTENDANCE MANAGEMENT
   * ------------------------------------------------------------- */
  const checkIn = async (employeeId, options = {}) => {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = options.time ? formatToIndian12Hr(options.time) : getNowIndian12Hr(false);
    const defaultId = user?.employeeId || user?.id || (user?.role === 'Plant Manager' ? 'PM-001' : (user?.role === 'Driver' ? 'DRV-001' : 'ADM-001'));
    const targetId = employeeId || defaultId;
    
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

    // 4. If employee record is not found in workforce, do NOT auto-create a ghost employee in Firestore
    if (!emp) {
      throw new Error(`Employee record "${targetId}" is not registered in active workforce. Please contact Administrator.`);
    }

    const shift = data.shifts.find((s) => s.id === emp.shiftId) || data.shifts[0];

    // Determine late status
    let lateStatus = false;
    let lateMinutes = 0;
    if (shift && shift.startTime) {
      const shiftMins = parseTimeToMinutes(shift.startTime);
      const nowTotalMins = parseTimeToMinutes(nowTime);
      const shiftAllowedMins = shiftMins + (shift.gracePeriodMins || 15);
      if (nowTotalMins > shiftAllowedMins) {
        lateStatus = true;
        lateMinutes = nowTotalMins - shiftMins;
      }
    }

    const canonicalEmpId = (emp.employeeId || emp.id || targetId).toString().trim().toUpperCase();
    const docId = `ATT-${today.replace(/-/g, '')}-${canonicalEmpId.replace(/[^A-Z0-9_-]/g, '')}`;

    const existingIndex = data.attendance.findIndex((a) => {
      const aDate = a.date || (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '');
      const aEmpId = (a.employeeId || a.id || '').toString().trim().toUpperCase();
      const aName = (a.employeeName || '').toString().trim().toLowerCase();
      const empName = (emp.name || '').toString().trim().toLowerCase();
      return (a.id === docId) || (aDate === today && (aEmpId === canonicalEmpId || (aName && empName && aName === empName)));
    });

    // Prevent duplicate punch-ins unless explicitly overridden (e.g. by Admin reset)
    if (existingIndex >= 0 && data.attendance[existingIndex]?.punchIn && !options.allowOverride) {
      throw new Error(`Employee ${emp.name} has already punched in today at ${formatToIndian12Hr(data.attendance[existingIndex].punchIn)}.`);
    }

    const actualPunchIn = options.time ? formatToIndian12Hr(options.time) : nowTime;

    const newRecord = {
      ...(existingIndex >= 0 ? data.attendance[existingIndex] : {}),
      id: existingIndex >= 0 ? (data.attendance[existingIndex].id || docId) : docId,
      date: today,
      employeeId: emp.employeeId || emp.id,
      userId: user?.uid || user?.id || null,
      companyId: activeCompanyId,
      employeeName: emp.name,
      role: emp.role,
      plant: emp.plant || (data.plants && data.plants[0]?.name) || 'Central Plant',
      punchIn: actualPunchIn, // Always record the actual real punch in time
      punchOut: existingIndex >= 0 ? data.attendance[existingIndex].punchOut : null, // Starting shift - punch out is null until clocked out
      workingHours: existingIndex >= 0 ? data.attendance[existingIndex].workingHours : null,
      status: 'Present',
      lateStatus,
      lateMinutes,
      overtimeHours: 0,
      remarks: options.remarks || 'Clocked in via RMC Mobile/Web Console',
      selfieUrl: options.selfieUrl || (existingIndex >= 0 ? data.attendance[existingIndex].selfieUrl : null),
      gpsLocation: options.gpsLocation || (existingIndex >= 0 ? data.attendance[existingIndex].gpsLocation : null),
      geofenceStatus: options.geofenceStatus || (options.gpsLocation ? 'Live GPS Verified' : 'Location Not Available'),
      createdAt: existingIndex >= 0 ? (data.attendance[existingIndex].createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Authoritative Cloud Firestore persistence before state confirmation
    await saveDocumentWithId(COLLECTIONS.ATTENDANCE, newRecord.id, newRecord);

    setData((prev) => {
      const prevList = prev.attendance || [];
      const pIdx = prevList.findIndex((a) => {
        const aDate = a.date || (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '');
        const aEmpId = (a.employeeId || a.id || '').toString().trim().toUpperCase();
        const aName = (a.employeeName || '').toString().trim().toLowerCase();
        const empName = (emp.name || '').toString().trim().toLowerCase();
        return (a.id === newRecord.id) || (aDate === today && (aEmpId === canonicalEmpId || (aName && empName && aName === empName)));
      });
      let updatedAttendance;
      if (pIdx >= 0) {
        updatedAttendance = [...prevList];
        updatedAttendance[pIdx] = { ...prevList[pIdx], ...newRecord };
      } else {
        updatedAttendance = [newRecord, ...prevList];
      }
      return { ...prev, attendance: sanitizeAttendance(updatedAttendance) };
    });

    addAuditLog(`Punch In (${emp.name})`, 'Attendance', `In: ${actualPunchIn} (${newRecord.geofenceStatus})`);
    addNotification({
      title: 'Employee Punched In',
      desc: `${emp.name} (${emp.employeeId || emp.id}) clocked in at ${actualPunchIn} (${lateStatus ? `Late by ${lateMinutes}m` : 'On Time'}).`,
      type: lateStatus ? 'warning' : 'success',
      category: 'attendance',
    });

    return newRecord;
  };

  const resetTodayAttendance = async (employeeId) => {
    const today = new Date().toISOString().split('T')[0];
    const defaultId = user?.employeeId || user?.id || (user?.role === 'Plant Manager' ? 'PM-001' : (user?.role === 'Driver' ? 'DRV-001' : 'ADM-001'));
    const targetId = employeeId || defaultId;
    const cleanTargetId = targetId.toString().trim().toUpperCase();

    const matchingRecords = (data.attendance || []).filter((a) => {
      const aDate = a.date || (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '');
      const aEmpId = (a.employeeId || a.id || '').toString().trim().toUpperCase();
      return aDate === today && (aEmpId === cleanTargetId || a.id?.toUpperCase().includes(cleanTargetId));
    });

    if (matchingRecords.length > 0) {
      for (const rec of matchingRecords) {
        if (rec.id) {
          try {
            await removeDocument(COLLECTIONS.ATTENDANCE, rec.id);
          } catch (err) {
            console.error(`Error deleting attendance record ${rec.id}:`, err);
          }
        }
      }
      setData((prev) => {
        const nextAttendance = (prev.attendance || []).filter((a) => {
          const aDate = a.date || (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '');
          const aEmpId = (a.employeeId || a.id || '').toString().trim().toUpperCase();
          return !(aDate === today && (aEmpId === cleanTargetId || a.id?.toUpperCase().includes(cleanTargetId)));
        });
        try {
          const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
          const stored = JSON.parse(localStorage.getItem(key) || '{}');
          stored.attendance = nextAttendance;
          localStorage.setItem(key, JSON.stringify(stored));
        } catch (err) {
          console.error('Failed to update local storage on attendance reset:', err);
        }
        return {
          ...prev,
          attendance: sanitizeAttendance(nextAttendance),
        };
      });
      addAuditLog(`Reset Attendance (${targetId})`, 'Attendance', `Cleared today's attendance record for fresh live clock-in`);
      return true;
    }
    return false;
  };

  const checkOut = async (employeeId, options = {}) => {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = options.time ? formatToIndian12Hr(options.time) : getNowIndian12Hr(false);
    const defaultId = user?.employeeId || user?.id || (user?.role === 'Plant Manager' ? 'PM-001' : (user?.role === 'Driver' ? 'DRV-001' : 'ADM-001'));
    const targetId = employeeId || defaultId;
    
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

    if (data.attendance[recordIndex].punchOut && !options.allowOverride) {
      throw new Error(`Shift for ${emp.name || targetId} has already been concluded today at ${formatToIndian12Hr(data.attendance[recordIndex].punchOut)}.`);
    }

    const currentRecord = data.attendance[recordIndex];
    const inTotalMins = parseTimeToMinutes(currentRecord.punchIn);
    const outTotalMins = parseTimeToMinutes(nowTime);
    let totalMins = outTotalMins - inTotalMins;
    if (totalMins < 0) totalMins += 24 * 60; // night shift rollover

    const workingHours = Number((totalMins / 60).toFixed(1));
    const shift = data.shifts.find((s) => s.id === emp.shiftId) || data.shifts[0];
    const otThreshold = shift?.otThresholdHours || 8.5;
    const overtimeHours = workingHours > otThreshold ? Number((workingHours - otThreshold).toFixed(1)) : 0;

    const updatedRecord = {
      ...currentRecord,
      userId: currentRecord.userId || user?.uid || user?.id || null,
      companyId: currentRecord.companyId || activeCompanyId,
      punchOut: nowTime,
      workingHours,
      overtimeHours,
      exitGpsLocation: options.exitGpsLocation || options.gpsLocation || null,
      lastKnownLocation: options.exitGpsLocation || options.gpsLocation || currentRecord.gpsLocation || null,
      exitGeofenceStatus: options.geofenceStatus || (options.exitGpsLocation || options.gpsLocation ? 'Shift Concluded (GPS Verified)' : 'Shift Concluded'),
      remarks: options.remarks ? `${currentRecord.remarks} | Out: ${options.remarks}` : currentRecord.remarks,
      updatedAt: new Date().toISOString(),
    };

    // Authoritative Cloud Firestore persistence before state confirmation
    await saveDocumentWithId(COLLECTIONS.ATTENDANCE, updatedRecord.id, updatedRecord);

    setData((prev) => {
      const prevList = prev.attendance || [];
      const pIdx = prevList.findIndex((a) => a.id === updatedRecord.id || (a.date === today && (a.employeeId === emp.id || a.employeeId === emp.employeeId || a.employeeId === targetId)));
      let copy;
      if (pIdx >= 0) {
        copy = [...prevList];
        copy[pIdx] = updatedRecord;
      } else {
        copy = [updatedRecord, ...prevList];
      }
      return { ...prev, attendance: sanitizeAttendance(copy) };
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

  const addAttendanceRecord = async (attData) => {
    const emp = data.employees.find(
      (e) => e.id === attData.employeeId || e.employeeId === attData.employeeId
    ) || OFFICIAL_ROLE_ACCOUNTS.find(
      (r) => r.employeeId === attData.employeeId || r.id === attData.employeeId
    );

    const recordDate = attData.date || new Date().toISOString().split('T')[0];
    const targetEmpId = (attData.employeeId || '').toString().trim().toUpperCase();
    const canonicalEmpId = (emp?.employeeId || emp?.id || targetEmpId).toString().trim().toUpperCase();
    const docId = `ATT-${recordDate.replace(/-/g, '')}-${canonicalEmpId.replace(/[^A-Z0-9_-]/g, '')}`;

    const existingIndex = data.attendance.findIndex((a) => {
      const aDate = a.date || (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '');
      const aEmpId = (a.employeeId || a.id || '').toString().trim().toUpperCase();
      const aName = (a.employeeName || '').toString().trim().toLowerCase();
      const empName = (emp?.name || attData.employeeName || '').toString().trim().toLowerCase();
      return (a.id === docId) || (aDate === recordDate && (aEmpId === canonicalEmpId || (aName && empName && aName === empName)));
    });

    const recordId = existingIndex >= 0 ? (data.attendance[existingIndex].id || docId) : docId;

    const newRecord = {
      ...(existingIndex >= 0 ? data.attendance[existingIndex] : {}),
      id: recordId,
      date: recordDate,
      employeeId: attData.employeeId,
      userId: attData.userId || user?.uid || user?.id || null,
      companyId: activeCompanyId,
      employeeName: emp?.name || attData.employeeName || attData.employeeId,
      role: emp?.role || attData.role || 'Staff',
      plant: emp?.plant || attData.plant || (data.plants && data.plants[0]?.name) || 'Central Plant',
      punchIn: attData.punchIn ? formatToIndian12Hr(attData.punchIn) : (existingIndex >= 0 ? data.attendance[existingIndex].punchIn : null),
      punchOut: attData.punchOut ? formatToIndian12Hr(attData.punchOut) : (existingIndex >= 0 ? data.attendance[existingIndex].punchOut : null),
      workingHours: attData.workingHours !== undefined ? attData.workingHours : (existingIndex >= 0 ? data.attendance[existingIndex].workingHours : null),
      overtimeHours: attData.overtimeHours || 0,
      status: attData.status || (existingIndex >= 0 ? data.attendance[existingIndex].status : 'Present'),
      lateStatus: attData.lateStatus || false,
      lateMinutes: attData.lateMinutes || 0,
      remarks: attData.remarks || 'Admin Manual Entry',
      geofenceStatus: attData.geofenceStatus || 'Verified Inside Plant',
      gpsLocation: attData.gpsLocation || { lat: 18.5204, lng: 73.8567, address: 'Plant Dispatch Hub' },
      updatedAt: new Date().toISOString(),
    };

    await saveDocumentWithId(COLLECTIONS.ATTENDANCE, newRecord.id, newRecord);

    setData((prev) => {
      const prevList = prev.attendance || [];
      const pIdx = prevList.findIndex((a) => {
        const aDate = a.date || (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '');
        const aEmpId = (a.employeeId || a.id || '').toString().trim().toUpperCase();
        const aName = (a.employeeName || '').toString().trim().toLowerCase();
        const empName = (emp?.name || attData.employeeName || '').toString().trim().toLowerCase();
        return (a.id === newRecord.id) || (aDate === recordDate && (aEmpId === canonicalEmpId || (aName && empName && aName === empName)));
      });
      let updated;
      if (pIdx >= 0) {
        updated = [...prevList];
        updated[pIdx] = { ...prevList[pIdx], ...newRecord };
      } else {
        updated = [newRecord, ...prevList];
      }
      return { ...prev, attendance: sanitizeAttendance(updated) };
    });
    addAuditLog(`Attendance Saved (${newRecord.employeeName})`, 'Attendance', `${newRecord.date} | In: ${newRecord.punchIn || '--'} | Out: ${newRecord.punchOut || '--'}`);
    return newRecord;
  };

  const updateAttendanceRecord = async (id, fields) => {
    const sanitizedFields = { ...fields, updatedAt: new Date().toISOString() };
    if (sanitizedFields.punchIn) sanitizedFields.punchIn = formatToIndian12Hr(sanitizedFields.punchIn);
    if (sanitizedFields.punchOut) sanitizedFields.punchOut = formatToIndian12Hr(sanitizedFields.punchOut);
    await updateDocument(COLLECTIONS.ATTENDANCE, id, sanitizedFields);

    setData((prev) => ({
      ...prev,
      attendance: prev.attendance.map((a) => (a.id === id ? { ...a, ...sanitizedFields } : a)),
    }));
    addAuditLog(`Updated Attendance (${id})`, 'Attendance', `Record parameters updated`);
  };

  const deleteAttendanceRecord = async (id) => {
    try {
      await removeDocument(COLLECTIONS.ATTENDANCE, id);
    } catch (err) {
      console.error(`Error deleting attendance record ${id}:`, err);
    }

    setData((prev) => {
      const nextAttendance = prev.attendance.filter((a) => a.id !== id);
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.attendance = nextAttendance;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {
        console.error('Failed to update local storage on attendance delete:', err);
      }
      return {
        ...prev,
        attendance: nextAttendance,
      };
    });
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
  const submitDailyWork = async (workData) => {
    const emp = data.employees.find(
      (e) => e.id === workData.employeeId || 
             e.employeeId === workData.employeeId || 
             e.id?.toLowerCase() === workData.employeeId?.toLowerCase()
    );
    const targetDate = workData.date || new Date().toISOString().split('T')[0];
    const targetEmpId = (workData.employeeId || emp?.id || '').toString().trim().toUpperCase();
    const canonicalEmpId = (emp?.employeeId || emp?.id || targetEmpId).toString().trim().toUpperCase();
    const docId = `WRK-${targetDate.replace(/-/g, '')}-${canonicalEmpId.replace(/[^A-Z0-9_-]/g, '')}`;

    const existingIndex = (data.dailyWork || []).findIndex((w) => {
      const wDate = w.date;
      const wEmpId = (w.employeeId || '').toString().trim().toUpperCase();
      return (w.id === docId) || (wDate === targetDate && (wEmpId === canonicalEmpId || (emp && (wEmpId === (emp.employeeId || '').toUpperCase() || wEmpId === (emp.id || '').toUpperCase()))));
    });

    const newWork = {
      ...(existingIndex >= 0 ? data.dailyWork[existingIndex] : {}),
      id: existingIndex >= 0 ? (data.dailyWork[existingIndex].id || docId) : docId,
      employeeId: workData.employeeId,
      userId: user?.uid || user?.id || null,
      companyId: activeCompanyId,
      employeeName: emp?.name || workData.employeeName || workData.employeeId,
      date: targetDate,
      workDescription: workData.workDescription,
      department: emp?.department || workData.department || 'Operations',
      workType: workData.workType || 'Operational Duty',
      hoursWorked: Number(workData.hoursWorked) || 8,
      remarks: workData.remarks || '',
      status: workData.status || (existingIndex >= 0 ? data.dailyWork[existingIndex].status : 'Submitted'),
      supervisorRemarks: existingIndex >= 0 ? data.dailyWork[existingIndex].supervisorRemarks : null,
      reviewedBy: existingIndex >= 0 ? data.dailyWork[existingIndex].reviewedBy : null,
      createdAt: existingIndex >= 0 ? (data.dailyWork[existingIndex].createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveDocumentWithId(COLLECTIONS.DAILY_WORK, newWork.id, newWork);

    setData((prev) => {
      const prevList = prev.dailyWork || [];
      const pIdx = prevList.findIndex((w) => {
        const wDate = w.date;
        const wEmpId = (w.employeeId || '').toString().trim().toUpperCase();
        return (w.id === newWork.id) || (wDate === targetDate && (wEmpId === canonicalEmpId || (emp && (wEmpId === (emp.employeeId || '').toUpperCase() || wEmpId === (emp.id || '').toUpperCase()))));
      });
      let updated;
      if (pIdx >= 0) {
        updated = [...prevList];
        updated[pIdx] = { ...prevList[pIdx], ...newWork };
      } else {
        updated = [newWork, ...prevList];
      }
      return {
        ...prev,
        dailyWork: sanitizeDailyWork(updated),
      };
    });

    addAuditLog(`Submitted Daily Work Log`, 'Daily Work', `${emp?.name || newWork.employeeName} (${newWork.workType})`);
    addNotification({
      title: 'Daily Work Submitted',
      desc: `${emp?.name || newWork.employeeName} submitted daily log: "${newWork.workDescription.substring(0, 40)}..."`,
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

  const deleteDailyWork = async (id) => {
    try {
      await removeDocument(COLLECTIONS.DAILY_WORK, id);
    } catch (err) {
      console.error(`Error deleting daily work ${id}:`, err);
    }

    setData((prev) => {
      const nextWork = prev.dailyWork.filter((w) => w.id !== id);
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.dailyWork = nextWork;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {
        console.error('Failed to update local storage on daily work delete:', err);
      }
      return {
        ...prev,
        dailyWork: nextWork,
      };
    });
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

  const deleteLeave = async (id) => {
    try {
      await removeDocument(COLLECTIONS.LEAVES, id);
    } catch (err) {
      console.error(`Error deleting leave ${id}:`, err);
    }

    setData((prev) => {
      const nextLeaves = prev.leaves.filter((l) => l.id !== id);
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.leaves = nextLeaves;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {
        console.error('Failed to update local storage on leave delete:', err);
      }
      return {
        ...prev,
        leaves: nextLeaves,
      };
    });
    addAuditLog(`Deleted Leave (${id})`, 'Leave Management', `Record removed.`);
  };

  /* -------------------------------------------------------------
   * 6. ADVANCE MANAGEMENT
   * ------------------------------------------------------------- */
  const recordAdvance = (advData) => {
    const emp = data.employees.find((e) => e.id === advData.employeeId);
    const amount = Number(advData.advanceAmount);
    if (!amount || amount <= 0) throw new Error('Please enter a valid advance amount (greater than 0).');
    if (!advData.employeeId) throw new Error('Please select an employee.');

    const advDate = advData.date || advData.requestDate || new Date().toISOString().split('T')[0];
    const initialStatus = advData.status || 'Approved';
    const approvedAmt = initialStatus === 'Approved' ? amount : (advData.approvedAmount ? Number(advData.approvedAmount) : 0);
    const initialBalance = approvedAmt > 0 ? approvedAmt : amount;

    const newAdvance = {
      id: advData.id || `ADV-${Date.now()}`,
      employeeId: advData.employeeId,
      employeeName: emp?.name || advData.employeeName || advData.employeeId,
      role: emp?.role || advData.role || 'Staff',
      plant: emp?.plant || advData.plant || 'Main Plant Unit #01',
      advanceAmount: amount,
      approvedAmount: approvedAmt,
      recoveredAmount: Number(advData.recoveredAmount) || 0,
      balance: initialBalance,
      date: advDate,
      requestDate: advDate,
      reason: advData.reason || advData.description || 'Employee salary advance',
      monthlyDeduction: Number(advData.monthlyDeduction) > 0 ? Number(advData.monthlyDeduction) : initialBalance,
      status: initialStatus,
      repaymentHistory: Array.isArray(advData.repaymentHistory) ? advData.repaymentHistory : [],
      remarks: advData.remarks || `Advance recorded by ${user?.name || 'Authorized Staff'}`,
      reviewedBy: user?.name ? `${user.name} (${user.role})` : 'Authorized Staff',
    };

    saveDocumentWithId(COLLECTIONS.ADVANCES, newAdvance.id, newAdvance).catch((err) => {
      console.warn('Firestore advance record notice:', err.message);
    });

    setData((prev) => {
      const nextAdvances = [newAdvance, ...prev.advances];
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.advances = nextAdvances;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {
        console.error('Failed to update local storage on advance save:', err);
      }
      return {
        ...prev,
        advances: nextAdvances,
      };
    });

    addAuditLog(`Recorded Salary Advance`, 'Advance Management', `${newAdvance.employeeName} - ₹ ${amount.toLocaleString('en-IN')}`);
    addNotification({
      title: 'Salary Advance Recorded',
      desc: `Salary advance of ₹ ${amount.toLocaleString('en-IN')} recorded for ${newAdvance.employeeName}.`,
      type: 'info',
      category: 'advance',
    });

    return newAdvance;
  };

  const requestAdvance = (advData) => {
    // If called by an authorized user without status specified, record as Approved directly
    const isAuthUser = user?.role === 'Admin' || user?.role === 'Accountant' || user?.role === 'Plant Manager' || user?.role === 'Owner / Director';
    return recordAdvance({
      ...advData,
      status: advData.status || (isAuthUser ? 'Approved' : 'Pending'),
    });
  };

  const reviewAdvance = (id, status, approvedAmount = null, reviewerUser = null) => {
    const reviewerName = reviewerUser ? `${reviewerUser.name} (${reviewerUser.role})` : user?.name || 'Accountant';
    const targetAdv = data.advances.find((a) => a.id === id);
    const appAmt = status === 'Approved' ? (approvedAmount !== null ? Number(approvedAmount) : (targetAdv?.advanceAmount || 0)) : 0;

    const updatedFields = {
      status,
      approvedAmount: appAmt,
      balance: Math.max(0, appAmt - (Number(targetAdv?.recoveredAmount) || 0)),
      remarks: status === 'Approved' ? `Approved for payroll deduction by ${reviewerName}` : 'Rejected',
      reviewedBy: reviewerName,
    };

    updateDocument(COLLECTIONS.ADVANCES, id, updatedFields).catch(() => {});

    setData((prev) => {
      const nextAdvances = prev.advances.map((a) => (a.id === id ? { ...a, ...updatedFields } : a));
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.advances = nextAdvances;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {}
      return {
        ...prev,
        advances: nextAdvances,
      };
    });

    addAuditLog(`Reviewed Advance (${id})`, 'Advance Management', `Decision: ${status} (₹ ${appAmt}) by ${reviewerName}`);
    addNotification({
      title: `Advance Request ${status}`,
      desc: `Advance request of ${targetAdv?.employeeName} was ${status.toLowerCase()} for ₹ ${appAmt.toLocaleString('en-IN')}.`,
      type: status === 'Approved' ? 'success' : 'urgent',
      category: 'advance',
    });
  };

  const updateAdvance = (id, fields) => {
    const target = data.advances.find((a) => a.id === id);
    const totalAmt = fields.approvedAmount !== undefined ? Number(fields.approvedAmount) : (fields.advanceAmount !== undefined ? Number(fields.advanceAmount) : (target?.approvedAmount || target?.advanceAmount || 0));
    const recAmt = fields.recoveredAmount !== undefined ? Number(fields.recoveredAmount) : (target?.recoveredAmount || 0);
    const newBal = Math.max(0, totalAmt - recAmt);
    const newStatus = fields.status || (newBal === 0 && recAmt > 0 ? 'Fully Recovered' : (recAmt > 0 ? 'Partially Recovered' : (target?.status || 'Approved')));

    const finalFields = {
      ...fields,
      balance: newBal,
      status: newStatus,
    };

    updateDocument(COLLECTIONS.ADVANCES, id, finalFields).catch(() => {});

    setData((prev) => {
      const nextAdvances = prev.advances.map((a) => (a.id === id ? { ...a, ...finalFields } : a));
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.advances = nextAdvances;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {}
      return {
        ...prev,
        advances: nextAdvances,
      };
    });
    addAuditLog(`Updated Advance (${id})`, 'Advance Management', `Parameters updated.`);
  };

  const deleteAdvance = async (id) => {
    try {
      await removeDocument(COLLECTIONS.ADVANCES, id);
    } catch (err) {
      console.error(`Error deleting advance ${id}:`, err);
    }

    setData((prev) => {
      const nextAdvances = prev.advances.filter((a) => a.id !== id);
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.advances = nextAdvances;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {
        console.error('Failed to update local storage on advance delete:', err);
      }
      return {
        ...prev,
        advances: nextAdvances,
      };
    });
    addAuditLog(`Deleted Advance (${id})`, 'Advance Management', `Record removed.`);
  };

  /* -------------------------------------------------------------
   * 7. LOAN MANAGEMENT
   * ------------------------------------------------------------- */
  const recordLoan = (loanData) => {
    const emp = data.employees.find((e) => e.id === loanData.employeeId);
    const loanAmount = Number(loanData.loanAmount);
    if (!loanAmount || loanAmount <= 0) throw new Error('Please enter a valid loan amount (greater than 0).');
    if (!loanData.employeeId) throw new Error('Please select an employee.');

    let emiAmount = Number(loanData.monthlyEmi || loanData.emiAmount);
    let totalEmis = Number(loanData.totalEmis);

    if (emiAmount > 0) {
      totalEmis = totalEmis || Math.max(1, Math.ceil(loanAmount / emiAmount));
    } else if (totalEmis > 0) {
      emiAmount = Math.round(loanAmount / totalEmis);
    } else {
      totalEmis = 10;
      emiAmount = Math.round(loanAmount / 10);
    }

    // EMI must not exceed total loan amount
    emiAmount = Math.min(loanAmount, emiAmount);

    const startDate = loanData.startDate || loanData.loanDate || new Date().toISOString().split('T')[0];
    const initialStatus = loanData.status || 'Active';

    const newLoan = {
      id: loanData.id || `LON-${Date.now()}`,
      employeeId: loanData.employeeId,
      employeeName: emp?.name || loanData.employeeName || loanData.employeeId,
      role: emp?.role || loanData.role || 'Staff',
      plant: emp?.plant || loanData.plant || 'Main Plant Unit #01',
      loanAmount,
      emiAmount,
      totalEmis,
      paidEmis: Number(loanData.paidEmis) || 0,
      remainingEmis: Number(loanData.remainingEmis) ?? totalEmis,
      amountRepaid: Number(loanData.amountRepaid) || 0,
      outstandingBalance: Number(loanData.outstandingBalance) ?? loanAmount,
      startDate,
      loanDate: startDate,
      reason: loanData.reason || loanData.description || 'Employee company loan assistance',
      status: initialStatus,
      repaymentHistory: Array.isArray(loanData.repaymentHistory) ? loanData.repaymentHistory : [],
      approvedBy: user?.name ? `${user.name} (${user.role})` : 'Authorized Staff',
    };

    saveDocumentWithId(COLLECTIONS.LOANS, newLoan.id, newLoan).catch((err) => {
      console.warn('Firestore loan record notice:', err.message);
    });

    setData((prev) => {
      const nextLoans = [newLoan, ...prev.loans];
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.loans = nextLoans;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {
        console.error('Failed to update local storage on loan save:', err);
      }
      return {
        ...prev,
        loans: nextLoans,
      };
    });

    addAuditLog(`Recorded Company Loan`, 'Loan Management', `${newLoan.employeeName} - ₹ ${loanAmount.toLocaleString('en-IN')}`);
    addNotification({
      title: 'Employee Loan Recorded',
      desc: `Company loan of ₹ ${loanAmount.toLocaleString('en-IN')} assigned to ${newLoan.employeeName} (EMI: ₹ ${emiAmount.toLocaleString('en-IN')}/mo).`,
      type: 'info',
      category: 'loan',
    });

    return newLoan;
  };

  const requestLoan = (loanData) => {
    const isAuthUser = user?.role === 'Admin' || user?.role === 'Accountant' || user?.role === 'Plant Manager' || user?.role === 'Owner / Director';
    return recordLoan({
      ...loanData,
      status: loanData.status || (isAuthUser ? 'Active' : 'Pending'),
    });
  };

  const reviewLoan = (id, status, reviewerUser = null) => {
    const reviewerName = reviewerUser ? `${reviewerUser.name} (${reviewerUser.role})` : user?.name || 'Director';
    const newStatus = status === 'Approved' ? 'Active' : 'Rejected';

    updateDocument(COLLECTIONS.LOANS, id, { status: newStatus, approvedBy: reviewerName }).catch(() => {});

    setData((prev) => {
      const nextLoans = prev.loans.map((l) => (l.id === id ? { ...l, status: newStatus, approvedBy: reviewerName } : l));
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.loans = nextLoans;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {}
      return {
        ...prev,
        loans: nextLoans,
      };
    });

    addAuditLog(`Reviewed Employee Loan (${id})`, 'Loan Management', `Status set to ${status} by ${reviewerName}`);
  };

  const updateLoan = (id, fields) => {
    const target = data.loans.find((l) => l.id === id);
    const loanAmt = fields.loanAmount !== undefined ? Number(fields.loanAmount) : (target?.loanAmount || 0);
    const emiAmt = fields.emiAmount !== undefined ? Number(fields.emiAmount) : (target?.emiAmount || 0);
    const totalEmis = fields.totalEmis !== undefined ? Number(fields.totalEmis) : (target?.totalEmis || 1);
    const paidEmis = fields.paidEmis !== undefined ? Number(fields.paidEmis) : (target?.paidEmis || 0);
    const amountRepaid = fields.amountRepaid !== undefined ? Number(fields.amountRepaid) : (paidEmis * emiAmt);
    const outBal = Math.max(0, loanAmt - amountRepaid);
    const remEmis = Math.max(0, totalEmis - paidEmis);
    const newStatus = fields.status || (outBal === 0 ? 'Closed' : 'Active');

    const finalFields = {
      ...fields,
      loanAmount: loanAmt,
      emiAmount: emiAmt,
      totalEmis,
      paidEmis,
      remainingEmis: remEmis,
      amountRepaid,
      outstandingBalance: outBal,
      status: newStatus,
    };

    updateDocument(COLLECTIONS.LOANS, id, finalFields).catch(() => {});

    setData((prev) => {
      const nextLoans = prev.loans.map((l) => (l.id === id ? { ...l, ...finalFields } : l));
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.loans = nextLoans;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {}
      return {
        ...prev,
        loans: nextLoans,
      };
    });
    addAuditLog(`Updated Loan (${id})`, 'Loan Management', `Parameters updated.`);
  };

  const deleteLoan = async (id) => {
    try {
      await removeDocument(COLLECTIONS.LOANS, id);
    } catch (err) {
      console.error(`Error deleting loan ${id}:`, err);
    }

    setData((prev) => {
      const nextLoans = prev.loans.filter((l) => l.id !== id);
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.loans = nextLoans;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {
        console.error('Failed to update local storage on loan delete:', err);
      }
      return {
        ...prev,
        loans: nextLoans,
      };
    });
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

        // 1. Fetch employee's outstanding advance balance & scheduled deduction
        const empAdvances = (data.advances || []).filter(
          (a) => a.employeeId === emp.id &&
                 (a.status === 'Approved' || a.status === 'Partially Recovered' || a.status === 'Active') &&
                 Number(a.balance) > 0
        );
        let scheduledAdvanceDeduction = 0;
        empAdvances.forEach((adv) => {
          const bal = Number(adv.balance) || 0;
          const monthlyDed = Number(adv.monthlyDeduction) > 0 ? Number(adv.monthlyDeduction) : bal;
          scheduledAdvanceDeduction += Math.min(bal, monthlyDed);
        });

        // 2. Fetch employee's scheduled monthly loan EMI
        const empLoans = (data.loans || []).filter(
          (l) => l.employeeId === emp.id &&
                 (l.status === 'Active' || l.status === 'Approved') &&
                 Number(l.outstandingBalance) > 0
        );
        let scheduledLoanEmi = 0;
        empLoans.forEach((loan) => {
          const outBal = Number(loan.outstandingBalance) || 0;
          const emi = Number(loan.emiAmount) || 0;
          scheduledLoanEmi += Math.min(outBal, emi);
        });

        // 3. Gross Earnings and Available Salary
        const allowances = 0;
        const otherDeductions = 0;
        const grossSalary = earnedBasic + otAmount + allowances;
        const availableSalary = Math.max(0, grossSalary - otherDeductions);
        const totalDesiredDeductions = scheduledAdvanceDeduction + scheduledLoanEmi;

        let advanceDeduction = scheduledAdvanceDeduction;
        let loanEmi = scheduledLoanEmi;
        let insufficientSalary = false;
        let insufficientSalaryWarning = '';

        // Safeguard: Check if salary is insufficient to cover advance & loan deductions
        if (totalDesiredDeductions > availableSalary) {
          insufficientSalary = true;
          insufficientSalaryWarning = `Employee gross earnings (₹ ${grossSalary.toLocaleString('en-IN')}) are insufficient for full deductions (Advance: ₹ ${scheduledAdvanceDeduction.toLocaleString('en-IN')}, Loan EMI: ₹ ${scheduledLoanEmi.toLocaleString('en-IN')}). Deductions capped to prevent negative salary.`;
          if (availableSalary <= 0) {
            advanceDeduction = 0;
            loanEmi = 0;
          } else {
            advanceDeduction = Math.min(scheduledAdvanceDeduction, availableSalary);
            loanEmi = Math.min(scheduledLoanEmi, Math.max(0, availableSalary - advanceDeduction));
          }
        }

        // 4. Formula: Total Deduction = Advance Deduction + Loan EMI
        // Net Salary = Gross Salary - Total Deduction - Other Existing Deductions
        const totalDeductions = advanceDeduction + loanEmi + otherDeductions;
        const netPayable = Math.max(0, grossSalary - totalDeductions);

        // Check if an existing record for this month already exists to preserve approved status/id
        const existingRecord = (data.payrollRecords || []).find(
          (p) => p.monthYear === monthYear && p.employeeId === emp.id
        );

        return {
          id: existingRecord?.id || `PAY-${monthYear.replace(/\s+/g, '')}-${emp.id}`,
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
          totalDeductions,
          earnedBasic,
          grossSalary,
          netPayable,
          insufficientSalary,
          insufficientSalaryWarning,
          deductionsApplied: existingRecord?.deductionsApplied || false,
          status: existingRecord?.status || 'Calculated',
          approvedBy: existingRecord?.approvedBy || null,
          approvedAt: existingRecord?.approvedAt || null,
        };
      });

    setData((prev) => {
      const otherMonthRecords = (prev.payrollRecords || []).filter((p) => p.monthYear !== monthYear);
      const nextPayroll = [...computedRecords, ...otherMonthRecords];
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.payrollRecords = nextPayroll;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {}
      return {
        ...prev,
        payrollRecords: nextPayroll,
      };
    });

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
      totalDeductions,
      earnedBasic,
      grossSalary,
      netPayable,
      insufficientSalary: totalDeductions > grossSalary,
      deductionsApplied: recordData.deductionsApplied || false,
      status: recordData.status || 'Calculated',
      approvedBy: recordData.approvedBy || null,
      approvedAt: recordData.approvedAt || null,
      remarks: recordData.remarks || '',
    };

    saveDocumentWithId(COLLECTIONS.PAYROLL, newRecord.id, newRecord).catch(() => {});

    setData((prev) => {
      const nextPayroll = [newRecord, ...prev.payrollRecords.filter((p) => p.id !== newRecord.id)];
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.payrollRecords = nextPayroll;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {}
      return {
        ...prev,
        payrollRecords: nextPayroll,
      };
    });

    addAuditLog(`Added Payroll Record`, 'Payroll Preparation', `Record for ${newRecord.employeeName} (${newRecord.monthYear})`);
    return newRecord;
  };

  const updatePayrollRecord = (id, fields) => {
    setData((prev) => {
      const nextPayroll = prev.payrollRecords.map((p) => {
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

        const updated = {
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
          totalDeductions,
          earnedBasic,
          grossSalary,
          netPayable,
          insufficientSalary: totalDeductions > grossSalary,
        };

        updateDocument(COLLECTIONS.PAYROLL, id, updated).catch(() => {});
        return updated;
      });

      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.payrollRecords = nextPayroll;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {}

      return {
        ...prev,
        payrollRecords: nextPayroll,
      };
    });

    addAuditLog(`Updated Payroll Record (${id})`, 'Payroll Preparation', `Record parameters updated`);
  };

  const deletePayrollRecord = async (id) => {
    try {
      await removeDocument(COLLECTIONS.PAYROLL, id);
    } catch (err) {
      console.warn(`Firestore payroll record delete notice:`, err.message);
    }

    setData((prev) => {
      const targetRecord = prev.payrollRecords.find((p) => p.id === id);
      let updatedAdvances = [...prev.advances];
      let updatedLoans = [...prev.loans];

      // If the deleted record had deductions already applied, reverse them safely!
      if (targetRecord && targetRecord.deductionsApplied) {
        if (targetRecord.advanceDeduction > 0) {
          updatedAdvances = updatedAdvances.map((adv) => {
            if (adv.employeeId === targetRecord.employeeId) {
              const histEntry = (adv.repaymentHistory || []).find((h) => h.payrollId === id || h.monthYear === targetRecord.monthYear);
              if (histEntry) {
                const restoredAmt = Number(histEntry.amount) || 0;
                const newRec = Math.max(0, (Number(adv.recoveredAmount) || 0) - restoredAmt);
                const newBal = (Number(adv.balance) || 0) + restoredAmt;
                const newHist = (adv.repaymentHistory || []).filter((h) => h !== histEntry);
                const updatedAdv = {
                  ...adv,
                  recoveredAmount: newRec,
                  balance: newBal,
                  status: newRec === 0 ? 'Approved' : 'Partially Recovered',
                  repaymentHistory: newHist,
                };
                updateDocument(COLLECTIONS.ADVANCES, adv.id, updatedAdv).catch(() => {});
                return updatedAdv;
              }
            }
            return adv;
          });
        }

        if (targetRecord.loanEmi > 0) {
          updatedLoans = updatedLoans.map((l) => {
            if (l.employeeId === targetRecord.employeeId) {
              const histEntry = (l.repaymentHistory || []).find((h) => h.payrollId === id || h.monthYear === targetRecord.monthYear);
              if (histEntry) {
                const restoredAmt = Number(histEntry.amount) || 0;
                const newRepaid = Math.max(0, (Number(l.amountRepaid) || 0) - restoredAmt);
                const newPaidEmis = Math.max(0, (Number(l.paidEmis) || 1) - 1);
                const newRemaining = Math.min(Number(l.totalEmis) || 1, (Number(l.remainingEmis) || 0) + 1);
                const newBal = (Number(l.outstandingBalance) || 0) + restoredAmt;
                const newHist = (l.repaymentHistory || []).filter((h) => h !== histEntry);
                const updatedLoan = {
                  ...l,
                  amountRepaid: newRepaid,
                  paidEmis: newPaidEmis,
                  remainingEmis: newRemaining,
                  outstandingBalance: newBal,
                  status: 'Active',
                  repaymentHistory: newHist,
                };
                updateDocument(COLLECTIONS.LOANS, l.id, updatedLoan).catch(() => {});
                return updatedLoan;
              }
            }
            return l;
          });
        }
      }

      const nextPayroll = prev.payrollRecords.filter((p) => p.id !== id);
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.payrollRecords = nextPayroll;
        stored.advances = updatedAdvances;
        stored.loans = updatedLoans;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {
        console.error('Failed to update local storage on payroll delete:', err);
      }
      return {
        ...prev,
        payrollRecords: nextPayroll,
        advances: updatedAdvances,
        loans: updatedLoans,
      };
    });
    addAuditLog(`Deleted Payroll Record (${id})`, 'Payroll Preparation', `Record removed.`);
  };

  const approvePayroll = (monthYear, approverUser = null) => {
    const approverName = approverUser ? `${approverUser.name} (${approverUser.role})` : user?.name || 'Accountant';

    setData((prev) => {
      let updatedAdvances = [...prev.advances];
      let updatedLoans = [...prev.loans];

      // Mark payroll approved and apply deductions strictly only to unapplied records
      const updatedPayroll = prev.payrollRecords.map((p) => {
        if (p.monthYear !== monthYear) return p;

        // Prevent duplicate repayments if the same payroll is processed again
        if (p.deductionsApplied) {
          return {
            ...p,
            status: 'Approved',
            approvedBy: approverName,
            approvedAt: p.approvedAt || new Date().toISOString(),
          };
        }

        // Apply advance deduction to employee's active advances
        if (Number(p.advanceDeduction) > 0) {
          let remDeduct = Number(p.advanceDeduction);
          updatedAdvances = updatedAdvances.map((adv) => {
            if (adv.employeeId === p.employeeId && Number(adv.balance) > 0 && remDeduct > 0) {
              const deductThis = Math.min(Number(adv.balance), remDeduct);
              remDeduct -= deductThis;
              const newRecovered = (Number(adv.recoveredAmount) || 0) + deductThis;
              const newBalance = Math.max(0, (Number(adv.balance) || 0) - deductThis);
              const historyEntry = {
                id: `REPAY-ADV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                date: new Date().toISOString().split('T')[0],
                payrollId: p.id,
                monthYear,
                amount: deductThis,
                balanceAfter: newBalance,
                type: 'Payroll Deduction',
                notes: `Advance deduction for ${monthYear}`,
              };
              const updatedAdv = {
                ...adv,
                recoveredAmount: newRecovered,
                balance: newBalance,
                status: newBalance === 0 ? 'Fully Recovered' : 'Partially Recovered',
                repaymentHistory: [historyEntry, ...(adv.repaymentHistory || [])],
              };
              updateDocument(COLLECTIONS.ADVANCES, adv.id, updatedAdv).catch(() => {});
              return updatedAdv;
            }
            return adv;
          });
        }

        // Apply loan EMI to employee's active loans
        if (Number(p.loanEmi) > 0) {
          let remEmiDeduct = Number(p.loanEmi);
          updatedLoans = updatedLoans.map((l) => {
            if (l.employeeId === p.employeeId && (l.status === 'Active' || l.status === 'Approved') && Number(l.outstandingBalance) > 0 && remEmiDeduct > 0) {
              const deductThis = Math.min(Number(l.outstandingBalance), remEmiDeduct);
              remEmiDeduct -= deductThis;
              const newPaid = (Number(l.paidEmis) || 0) + 1;
              const newRemaining = Math.max(0, (Number(l.totalEmis) || 1) - newPaid);
              const newAmountRepaid = (Number(l.amountRepaid) || 0) + deductThis;
              const newBalance = Math.max(0, (Number(l.outstandingBalance) || 0) - deductThis);
              const historyEntry = {
                id: `REPAY-LON-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                date: new Date().toISOString().split('T')[0],
                payrollId: p.id,
                monthYear,
                amount: deductThis,
                balanceAfter: newBalance,
                emiNumber: newPaid,
                type: 'Payroll EMI',
                notes: `EMI #${newPaid} deducted via payroll for ${monthYear}`,
              };
              const updatedLoan = {
                ...l,
                paidEmis: newPaid,
                remainingEmis: newRemaining,
                amountRepaid: newAmountRepaid,
                outstandingBalance: newBalance,
                status: newBalance === 0 ? 'Closed' : 'Active',
                repaymentHistory: [historyEntry, ...(l.repaymentHistory || [])],
              };
              updateDocument(COLLECTIONS.LOANS, l.id, updatedLoan).catch(() => {});
              return updatedLoan;
            }
            return l;
          });
        }

        const approvedRecord = {
          ...p,
          status: 'Approved',
          deductionsApplied: true,
          approvedBy: approverName,
          approvedAt: new Date().toISOString(),
        };

        saveDocumentWithId(COLLECTIONS.PAYROLL, p.id, approvedRecord).catch(() => {});
        return approvedRecord;
      });

      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.payrollRecords = updatedPayroll;
        stored.advances = updatedAdvances;
        stored.loans = updatedLoans;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {}

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
      desc: `Consolidated payroll for ${monthYear} was approved by ${approverName}. Ledger deductions and repayments recorded.`,
      type: 'success',
      category: 'payroll',
    });
  };

  const reversePayroll = (monthYear, reverserUser = null) => {
    const reverserName = reverserUser ? `${reverserUser.name} (${reverserUser.role})` : user?.name || 'Accountant';

    setData((prev) => {
      let updatedAdvances = [...prev.advances];
      let updatedLoans = [...prev.loans];

      // Revert advance and loan deductions for records of this monthYear
      const updatedPayroll = prev.payrollRecords.map((p) => {
        if (p.monthYear !== monthYear) return p;

        if (p.deductionsApplied) {
          // Revert advance deduction
          if (Number(p.advanceDeduction) > 0) {
            updatedAdvances = updatedAdvances.map((adv) => {
              if (adv.employeeId === p.employeeId) {
                const histEntry = (adv.repaymentHistory || []).find((h) => h.payrollId === p.id || h.monthYear === monthYear);
                if (histEntry) {
                  const restoredAmt = Number(histEntry.amount) || 0;
                  const newRec = Math.max(0, (Number(adv.recoveredAmount) || 0) - restoredAmt);
                  const newBal = (Number(adv.balance) || 0) + restoredAmt;
                  const newHist = (adv.repaymentHistory || []).filter((h) => h !== histEntry);
                  const updatedAdv = {
                    ...adv,
                    recoveredAmount: newRec,
                    balance: newBal,
                    status: newRec === 0 ? 'Approved' : 'Partially Recovered',
                    repaymentHistory: newHist,
                  };
                  updateDocument(COLLECTIONS.ADVANCES, adv.id, updatedAdv).catch(() => {});
                  return updatedAdv;
                }
              }
              return adv;
            });
          }

          // Revert loan deduction
          if (Number(p.loanEmi) > 0) {
            updatedLoans = updatedLoans.map((l) => {
              if (l.employeeId === p.employeeId) {
                const histEntry = (l.repaymentHistory || []).find((h) => h.payrollId === p.id || h.monthYear === monthYear);
                if (histEntry) {
                  const restoredAmt = Number(histEntry.amount) || 0;
                  const newRepaid = Math.max(0, (Number(l.amountRepaid) || 0) - restoredAmt);
                  const newPaidEmis = Math.max(0, (Number(l.paidEmis) || 1) - 1);
                  const newRemaining = Math.min(Number(l.totalEmis) || 1, (Number(l.remainingEmis) || 0) + 1);
                  const newBal = (Number(l.outstandingBalance) || 0) + restoredAmt;
                  const newHist = (l.repaymentHistory || []).filter((h) => h !== histEntry);
                  const updatedLoan = {
                    ...l,
                    amountRepaid: newRepaid,
                    paidEmis: newPaidEmis,
                    remainingEmis: newRemaining,
                    outstandingBalance: newBal,
                    status: 'Active',
                    repaymentHistory: newHist,
                  };
                  updateDocument(COLLECTIONS.LOANS, l.id, updatedLoan).catch(() => {});
                  return updatedLoan;
                }
              }
              return l;
            });
          }
        }

        const reversedRecord = {
          ...p,
          status: 'Calculated',
          deductionsApplied: false,
          approvedBy: null,
          approvedAt: null,
        };
        updateDocument(COLLECTIONS.PAYROLL, p.id, reversedRecord).catch(() => {});
        return reversedRecord;
      });

      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.payrollRecords = updatedPayroll;
        stored.advances = updatedAdvances;
        stored.loans = updatedLoans;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {}

      return {
        ...prev,
        payrollRecords: updatedPayroll,
        advances: updatedAdvances,
        loans: updatedLoans,
      };
    });

    addAuditLog(`Reversed Consolidated Payroll`, 'Payroll Preparation', `${monthYear} unlocked and deductions rolled back by ${reverserName}`);
    addNotification({
      title: 'Payroll Reversed & Unlocked',
      desc: `Payroll for ${monthYear} was unlocked by ${reverserName}. Deductions and repayment balances restored.`,
      type: 'warning',
      category: 'payroll',
    });
  };

  /* -------------------------------------------------------------
   * 9. UNIVERSAL APPROVALS HUB
   * ------------------------------------------------------------- */
  const pendingApprovals = useMemo(() => {
    const map = new Map();

    const addItem = (item, dedupeKey) => {
      if (!map.has(dedupeKey)) {
        map.set(dedupeKey, item);
      } else {
        const existing = map.get(dedupeKey);
        map.set(dedupeKey, { ...existing, ...item });
      }
    };

    // Leaves
    (data.leaves || [])
      .filter((l) => l.status === 'Pending')
      .forEach((l) => {
        const empId = (l.employeeId || '').toString().trim().toUpperCase();
        const key = l.id || `leave_${empId}_${l.fromDate}_${l.toDate}`;
        addItem({
          id: l.id,
          type: 'Leave Application',
          requester: l.employeeName,
          employeeId: l.employeeId,
          date: l.appliedDate,
          details: `${l.leaveType} (${l.days} Days: ${l.fromDate} to ${l.toDate}) - ${l.reason}`,
          status: 'Pending',
          category: 'leave',
        }, key);
      });

    // Advances
    (data.advances || [])
      .filter((a) => a.status === 'Pending')
      .forEach((a) => {
        const empId = (a.employeeId || '').toString().trim().toUpperCase();
        const aDate = a.requestDate || a.date;
        const key = a.id || `advance_${empId}_${aDate}_${a.advanceAmount}`;
        addItem({
          id: a.id,
          type: 'Salary Advance',
          requester: a.employeeName,
          employeeId: a.employeeId,
          date: aDate,
          details: `Requested: ₹ ${Number(a.advanceAmount).toLocaleString('en-IN')} - ${a.reason}`,
          status: 'Pending',
          category: 'advance',
        }, key);
      });

    // Daily Work
    (data.dailyWork || [])
      .filter((w) => w.status === 'Submitted')
      .forEach((w) => {
        const empId = (w.employeeId || '').toString().trim().toUpperCase();
        const key = `work_${empId}_${w.date}`;
        addItem({
          id: w.id,
          type: 'Daily Work Log',
          requester: w.employeeName,
          employeeId: w.employeeId,
          date: w.date,
          details: `${w.workType} (${w.hoursWorked} hrs) - ${w.workDescription}`,
          status: 'Pending',
          category: 'work',
        }, key);
      });

    // Loans
    (data.loans || [])
      .filter((l) => l.status === 'Pending')
      .forEach((l) => {
        const empId = (l.employeeId || '').toString().trim().toUpperCase();
        const key = l.id || `loan_${empId}_${l.loanDate}_${l.loanAmount}`;
        addItem({
          id: l.id,
          type: 'Company Loan',
          requester: l.employeeName,
          employeeId: l.employeeId,
          date: l.loanDate,
          details: `Loan: ₹ ${Number(l.loanAmount).toLocaleString('en-IN')} (${l.totalEmis} EMIs of ₹ ${Number(l.emiAmount).toLocaleString('en-IN')}) - ${l.reason}`,
          status: 'Pending',
          category: 'loan',
        }, key);
      });

    // Employee Registrations awaiting Admin verification
    (data.employees || [])
      .filter((e) => e.status === EMPLOYEE_STATUS.PENDING_APPROVAL)
      .forEach((e) => {
        const empKey = (e.employeeId || e.id || e.email || e.mobile || e.name || '').toString().trim().toUpperCase();
        const key = `registration_${empKey}`;
        addItem({
          id: e.id,
          type: 'Employee Verification',
          requester: e.name,
          employeeId: e.id,
          date: e.registeredAt ? e.registeredAt.split('T')[0] : new Date().toISOString().split('T')[0],
          details: `Role: ${e.role} | Plant: ${e.plant || 'Unassigned'} | Mobile: ${e.mobile || e.registeredMobile} | Email: ${e.email || e.registeredEmail}`,
          status: 'Pending Approval',
          category: 'registration',
          employee: e,
        }, key);
      });

    return Array.from(map.values());
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
  const addDocument = async (docData) => {
    const emp = (data.employees || []).find((e) => e.id === docData.employeeId);
    const newDoc = {
      id: docData.id || `DOC-${Date.now()}`,
      employeeId: docData.employeeId,
      employeeName: emp?.name || docData.employeeName || 'Staff Member',
      documentType: docData.documentType,
      documentNumber: docData.documentNumber || 'N/A',
      uploadDate: new Date().toISOString().split('T')[0],
      expiryDate: docData.expiryDate || null,
      status: docData.status || 'Available',
      fileSize: docData.fileSize || 'Unknown Size',
      storagePath: docData.storagePath || null,
      downloadUrl: docData.downloadUrl || null,
      originalFileName: docData.originalFileName || null,
    };

    try {
      await saveDocumentWithId(COLLECTIONS.DOCUMENTS, newDoc.id, newDoc);
    } catch (err) {
      console.error('Firestore document metadata write failed:', err);
      throw new Error(`Failed to save document metadata in database: ${err.message}`);
    }

    setData((prev) => ({
      ...prev,
      documents: [newDoc, ...prev.documents],
    }));
    addAuditLog(`Uploaded Employee Document`, 'Employee Documents', `${emp?.name || docData.employeeId}: ${newDoc.documentType}`);
    return newDoc;
  };

  const deleteDocument = async (id) => {
    const targetDoc = (data.documents || []).find((d) => d.id === id);
    if (!targetDoc) {
      throw new Error(`Document record "${id}" was not found.`);
    }

    // Role check: Only Admin, Director, or HR Manager/Executive can delete confidential personnel documents
    const currentUserRole = user?.role || '';
    const isAuthorized = 
      currentUserRole === 'Admin' ||
      currentUserRole === 'Owner / Director' ||
      currentUserRole === 'HR Manager' ||
      currentUserRole === 'HR Executive' ||
      user?.email === 'smconcretech@gmail.com';

    if (!isAuthorized) {
      throw new Error('Permission denied. Only Administrators and HR personnel are authorized to delete employee documents.');
    }

    // 1. Delete binary from Firebase Cloud Storage
    if (targetDoc.storagePath) {
      try {
        await deleteEmployeeDocumentFile(targetDoc.storagePath);
      } catch (storageErr) {
        if (storageErr.code === 'storage/unauthorized') {
          throw new Error('Permission denied by Cloud Storage. You are not authorized to delete this file.');
        }
        throw new Error(`Cloud Storage file deletion failed: ${storageErr.message}`);
      }
    }

    // 2. Delete metadata record from Firestore
    try {
      await removeDocument(COLLECTIONS.DOCUMENTS, id);
    } catch (firestoreErr) {
      throw new Error(`Database record deletion failed: ${firestoreErr.message}`);
    }

    // 3. Update local state ONLY after backend operations succeed
    setData((prev) => {
      const nextDocs = prev.documents.filter((d) => d.id !== id);
      try {
        const key = `${STORAGE_WORKFORCE_KEY}_${activeCompanyId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        stored.documents = nextDocs;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {
        console.error('Failed to update local storage on document delete:', err);
      }
      return {
        ...prev,
        documents: nextDocs,
      };
    });

    // 4. Record audit log on verified success
    addAuditLog(`Deleted Document (${id})`, 'Employee Documents', `Record "${targetDoc.documentType}" (${targetDoc.employeeName || targetDoc.employeeId}) removed.`);

    return { success: true };
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
    updateCompany,
    updateCompanyLogo,
    removeCompany,
    employees: sanitizeEmployees(data.employees),
    shifts: data.shifts,
    plants: data.plants || MOCK_PLANTS,
    attendance: sanitizeAttendance(data.attendance),
    dailyWork: sanitizeDailyWork(data.dailyWork),
    leaves: sanitizeLeaves(data.leaves),
    advances: sanitizeAdvances(data.advances),
    loans: sanitizeLoans(data.loans),
    payrollRecords: data.payrollRecords,
    documents: data.documents,
    auditLogs: data.auditLogs,
    hrSettings: data.hrSettings,
    notifications: data.notifications,
    trips: data.trips || [],
    orders: data.orders || [],
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

    // Concrete Orders & Plant Scheduling
    createOrder,
    updateOrder,
    cancelOrder,

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
    resetTodayAttendance,
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
    recordAdvance,
    requestAdvance,
    updateAdvance,
    deleteAdvance,
    reviewAdvance,

    // Loan Actions
    recordLoan,
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
    reversePayroll,

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
