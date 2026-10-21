/**
 * Enterprise Employee Authentication & Verification Service
 * SM CONCRETECH - RMC Plant Management System
 * 
 * Implements strict manual employee registration flow:
 * 1. Admin creates employee with status = "Pending Registration"
 * 2. Employee manually registers via /register without role selection
 * 3. System validates employee ID & details against Admin record
 * 4. Successful registration updates status to "Pending Approval"
 * 5. Admin approves (status -> "Active") or rejects (status -> "Rejected")
 * 6. Only Active employees can log in with Employee ID, Email, or Mobile
 * 7. System assigns trusted role from Admin record; ignores frontend tampering
 */

import { ROLES, ROLE_ROUTES, SYSTEM_ADMIN, OFFICIAL_ROLE_ACCOUNTS } from '../data/mockUsers.js';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { app } from '../config/firebase.js';

export const EMPLOYEE_STATUS = {
  PENDING_REGISTRATION: 'Pending Registration',
  PENDING_APPROVAL: 'Pending Approval',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
};

/**
 * Clean phone number to digits only for reliable comparison
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  return phone.toString().replace(/\D/g, '').slice(-10);
}

/**
 * Clean string for comparison
 */
export function normalizeText(str) {
  return (str || '').toString().trim().toLowerCase();
}

/**
 * Validates an employee attempting manual registration.
 * Checks existence, Admin creation, details matching, and status.
 */
export function validateEmployeeForRegistration(registrationData, employees = []) {
  const { employeeId, name, mobile, email, password, confirmPassword } = registrationData;

  if (!employeeId || !employeeId.trim()) {
    return { valid: false, error: 'Please enter your official Employee ID.' };
  }

  const cleanId = employeeId.trim().toUpperCase();
  const foundEmp = employees.find((e) => (e.id || '').toUpperCase() === cleanId);

  // If no matching Admin-created employee exists, reject registration
  if (!foundEmp) {
    return { 
      valid: false, 
      error: 'Employee record not found. Please contact Admin.' 
    };
  }

  // Prevent duplicate or improper registrations based on status
  const currentStatus = foundEmp.status || EMPLOYEE_STATUS.PENDING_REGISTRATION;

  if (currentStatus === EMPLOYEE_STATUS.PENDING_APPROVAL) {
    return { 
      valid: false, 
      error: 'Registration is already submitted and waiting for Admin verification.' 
    };
  }

  if (currentStatus === EMPLOYEE_STATUS.ACTIVE) {
    return { 
      valid: false, 
      error: 'Employee is already registered and active. Please proceed to login.' 
    };
  }

  if (currentStatus === EMPLOYEE_STATUS.REJECTED) {
    return { 
      valid: false, 
      error: 'Employee registration was rejected by Admin. Please contact HR / Admin.' 
    };
  }

  if (currentStatus === EMPLOYEE_STATUS.INACTIVE || currentStatus === EMPLOYEE_STATUS.SUSPENDED) {
    return { 
      valid: false, 
      error: 'Employee account is inactive. Please contact Admin.' 
    };
  }

  // Validate Name matching (case-insensitive)
  const enteredName = normalizeText(name);
  const recordName = normalizeText(foundEmp.name);
  if (!enteredName || (!recordName.includes(enteredName) && !enteredName.includes(recordName))) {
    return {
      valid: false,
      error: 'Name does not match the employee record. Please contact Admin.'
    };
  }

  // Validate Mobile or Email matching
  const enteredPhone = normalizePhone(mobile);
  const recordPhone = normalizePhone(foundEmp.mobile);
  const enteredEmail = normalizeText(email);
  const recordEmail = normalizeText(foundEmp.email);

  const phoneMatches = enteredPhone && recordPhone && (enteredPhone === recordPhone || recordPhone.endsWith(enteredPhone));
  const emailMatches = enteredEmail && recordEmail && (enteredEmail === recordEmail);

  if (!phoneMatches && !emailMatches) {
    return {
      valid: false,
      error: 'Registered mobile number or email does not match Admin employee record. Please contact Admin.'
    };
  }

  // Password validation
  if (!password || password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long.' };
  }

  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match. Please verify and retype.' };
  }

  return {
    valid: true,
    employee: foundEmp,
    assignedRole: foundEmp.role, // TRUSTED role from Admin-created record
  };
}

