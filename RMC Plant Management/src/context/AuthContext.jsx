import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase.js';
import { 
  COLLECTIONS, 
  saveDocumentWithId, 
  fetchCollection, 
  subscribeToCollection,
  removeDocument,
  updateDocument,
  syncRoleAccountsToFirestore
} from '../services/firestoreService.js';
import { INITIAL_MOCK_USERS, ROLES, ROLE_ROUTES, SYSTEM_ADMIN, SYSTEM_ROLE_PROFILES, OFFICIAL_ROLE_ACCOUNTS } from '../data/mockUsers.js';
import { 
  EMPLOYEE_STATUS, 
  validateEmployeeForRegistration, 
  validateLoginAttempt 
} from '../services/employeeAuthService.js';
import LogoutConfirmModal from '../components/common/LogoutConfirmModal.jsx';

const AuthContext = createContext(null);

const STORAGE_USERS_KEY = 'rmc_users_db_v2';
const STORAGE_SESSION_KEY = 'rmc_current_user_v3';
const STORAGE_REMEMBER_KEY = 'rmc_remember_choice_v3';

export const AuthProvider = ({ children }) => {
  // Clear any legacy persistent login sessions so opening the website always asks for login first
  useEffect(() => {
    try {
      localStorage.removeItem('rmc_users_db_v1');
      sessionStorage.removeItem('rmc_current_user_v1');
      localStorage.removeItem('rmc_current_user_v2');
      sessionStorage.removeItem('rmc_current_user_v2');
      localStorage.removeItem('rmc_remember_choice_v2');
      localStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.removeItem(STORAGE_REMEMBER_KEY);
    } catch {
      // ignore
    }
  }, []);

  const [users, setUsers] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_USERS_KEY);
      return stored ? JSON.parse(stored) : OFFICIAL_ROLE_ACCOUNTS;
    } catch {
      return OFFICIAL_ROLE_ACCOUNTS;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      // Strictly require login on opening the site.
      // Active sessions are only preserved within current tab/window (sessionStorage) across page refreshes.
      const stored = sessionStorage.getItem(STORAGE_SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && parsed.role) {
          // Check for expired session
          if (parsed.sessionExpiresAt && Date.now() > parsed.sessionExpiresAt) {
            sessionStorage.removeItem(STORAGE_SESSION_KEY);
            return null;
          }
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    // Strictly require login on opening the site
    return null;
  });

  const [pendingFirstLoginUser, setPendingFirstLoginUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Auto-sync all 8 official role accounts to Firebase Cloud Firestore on mount
  useEffect(() => {
    syncRoleAccountsToFirestore(OFFICIAL_ROLE_ACCOUNTS)
      .then((res) => {
        if (res.success) {
          console.info(`✓ Successfully synced ${res.count} role accounts to Firebase Cloud Firestore.`);
        }
      })
      .catch((err) => {
        console.warn('Firebase role accounts sync notice:', err.message);
      });
  }, []);

  // Synchronize users from Cloud Firestore in real-time
  useEffect(() => {
    // 1. Initial fetch from Firestore
    fetchCollection(COLLECTIONS.USERS)
      .then((cloudUsers) => {
        if (cloudUsers && cloudUsers.length > 0) {
          setUsers((prev) => {
            const mergedMap = new Map();
            OFFICIAL_ROLE_ACCOUNTS.forEach((u) => mergedMap.set(u.id, u));
            prev.forEach((u) => mergedMap.set(u.id, u));
            cloudUsers.forEach((cu) => mergedMap.set(cu.id, cu));
            return Array.from(mergedMap.values());
          });
        }
      })
      .catch((err) => {
        console.warn('Firestore initial users fetch skipped:', err.message);
      });

    // 2. Real-time subscription to Firestore users
    const unsubscribe = subscribeToCollection(COLLECTIONS.USERS, (updatedUsers) => {
      if (updatedUsers && updatedUsers.length > 0) {
        setUsers((prev) => {
          const mergedMap = new Map();
          OFFICIAL_ROLE_ACCOUNTS.forEach((u) => mergedMap.set(u.id, u));
          prev.forEach((u) => mergedMap.set(u.id, u));
          updatedUsers.forEach((cu) => mergedMap.set(cu.id, cu));
          return Array.from(mergedMap.values());
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Sync users list to localStorage for offline cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch (err) {
      console.error('Failed to save users database cache:', err);
    }
  }, [users]);

  // Sync active session
  useEffect(() => {
    try {
      if (user) {
        sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
        localStorage.removeItem(STORAGE_SESSION_KEY);
        localStorage.removeItem(STORAGE_REMEMBER_KEY);
      } else {
        sessionStorage.removeItem(STORAGE_SESSION_KEY);
        localStorage.removeItem(STORAGE_SESSION_KEY);
        localStorage.removeItem(STORAGE_REMEMBER_KEY);
      }
    } catch (err) {
      console.error('Failed to save user session:', err);
    }
  }, [user]);

  const getWorkforceEmployees = () => {
    try {
      const activeCompanyId = localStorage.getItem('rmc_active_company_v1') || 'CMP-SM-001';
      const companySaved = localStorage.getItem(`rmc_workforce_state_v9_${activeCompanyId}`);
      if (companySaved) {
        const parsed = JSON.parse(companySaved);
        if (parsed.employees && parsed.employees.length > 0) return parsed.employees;
      }

      // Fallback: check any saved workforce states
      const allFound = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('rmc_workforce_state_')) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(parsed.employees)) {
              allFound.push(...parsed.employees);
            }
          } catch {
            // ignore
          }
        }
      }
      if (allFound.length > 0) return allFound;
    } catch {
      // ignore
    }
    return [];
  };

  /**
   * Login action supporting Username, Email, Employee ID, or Mobile via verified employee record
   */
  const login = async (identifier, password, rememberMe = false) => {
    setAuthError(null);
    setLoading(true);

    let activeUsersList = users;
    try {
      const storedUsersRaw = localStorage.getItem(STORAGE_USERS_KEY);
      if (storedUsersRaw) {
        activeUsersList = JSON.parse(storedUsersRaw);
        setUsers(activeUsersList);
      }
    } catch {
      // ignore
    }

    const workforceEmployees = getWorkforceEmployees();
    const result = validateLoginAttempt(identifier, password, workforceEmployees, activeUsersList);

    if (!result.allowed) {
      setLoading(false);
      setAuthError(result.error);
      return { success: false, error: result.error };
    }

    const isMaster = result.user.role === ROLES.ADMIN || result.user.email === SYSTEM_ADMIN.email || result.user.id === SYSTEM_ADMIN.id;
    const SESSION_DURATION_MS = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const sessionData = {
      ...result.user,
      isMasterAdmin: isMaster,
      originalAdminUser: isMaster ? result.user : null,
      lastLoginAt: new Date().toISOString(),
      sessionExpiresAt: Date.now() + SESSION_DURATION_MS,
    };

    try {
      sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
      localStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.removeItem(STORAGE_REMEMBER_KEY);
    } catch (err) {
      console.error('Failed to save session:', err);
    }

    try {
      localStorage.setItem('rmc_last_logged_in_user_v1', JSON.stringify({
        id: sessionData.id,
        name: sessionData.name,
        role: sessionData.role,
        employeeId: sessionData.employeeId,
        identifier: identifier,
        email: sessionData.email || '',
        avatar: sessionData.avatar || 'US',
        plant: sessionData.plant || sessionData.plantLocation || 'Main Plant HQ',
        department: sessionData.department || '',
        lastLoginAt: sessionData.lastLoginAt,
      }));
    } catch {
      // ignore
    }

    setUser(sessionData);
    setLoading(false);
    return {
      success: true,
      requiresFirstLoginSetup: false,
      user: sessionData,
      role: sessionData.role,
      redirectPath: result.redirectPath,
    };
  };

  /**
   * Manual Employee Registration without role selection
   * Validates against Admin-created employee record and sets status to 'Pending Approval'
   */
  const register = async (registrationData) => {
    setAuthError(null);
    setLoading(true);

    const workforceEmployees = getWorkforceEmployees();
    const validation = validateEmployeeForRegistration(registrationData, workforceEmployees);

    if (!validation.valid) {
      setLoading(false);
      setAuthError(validation.error);
      return { success: false, error: validation.error };
    }

    const { employee } = validation;

    // Transition employee status: Pending Registration -> Pending Approval
    try {
      const storedRaw = localStorage.getItem('rmc_workforce_state_v5');
      if (storedRaw) {
        const workforceState = JSON.parse(storedRaw);
        workforceState.employees = (workforceState.employees || []).map((e) => {
          if ((e.id || '').toUpperCase() === employee.id.toUpperCase()) {
            return {
              ...e,
              status: EMPLOYEE_STATUS.PENDING_APPROVAL,
              registeredAt: new Date().toISOString(),
              registeredMobile: registrationData.mobile,
              registeredEmail: registrationData.email,
              password: registrationData.password,
            };
          }
          return e;
        });
        localStorage.setItem('rmc_workforce_state_v5', JSON.stringify(workforceState));
      }

      // Update in Cloud Firestore
      updateDocument(COLLECTIONS.EMPLOYEES, employee.id, {
        status: EMPLOYEE_STATUS.PENDING_APPROVAL,
        registeredAt: new Date().toISOString(),
        registeredMobile: registrationData.mobile,
        registeredEmail: registrationData.email,
        password: registrationData.password,
      }).catch(() => {});
    } catch (err) {
      console.warn('Failed to update workforce employee during registration:', err);
    }

    setLoading(false);
    return {
      success: true,
      pendingApproval: true,
      role: employee.role,
      message: 'Registration successful. Your account is waiting for Admin verification.',
    };
  };

  /**
   * Switch Role using verified official role accounts
   * Preserves Master Admin Authority and original Admin session so the admin can switch anytime.
   * Non-admin users are strictly blocked from switching roles.
   */
  const switchRole = (targetRole) => {
    const hasAdminAuthority = Boolean(
      user?.isMasterAdmin ||
      user?.role === ROLES.ADMIN ||
      user?.originalAdminUser ||
      user?.email === SYSTEM_ADMIN.email
    );

    if (!hasAdminAuthority && targetRole !== user?.role) {
      console.warn('Unauthorized role switch attempt blocked for non-admin session.');
      return null;
    }

    const adminRef = user?.originalAdminUser || (user?.role === ROLES.ADMIN ? user : SYSTEM_ADMIN);

    if (targetRole === ROLES.ADMIN) {
      const restoredAdmin = {
        ...adminRef,
        role: ROLES.ADMIN,
        isMasterAdmin: true,
        originalAdminUser: adminRef,
      };
      setUser(restoredAdmin);
      return '/admin';
    }

    const roleAccount = OFFICIAL_ROLE_ACCOUNTS.find((acc) => acc.role === targetRole);
    if (roleAccount) {
      const updatedSession = {
        ...roleAccount,
        isMasterAdmin: true,
        originalAdminUser: adminRef,
      };
      setUser(updatedSession);
      return roleAccount.portalRoute || ROLE_ROUTES[targetRole] || '/';
    }

    const roleProfile = SYSTEM_ROLE_PROFILES.find((p) => p.role === targetRole) || {
      role: targetRole,
      title: targetRole,
      route: ROLE_ROUTES[targetRole] || '/',
      avatar: targetRole.substring(0, 2).toUpperCase(),
    };

    const newSession = {
      id: `USR-${targetRole.replace(/[^a-zA-Z]/g, '').toUpperCase()}`,
      name: roleProfile.title,
      email: `${targetRole.toLowerCase().replace(/[^a-z]/g, '')}@smconcretech.com`,
      employeeId: `EMP-${targetRole.substring(0, 3).toUpperCase()}-001`,
      role: targetRole,
      department: targetRole,
      plantLocation: 'Plant Unit #01',
      avatar: roleProfile.avatar,
      mustChangePassword: false,
      isMasterAdmin: true,
      originalAdminUser: adminRef,
    };

    setUser(newSession);
    return ROLE_ROUTES[targetRole] || '/';
  };

  const returnToAdmin = () => {
    return switchRole(ROLES.ADMIN);
  };

  /**
   * Add a new employee into directory (Admin action)
   */
  const addUser = async (newUser) => {
    const userRecord = {
      id: `USR-${Date.now().toString().slice(-6)}`,
      name: newUser.name,
      employeeId: newUser.employeeId,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department || 'Operations',
      plantLocation: newUser.plantLocation || 'Main Plant',
      password: newUser.password || 'Password@123',
      mustChangePassword: false,
      avatar: (newUser.name || 'EM').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase(),
      createdAt: new Date().toISOString(),
    };

    // Sync to Firestore
    try {
      await saveDocumentWithId(COLLECTIONS.USERS, userRecord.id, userRecord);
    } catch (err) {
      console.warn('Could not sync user to Firestore:', err);
    }

    setUsers((prev) => [userRecord, ...prev]);
    return userRecord;
  };

  /**
   * Delete an employee from directory
   */
  const deleteUser = async (userId) => {
    try {
      await removeDocument(COLLECTIONS.USERS, userId);
    } catch (err) {
      console.warn('Could not delete user from Firestore:', err);
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  /**
   * Complete First-Time Setup
   */
  const completeFirstTimeSetup = async (userId, currentPassword, newPassword) => {
    setAuthError(null);
    setLoading(true);

    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      setLoading(false);
      const msg = 'User record not located.';
      setAuthError(msg);
      return { success: false, error: msg };
    }

    const updatedUser = {
      ...targetUser,
      password: newPassword,
      mustChangePassword: false,
      passwordChangedAt: new Date().toISOString(),
    };

    // Update in Firestore
    saveDocumentWithId(COLLECTIONS.USERS, userId, updatedUser).catch(() => {});

    setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
    setPendingFirstLoginUser(null);
    setUser(updatedUser);
    setLoading(false);

    return {
      success: true,
      user: updatedUser,
      role: updatedUser.role,
      redirectPath: ROLE_ROUTES[updatedUser.role] || '/unauthorized',
    };
  };

  /**
   * Request password reset
   */
  const requestPasswordReset = async (identifier) => {
    setAuthError(null);
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setLoading(false);

    return {
      success: true,
      message: 'Password reset instructions sent to verified address.',
    };
  };

  /**
   * Reset password
   */
  const resetPassword = async (identifier, newPassword) => {
    setAuthError(null);
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setLoading(false);

    return {
      success: true,
      message: 'Password updated successfully.',
    };
  };

  /**
   * Request Logout: prompts confirmation dialog first
   */
  const requestLogout = () => {
    setShowLogoutConfirm(true);
  };

  /**
   * Cancel Logout: closes confirmation dialog
   */
  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  /**
   * Complete forced logout action (session wipe)
   */
  const executeLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut notice:', err);
    }
    setUser(null);
    setPendingFirstLoginUser(null);
    setAuthError(null);
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.removeItem(STORAGE_REMEMBER_KEY);
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.removeItem('rmc_current_user_v2');
      sessionStorage.removeItem('rmc_current_user_v2');
      localStorage.removeItem('rmc_remember_choice_v2');
      sessionStorage.removeItem('rmc_login_toast');
    } catch (err) {
      console.error('Logout storage error:', err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  /**
   * Logout wrapper:
   * Prompts confirmation dialog by default.
   * If invoked with { force: true } or true, executes immediately.
   */
  const logout = async (forceOrEvent) => {
    if (forceOrEvent === true || (forceOrEvent && forceOrEvent.force === true)) {
      return await executeLogout();
    }
    setShowLogoutConfirm(true);
  };

  const clearAuthError = () => setAuthError(null);

  const syncRolesToFirebase = async () => {
    return await syncRoleAccountsToFirestore(OFFICIAL_ROLE_ACCOUNTS);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    authError,
    pendingFirstLoginUser,
    register,
    login,
    logout,
    requestLogout,
    confirmLogout: executeLogout,
    cancelLogout,
    isLogoutModalOpen: showLogoutConfirm,
    switchRole,
    returnToAdmin,
    isMasterAdmin: Boolean(user?.isMasterAdmin || user?.role === ROLES.ADMIN || user?.originalAdminUser),
    addUser,
    deleteUser,
    completeFirstTimeSetup,
    requestPasswordReset,
    resetPassword,
    clearAuthError,
    allUsers: users,
    roles: ROLES,
    roleRoutes: ROLE_ROUTES,
    officialRoleAccounts: OFFICIAL_ROLE_ACCOUNTS,
    syncRolesToFirebase,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={cancelLogout}
        onConfirm={executeLogout}
        user={user}
        isLoggingOut={isLoggingOut}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
