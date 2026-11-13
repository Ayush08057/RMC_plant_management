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
  [ROLES.OPERATOR]: '/plant-manager',
  [ROLES.DISPATCHER]: '/dispatcher',
  [ROLES.QC_ENGINEER]: '/qc',
  [ROLES.SITE_SUPERVISOR]: '/site-supervisor',
  [ROLES.DRIVER]: '/driver',
  [ROLES.OWNER_DIRECTOR]: '/owner',
};

export function isAdminPerson(u) {
  if (!u) return false;
  const roleLower = String(u.role || '').trim().toLowerCase();
  const nameLower = String(u.name || '').trim().toLowerCase();
  const idUpper = String(u.employeeId || u.id || '').trim().toUpperCase();
  return (
    roleLower === 'admin' ||
    roleLower.includes('system admin') ||
    roleLower.includes('administrator') ||
    nameLower === 'system administrator' ||
    nameLower.includes('system admin') ||
    idUpper === 'ADM-001' ||
    idUpper === 'USR-ADMIN-001'
  );
}

export function getRoleRoute(role) {
  if (!role) return '/login';
  if (ROLE_ROUTES[role]) return ROLE_ROUTES[role];
  const rLower = String(role).trim().toLowerCase();
  if (rLower.includes('admin')) return '/admin';
  if (rLower.includes('manager') || rLower.includes('incharge') || rLower.includes('operator')) return '/plant-manager';
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
  email: 'smconcretech@gmail.com',
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
    email: 'manager@smconcretech.com',
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
    email: 'accountant@smconcretech.com',
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
    email: 'dispatcher@smconcretech.com',
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
    email: 'qc@smconcretech.com',
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
    email: 'supervisor@smconcretech.com',
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
    email: 'driver@smconcretech.com',
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
    id: 'USR-OD-001',
    name: 'Owner / Director',
    email: 'owner@smconcretech.com',
    employeeId: 'OWN-001',
    password: 'Director@123',
    role: ROLES.OWNER_DIRECTOR,
    department: 'Executive Leadership',
    badge: 'EXEC',
    avatar: 'OD',
    portalRoute: '/owner',
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

/**
 * Checks whether an employee or person object is a generic placeholder role account
 * (e.g. name is literally "Plant Manager", "Dispatcher", or ID is "DIS-001", "PM-001")
 */
export function isGenericRoleDummy(person) {
  if (!person) return false;
  const name = String(person.name || person.employeeName || '').trim().toLowerCase();
  const id = String(person.employeeId || person.id || '').trim().toUpperCase();
  const genericNames = [
    'plant manager',
    'accountant',
    'dispatcher',
    'qc engineer',
    'site supervisor',
    'driver',
    'owner / director',
    'system administrator',
  ];
  const genericIds = [
    'PM-001',
    'ACC-001',
    'DIS-001',
    'QC-001',
    'SS-001',
    'DRV-001',
    'OWN-001',
    'ADM-001',
    'USR-PM-001',
    'USR-ACC-001',
    'USR-DIS-001',
    'USR-QC-001',
    'USR-SS-001',
    'USR-DV-001',
    'USR-OD-001',
    'USR-ADMIN-001',
  ];
  return genericNames.includes(name) || genericIds.includes(id);
}

/**
 * Original Registered Company Personnel of SM ConcreTech
 * Real employee directory records with genuine names, IDs, departments and contact details
 */
export const ORIGINAL_COMPANY_EMPLOYEES = [
  {
    id: 'EMP-115',
    employeeId: 'EMP-115',
    name: 'Ayush Patil',
    role: ROLES.PLANT_MANAGER,
    email: 'ayush05@gmail.com',
    mobile: '+91 9373488061',
    phone: '+91 9373488061',
    department: 'Plant Operations & Batching',
    plant: 'Main Plant Unit #01',
    plantLocation: 'Main Plant Unit #01',
    salary: 45000,
    status: 'Active',
    joiningDate: '2026-10-01',
  },
  {
    id: 'EMP-333',
    employeeId: 'EMP-333',
    name: 'Prajakta Pawar',
    role: ROLES.DISPATCHER,
    email: 'dispatcher@smconcretech.com',
    mobile: '+91 9022705467',
    phone: '+91 9022705467',
    department: 'Transit Logistics & Fleet Dispatch',
    plant: 'Central Dispatch Hub',
    plantLocation: 'Central Dispatch Hub',
    salary: 35000,
    status: 'Active',
    joiningDate: '2026-10-01',
  },
  {
    id: 'EMP-909',
    employeeId: 'EMP-909',
    name: 'Snehalata Ligade',
    role: ROLES.SITE_SUPERVISOR,
    email: 'snehalataligade@gmail.com',
    mobile: '+91 9372491672',
    phone: '+91 9372491672',
    department: 'Civil Site Execution',
    plant: 'Highway Hub #03 (Panvel)',
    plantLocation: 'Highway Hub #03 (Panvel)',
    salary: 38000,
    status: 'Active',
    joiningDate: '2026-10-01',
  },
  {
    id: 'EMP-DRI-001',
    employeeId: 'EMP-DRI-001',
    name: 'Ramesh Shinde',
    role: ROLES.DRIVER,
    email: 'driver@smconcretech.com',
    mobile: '+91 9820000007',
    phone: '+91 9820000007',
    department: 'Transit Mixer Fleet',
    plant: 'Main Plant Dispatch Yard',
    plantLocation: 'Main Plant Dispatch Yard',
    salary: 32000,
    status: 'Active',
    joiningDate: '2026-10-01',
  },
  {
    id: 'EMP-OPR-001',
    employeeId: 'EMP-OPR-001',
    name: 'Manoj Jadhav',
    role: ROLES.OPERATOR,
    email: 'operator@smconcretech.com',
    mobile: '+91 9820000009',
    phone: '+91 9820000009',
    department: 'Plant Automation & Batching',
    plant: 'Main Plant Unit #01',
    plantLocation: 'Main Plant Unit #01',
    salary: 30000,
    status: 'Active',
    joiningDate: '2026-10-01',
  },
  {
    id: 'EMP-OWN-001',
    employeeId: 'EMP-OWN-001',
    name: 'Sunil More',
    role: ROLES.OWNER_DIRECTOR,
    email: 'owner@smconcretech.com',
    mobile: '+91 9820000008',
    phone: '+91 9820000008',
    department: 'Executive Board',
    plant: 'Corporate HQ',
    plantLocation: 'Corporate HQ',
    salary: 95000,
    status: 'Active',
    joiningDate: '2026-10-01',
  },
  {
    id: 'EMP-251',
    employeeId: 'EMP-251',
    name: 'Mukta',
    role: ROLES.DRIVER,
    email: 'mukta@gmail.com',
    mobile: '+91 9579012787',
    phone: '+91 9579012787',
    department: 'Transit Mixer Fleet',
    plant: 'Main Plant Unit #01',
    plantLocation: 'Main Plant Unit #01',
    salary: 32000,
    status: 'Active',
    joiningDate: '2026-10-09',
  },
  {
    id: 'EMP-273',
    employeeId: 'EMP-273',
    name: 'Pranav',
    role: ROLES.DRIVER,
    email: 'abc@gmail.com',
    mobile: '+91 8010597020',
    phone: '+91 8010597020',
    department: 'Transit Mixer Fleet',
    plant: 'Main Plant Unit #01',
    plantLocation: 'Main Plant Unit #01',
    salary: 32000,
    status: 'Active',
    joiningDate: '2026-10-09',
  },
];