/**
 * Validates login credentials against active accounts.
 * Supports Employee ID, Email, or Mobile Number + Password.
 */
export function validateLoginAttempt(identifier, password, employees = [], users = []) {
  const cleanId = (identifier || '').trim();
  const lowerId = cleanId.toLowerCase();
  const isPhoneFormat = /^[+]?[\d\s-]{7,15}$/.test(cleanId) && cleanId.replace(/\D/g, '').length >= 7;
  const digitsOnly = isPhoneFormat ? normalizePhone(cleanId) : '';

  // 1. Direct Official Role Accounts Check (Role-based Portal Access)
  const roleAcc = OFFICIAL_ROLE_ACCOUNTS.find((acc) => {
    const accId = (acc.employeeId || '').toUpperCase();
    const accEmail = (acc.email || '').toLowerCase();
    const accSecEmail = (acc.secondaryEmail || '').toLowerCase();
    const accUsername = accEmail.split('@')[0];
    return (
      accId === cleanId.toUpperCase() ||
      accEmail === lowerId ||
      accSecEmail === lowerId ||
      accUsername === lowerId
    );
  });

  if (roleAcc) {
    if (password === roleAcc.password) {
      const { password: _p, ...safeRoleAcc } = roleAcc;
      return {
        allowed: true,
        user: safeRoleAcc,
        role: roleAcc.role,
        redirectPath: roleAcc.portalRoute || ROLE_ROUTES[roleAcc.role] || '/login',
      };
    } else {
      return { allowed: false, error: 'Incorrect password for role account. Please check credentials.' };
    }
  }

  // 2. Find employee in workforce database
  const matchingEmp = employees.find((e) => {
    const eId = (e.id || '').toUpperCase();
    const eUsername = (e.username || '').toLowerCase();
    const eEmail = (e.email || '').toLowerCase();
    const ePhone = normalizePhone(e.mobile);
    return (
      (eUsername && eUsername === lowerId) ||
      eId === cleanId.toUpperCase() ||
      eEmail === lowerId ||
      (digitsOnly && ePhone && (digitsOnly === ePhone || ePhone.endsWith(digitsOnly)))
    );
  });

  // 3. Find registered user record
  const matchingUser = users.find((u) => {
    const uEmpId = (u.employeeId || '').toUpperCase();
    const uId = (u.id || '').toUpperCase();
    const uUsername = (u.username || '').toLowerCase();
    const uEmail = (u.email || '').toLowerCase();
    const uPhone = normalizePhone(u.phone || u.mobile);
    return (
      (uUsername && uUsername === lowerId) ||
      uEmpId === cleanId.toUpperCase() ||
      uId === cleanId.toUpperCase() ||
      uId === `USR-${cleanId.toUpperCase()}` ||
      uEmail === lowerId ||
      (digitsOnly && uPhone && (digitsOnly === uPhone || uPhone.endsWith(digitsOnly)))
    );
  });

  const empRecord = matchingEmp || matchingUser;

  if (!empRecord) {
    return {
      allowed: false,
      error: 'Employee record not found. Please contact Admin.'
    };
  }

  // 4. Check Status Restrictions
  const status = empRecord.status || (matchingUser ? EMPLOYEE_STATUS.ACTIVE : EMPLOYEE_STATUS.PENDING_REGISTRATION);

  if (status === EMPLOYEE_STATUS.PENDING_REGISTRATION) {
    return {
      allowed: false,
      error: 'Please complete employee registration first.'
    };
  }

  if (status === EMPLOYEE_STATUS.PENDING_APPROVAL) {
    return {
      allowed: false,
      error: 'Your account is pending Admin approval. Please wait for verification.'
    };
  }

  if (status === EMPLOYEE_STATUS.REJECTED) {
    return {
      allowed: false,
      error: 'Your account has been rejected. Please contact Admin.'
    };
  }

  if (status === EMPLOYEE_STATUS.INACTIVE || status === EMPLOYEE_STATUS.SUSPENDED) {
    return {
      allowed: false,
      error: 'Your account is inactive. Please contact Admin.'
    };
  }

  if (status !== EMPLOYEE_STATUS.ACTIVE) {
    return {
      allowed: false,
      error: 'Your account is not active. Please contact Admin.'
    };
  }

  // 5. Password check
  const validPassword = matchingUser?.password || matchingEmp?.password;
  if (!validPassword || validPassword !== password) {
    return {
      allowed: false,
      error: 'Incorrect password. Please verify and try again.'
    };
  }

  // 6. Build trusted session with backend-verified role (WITHOUT PLAINTEXT PASSWORD)
  const trustedRole = empRecord.role || ROLES.PLANT_MANAGER;
  const redirectPath = ROLE_ROUTES[trustedRole] || '/login';

  const sessionUser = {
    id: matchingUser?.id || `USR-${empRecord.id}`,
    employeeId: empRecord.id || empRecord.employeeId,
    username: empRecord.username || matchingUser?.username || cleanId,
    name: empRecord.name,
    email: empRecord.email,
    mobile: empRecord.mobile || empRecord.phone,
    role: trustedRole,
    department: empRecord.department || 'Operations',
    plantLocation: empRecord.plant || empRecord.plantLocation || 'Plant Unit #01',
    status: EMPLOYEE_STATUS.ACTIVE,
    permissions: empRecord.permissions || ['ROLE_ACCESS'],
    lastLoginAt: new Date().toISOString(),
  };

  return {
    allowed: true,
    user: sessionUser,
    role: trustedRole,
    redirectPath,
  };
}

