/**
 * Enterprise Roles and Route Definitions for SM CONCRETECH
 * Clean structure with zero dummy data records.
 */

export const ROLES = {
  ADMIN: 'Admin',
  PLANT_MANAGER: 'Plant Manager',
  PLANT_INCHARGE: 'Plant Incharge',
  ACCOUNTANT: 'Accountant',
  OPERATOR: 'Operator',
  DISPATCHER: 'Dispatcher',
  QC_ENGINEER: 'QC Engineer',
  SITE_SUPERVISOR: 'Site Supervisor',
  DRIVER: 'Driver',
  OWNER_DIRECTOR: 'Owner / Director',
};

export const ROLE_ROUTES = {
  [ROLES.ADMIN]: '/admin',
  [ROLES.PLANT_MANAGER]: '/plant-manager',
  [ROLES.PLANT_INCHARGE]: '/plant-manager',
  [ROLES.ACCOUNTANT]: '/accountant',
  [ROLES.OPERATOR]: '/operator',
  [ROLES.DISPATCHER]: '/dispatcher',
  [ROLES.QC_ENGINEER]: '/qc',
  [ROLES.SITE_SUPERVISOR]: '/site-supervisor',
  [ROLES.DRIVER]: '/driver',
  [ROLES.OWNER_DIRECTOR]: '/admin',
};

export function isAdminPerson(u) {
  if (!u) return false;
  const roleLower = String(u.role || '').trim().toLowerCase();
  const nameLower = String(u.name || '').trim().toLowerCase();
  const idUpper = String(u.employeeId || u.id || '').trim().toUpperCase();
  return (
    roleLower === 'admin' ||
    roleLower.includes('owner') ||
    roleLower.includes('director') ||
    roleLower.includes('system admin') ||
    roleLower.includes('administrator') ||
    nameLower === 'system administrator' ||
    nameLower.includes('system admin') ||
    idUpper === 'ADM-001' ||
    idUpper === 'USR-ADMIN-001' ||
    idUpper === 'OWN-001'
  );
}

/**
 * Validates whether an employee, user, or record is a test/dummy mock record.
 * Strictly purges mock dummy names (e.g. Ayush Patil, Manoj Jadhav, Sunil More, Prithvi Jadhav, Prajakta Pawar, Mukta, Pranav)
 * while preserving genuine operational role accounts (PM-001, DIS-001, QC-001, SS-001, DRV-001, ACC-001, OWN-001)
 * and genuine real registered employees.
 */
export function isDummyEmployee(e) {
  if (!e) return false;
  if (e.isMock === true || e.isDummy === true) return true;

  const nameLower = String(e.name || e.employeeName || e.displayName || '').toLowerCase().trim();
  const emailLower = String(e.email || e.secondaryEmail || '').toLowerCase().trim();
  const idUpper = String(e.id || e.employeeId || e.userId || '').toUpperCase().trim();

  // Executive accounts (Root Admin, Owner / Director) are console accounts, not workforce field employees
  if (
    nameLower === 'system administrator' ||
    nameLower.includes('system admin') ||
    nameLower.includes('owner') ||
    nameLower.includes('director') ||
    idUpper === 'ADM-001' ||
    idUpper === 'USR-ADMIN-001' ||
    idUpper === 'OWN-001' ||
    idUpper === 'USR-OD-001' ||
    emailLower === 'sm@gmail.com' ||
    emailLower === 'smconcretech@gmail.com' ||
    emailLower === 'owner@sm.com' ||
    emailLower === 'owner@smconcretech.com'
  ) {
    return true;
  }

  // Explicit dummy/mock person names to purge
  const dummyNames = [
    'ayush',
    'aayush',
    'manoj',
    'jadhav',
    'sunil more',
    'prithvi',
    'prajakta',
    'mukta',
    'pranav',
    'dummy',
    'test employee'
  ];

  if (dummyNames.some((t) => nameLower.includes(t))) {
    return true;
  }

  // Explicit dummy emails to purge
  const dummyEmails = [
    'ayush',
    'aayush',
    'manoj',
    'jadhav',
    'sunil',
    'prithvi',
    'prajakta',
    'mukta',
    'pranav',
    'abc@gmail.com',
    'test@',
    'dummy@'
  ];

  if (dummyEmails.some((t) => emailLower.includes(t))) {
    return true;
  }

  return false;
}

export function getRoleRoute(role) {
  if (!role) return '/login';
  if (ROLE_ROUTES[role]) return ROLE_ROUTES[role];
  const rLower = String(role).trim().toLowerCase();
  if (rLower.includes('admin')) return '/admin';
  if (rLower.includes('operator')) return '/operator';
  if (rLower.includes('manager') || rLower.includes('incharge')) return '/plant-manager';
  if (rLower.includes('account') || rLower.includes('finance')) return '/accountant';
  if (rLower.includes('dispatch') || rLower.includes('logistics')) return '/dispatcher';
  if (rLower.includes('qc') || rLower.includes('quality') || rLower.includes('lab')) return '/qc';
  if (rLower.includes('supervisor') || rLower.includes('site')) return '/site-supervisor';
  if (rLower.includes('driver') || rLower.includes('mixer')) return '/driver';
  if (rLower.includes('owner') || rLower.includes('director')) return '/owner';
  return '/plant-manager';
}