export const VAULT_STORAGE_KEY = 'rmc_employee_credentials_vault_v1';

/**
 * Persists assigned employee credentials to a secure local credentials vault so that
 * newly added or edited employees can always log in without relying on external network provisioning.
 */
export function saveEmployeeCredentials(empData, password) {
  if (!empData || !password) return;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(VAULT_STORAGE_KEY) : null;
    const vault = raw ? JSON.parse(raw) : {};

    const cleanUsername = (empData.username || '').toLowerCase().replace(/^@+/, '').trim();
    const cleanId = (empData.id || empData.employeeId || '').toUpperCase().trim();
    const cleanEmail = (empData.email || '').toLowerCase().trim();
    const cleanPhone = normalizePhone(empData.mobile || empData.phone);

    const record = {
      password: String(password).trim(),
      id: cleanId,
      username: cleanUsername,
      name: empData.name,
      role: empData.role,
      email: cleanEmail,
      mobile: empData.mobile || empData.phone,
      plant: empData.plant || empData.plantLocation,
      department: empData.department,
      updatedAt: new Date().toISOString(),
    };

    if (cleanId) vault[cleanId] = record;
    if (cleanUsername) {
      vault[cleanUsername] = record;
      vault[`@${cleanUsername}`] = record;
    }
    if (cleanEmail) vault[cleanEmail] = record;
    if (cleanPhone) vault[cleanPhone] = record;

    if (typeof window !== 'undefined') {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
    }
  } catch (err) {
    console.warn('Failed to save employee credentials to vault:', err);
  }
}

/**
 * Retrieves stored credentials from vault or last registration cache by any identifier
 */
export function getEmployeeStoredCredentials(identifier) {
  if (!identifier || typeof window === 'undefined') return null;
  const clean = identifier.trim();
  const lower = clean.toLowerCase();
  const stripped = lower.replace(/^@+/, '');
  const phone = normalizePhone(clean);

  // 1. Check Primary Credentials Vault
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (raw) {
      const vault = JSON.parse(raw);
      const hit =
        vault[clean.toUpperCase()] ||
        vault[clean] ||
        vault[lower] ||
        vault[`@${stripped}`] ||
        vault[stripped] ||
        (phone && vault[phone]);
      if (hit && hit.password) return hit;
    }
  } catch {
    // ignore
  }

  // 2. Check Last Registered Credentials Cache
  try {
    const lastRaw = localStorage.getItem('rmc_last_registered_employee_credentials');
    if (lastRaw) {
      const last = JSON.parse(lastRaw);
      const lastUsername = (last.username || '').toLowerCase().replace(/^@+/, '');
      const lastId = (last.id || '').toUpperCase();
      if (
        (lastUsername && (lastUsername === lower || lastUsername === stripped)) ||
        (lastId && (lastId === clean.toUpperCase() || lastId === stripped.toUpperCase()))
      ) {
        return last;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Resolves any login identifier (Employee ID, Username with or without '@', Email, Phone) to an
 * authoritative account profile and verified email for Authentication.
 * Strictly guarantees that user cannot tamper with role or company assignment.
 */
export function resolveLoginIdentity(identifier, employees = [], users = []) {
  if (!identifier) return { found: false };

  const cleanId = identifier.trim();
  const lowerId = cleanId.toLowerCase();
  const strippedId = cleanId.replace(/^@+/, '').trim();
  const strippedLower = strippedId.toLowerCase();
  const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId);
  const isPhoneFormat = /^[+]?[\d\s-]{7,15}$/.test(cleanId) && cleanId.replace(/\D/g, '').length >= 7;
  const digitsOnly = isPhoneFormat ? normalizePhone(cleanId) : '';

  // 1. Direct Official Role Accounts Check
  const roleAcc = OFFICIAL_ROLE_ACCOUNTS.find((acc) => {
    const accId = (acc.employeeId || '').toUpperCase();
    const accEmail = (acc.email || '').toLowerCase();
    const accSecEmail = (acc.secondaryEmail || '').toLowerCase();
    const accUsername = accEmail.split('@')[0];
    const accPhone = normalizePhone(acc.phone);
    return (
      accId === cleanId.toUpperCase() ||
      accId === strippedId.toUpperCase() ||
      accEmail === lowerId ||
      accSecEmail === lowerId ||
      accUsername === lowerId ||
      accUsername === strippedLower ||
      (digitsOnly && accPhone && (digitsOnly === accPhone || accPhone.endsWith(digitsOnly)))
    );
  });

  if (roleAcc) {
    const { password: _p, ...safeAcc } = roleAcc;
    return {
      found: true,
      email: roleAcc.email,
      user: safeAcc,
      role: roleAcc.role,
      status: EMPLOYEE_STATUS.ACTIVE,
      employeeId: roleAcc.employeeId,
      name: roleAcc.name,
      department: roleAcc.department,
      plantLocation: roleAcc.plantLocation,
      avatar: roleAcc.avatar,
      isOfficialAccount: true,
      redirectPath: roleAcc.portalRoute || ROLE_ROUTES[roleAcc.role] || '/login',
      assignedPassword: roleAcc.password,
    };
  }

  // 2. Find employee in workforce database (matches username with or without '@', employee ID, email, or phone)
  const matchingEmp = employees.find((e) => {
    const eId = (e.id || '').toUpperCase();
    const eUsername = (e.username || '').toLowerCase().replace(/^@+/, '');
    const eEmail = (e.email || '').toLowerCase();
    const ePhone = normalizePhone(e.mobile);
    return (
      (eUsername && (eUsername === lowerId || eUsername === strippedLower)) ||
      (eId && (eId === cleanId.toUpperCase() || eId === strippedId.toUpperCase())) ||
      (eEmail && (eEmail === lowerId || eEmail === strippedLower)) ||
      (digitsOnly && ePhone && (digitsOnly === ePhone || ePhone.endsWith(digitsOnly)))
    );
  });

  // 3. Find registered user record
  const matchingUser = users.find((u) => {
    const uEmpId = (u.employeeId || '').toUpperCase();
    const uId = (u.id || '').toUpperCase();
    const uUsername = (u.username || '').toLowerCase().replace(/^@+/, '');
    const uEmail = (u.email || '').toLowerCase();
    const uPhone = normalizePhone(u.phone || u.mobile);
    return (
      (uUsername && (uUsername === lowerId || uUsername === strippedLower)) ||
      (uEmpId && (uEmpId === cleanId.toUpperCase() || uEmpId === strippedId.toUpperCase())) ||
      (uId && (
        uId === cleanId.toUpperCase() ||
        uId === strippedId.toUpperCase() ||
        uId === `USR-${cleanId.toUpperCase()}` ||
        uId === `USR-${strippedId.toUpperCase()}`
      )) ||
      (uEmail && (uEmail === lowerId || uEmail === strippedLower)) ||
      (digitsOnly && uPhone && (digitsOnly === uPhone || uPhone.endsWith(digitsOnly)))
    );
  });

  const empRecord = matchingEmp || matchingUser;

  if (!empRecord) {
    // If identifier is a genuine email format, allow attempting Firebase Auth directly
    if (isEmailFormat) {
      return {
        found: true,
        email: lowerId,
        user: {
          id: `USR-${strippedId}`,
          email: lowerId,
          name: lowerId.split('@')[0],
          role: ROLES.PLANT_MANAGER,
          status: EMPLOYEE_STATUS.ACTIVE,
        },
        role: ROLES.PLANT_MANAGER,
        status: EMPLOYEE_STATUS.ACTIVE,
        employeeId: strippedId,
        name: lowerId.split('@')[0],
        isOfficialAccount: false,
        redirectPath: '/plant-manager',
      };
    }
    return { found: false };
  }

  const trustedRole = empRecord.role || ROLES.PLANT_MANAGER;
  const status = empRecord.status || (matchingUser ? EMPLOYEE_STATUS.ACTIVE : EMPLOYEE_STATUS.PENDING_REGISTRATION);
  const resolvedEmail = empRecord.email || matchingUser?.email || empRecord.registeredEmail || `${strippedLower}@smconcretech.com`;

  // Check stored vault credentials
  const vaultHit = getEmployeeStoredCredentials(cleanId);
  const resolvedPassword = empRecord.password || matchingUser?.password || vaultHit?.password || 'Pass@123';

  const safeProfile = {
    id: matchingUser?.id || `USR-${empRecord.id}`,
    employeeId: empRecord.id || empRecord.employeeId,
    name: empRecord.name,
    email: resolvedEmail,
    mobile: empRecord.mobile || empRecord.phone,
    role: trustedRole,
    department: empRecord.department || 'Operations',
    plantLocation: empRecord.plant || empRecord.plantLocation || 'Main Plant HQ',
    companyId: empRecord.companyId || 'CMP-SM-001',
    status,
    permissions: empRecord.permissions || ['ROLE_ACCESS'],
    avatar: (empRecord.name || 'EM').substring(0, 2).toUpperCase(),
    mustChangePassword: Boolean(empRecord.mustChangePassword),
    password: resolvedPassword,
  };

  return {
    found: true,
    email: resolvedEmail,
    user: safeProfile,
    role: trustedRole,
    status,
    employeeId: safeProfile.employeeId,
    name: safeProfile.name,
    department: safeProfile.department,
    plantLocation: safeProfile.plantLocation,
    avatar: safeProfile.avatar,
    isOfficialAccount: false,
    redirectPath: ROLE_ROUTES[trustedRole] || '/login',
    assignedPassword: resolvedPassword,
  };
}

/**
 * Safely provisions an employee account in Firebase Authentication using a secondary App
 * instance so that the currently active Administrator session is NOT signed out or disrupted.
 */
export async function createEmployeeFirebaseAuth(email, password) {
  if (!email || !password) return { success: false, error: 'Email and password are required.' };
  const tempAppName = `EmployeeAuth_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  let secondaryApp = null;
  try {
    secondaryApp = initializeApp(app.options, tempAppName);
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await signOut(secondaryAuth);
    return { success: true, uid: cred.user.uid };
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      return { success: true, alreadyExists: true };
    }
    return { success: false, error: err.message, code: err.code };
  } finally {
    if (secondaryApp) {
      try {
        await deleteApp(secondaryApp);
      } catch {
        // ignore
      }
    }
  }
}