const buildOfficialAccount = ({
  id,
  name,
  email,
  employeeId,
  password,
  role,
  badge,
  avatar,
  department,
  portalRoute,
  phone,
}) => ({
  id,
  name,
  email,
  secondaryEmail: email,
  employeeId,
  password,
  role,
  department,
  plantLocation: 'Main Plant HQ',
  badge,
  portalRoute,
  portalName: `${name} Portal`,
  avatar,
  phone,
  status: 'Active',
  mustChangePassword: false,
});

// System Root Administrator for authenticating the management console
export const SYSTEM_ADMIN = buildOfficialAccount({
  id: 'USR-ADMIN-001',
  name: 'System Administrator',
  email: 'sm@gmail.com',
  secondaryEmail: 'smconcretech@gmail.com',
  employeeId: 'ADM-001',
  password: 'sm1234',
  role: ROLES.ADMIN,
  department: 'Executive Administration',
  badge: 'ROOT',
  avatar: 'SA',
  portalRoute: '/admin',
  phone: '+91 9820000001',
});

// Official Role Accounts Directory - Complete with Username, Employee ID, Password, and Portal Access
export const OFFICIAL_ROLE_ACCOUNTS = [
  SYSTEM_ADMIN,
  buildOfficialAccount({
    id: 'USR-PM-001',
    name: 'Plant Manager',
    email: 'manager@sm.com',
    secondaryEmail: 'manager@smconcretech.com',
    employeeId: 'PM-001',
    password: 'Plant@123',
    role: ROLES.PLANT_MANAGER,
    department: 'Operations Management',
    badge: 'OPS',
    avatar: 'PM',
    portalRoute: '/plant-manager',
    phone: '+91 9820000002',
  }),
  buildOfficialAccount({
    id: 'USR-ACC-001',
    name: 'Accountant',
    email: 'accountant@sm.com',
    secondaryEmail: 'accountant@smconcretech.com',
    employeeId: 'ACC-001',
    password: 'Finance@123',
    role: ROLES.ACCOUNTANT,
    department: 'Finance',
    badge: 'FIN',
    avatar: 'ACC',
    portalRoute: '/accountant',
    phone: '+91 9820000003',
  }),
  buildOfficialAccount({
    id: 'USR-DIS-001',
    name: 'Dispatcher',
    email: 'dispatcher@sm.com',
    secondaryEmail: 'dispatcher@smconcretech.com',
    employeeId: 'DIS-001',
    password: 'Dispatch@123',
    role: ROLES.DISPATCHER,
    department: 'Logistics',
    badge: 'LOG',
    avatar: 'DIS',
    portalRoute: '/dispatcher',
    phone: '+91 9820000004',
  }),
  buildOfficialAccount({
    id: 'USR-QC-001',
    name: 'QC Engineer',
    email: 'qc@sm.com',
    secondaryEmail: 'qc@smconcretech.com',
    employeeId: 'QC-001',
    password: 'Quality@123',
    role: ROLES.QC_ENGINEER,
    department: 'Quality Control',
    badge: 'LAB',
    avatar: 'QC',
    portalRoute: '/qc',
    phone: '+91 9820000005',
  }),
  buildOfficialAccount({
    id: 'USR-SS-001',
    name: 'Site Supervisor',
    email: 'supervisor@sm.com',
    secondaryEmail: 'supervisor@smconcretech.com',
    employeeId: 'SS-001',
    password: 'Site@123',
    role: ROLES.SITE_SUPERVISOR,
    department: 'Site Operations',
    badge: 'SITE',
    avatar: 'SS',
    portalRoute: '/site-supervisor',
    phone: '+91 9820000006',
  }),
  buildOfficialAccount({
    id: 'USR-DV-001',
    name: 'Driver',
    email: 'driver@sm.com',
    secondaryEmail: 'driver@smconcretech.com',
    employeeId: 'DRV-001',
    password: 'Driver@123',
    role: ROLES.DRIVER,
    department: 'Fleet Operations',
    badge: 'FLEET',
    avatar: 'DRV',
    portalRoute: '/driver',
    phone: '+91 9820000007',
  }),
  buildOfficialAccount({
    id: 'USR-OP-001',
    name: 'Plant Operator',
    email: 'operator@sm.com',
    secondaryEmail: 'operator@smconcretech.com',
    employeeId: 'OP-001',
    password: 'Operator@123',
    role: ROLES.OPERATOR,
    department: 'Plant Batching Operations',
    badge: 'PLANT',
    avatar: 'OP',
    portalRoute: '/operator',
    phone: '+91 9820000008',
  }),
];

// Generic Role Profiles for Role Testing
export const SYSTEM_ROLE_PROFILES = OFFICIAL_ROLE_ACCOUNTS.map((acc) => ({
  role: acc.role,
  title: acc.name,
  route: acc.portalRoute,
  avatar: acc.avatar,
  badge: acc.badge,
  email: acc.email,
  employeeId: acc.employeeId,
  password: acc.password,
}));

// Initial users seeded with official role accounts
export const INITIAL_MOCK_USERS = OFFICIAL_ROLE_ACCOUNTS;
