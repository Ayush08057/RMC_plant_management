/**
/**
 * RMC Plant Management System - Operational Data Structure
 * Clean structure with all mock/dummy records removed.
 */

export const MOCK_PLANTS = [
  { id: 'PLT-01', name: 'Main Plant Unit #01', code: 'PLT-1', capacity: '120 m³/hr', status: 'Online' },
];

export const MOCK_ADMIN_DATA = {
  kpis: {
    totalEmployees: 0,
    activeUsers: 0,
    totalPlants: 3,
    activeRoles: 8,
    securityStatus: 'Enforced (2FA Mandated)',
    systemStatus: '100% Operational',
  },
  employees: [],
  systemActivities: [],
  securityAlerts: [],
};

export const MOCK_PLANT_MANAGER_DATA = {
  kpis: {
    todayProduction: '0 m³',
    productionTarget: '0 m³',
    todayDispatches: '0 Loads',
    pendingOrders: '0 Orders',
    activeVehicles: '0 Mixers',
    plantStatus: 'Online • Standby',
  },
  productionSummary: {
    target: 0,
    produced: 0,
    remaining: 0,
    percentage: 0,
  },
  hourlyTrend: [],
  vehicleStatusCounts: {
    available: 0,
    loading: 0,
    onRoute: 0,
    atSite: 0,
    maintenance: 0,
  },
  siloStock: [],
  pendingOrders: [],
  plantAlerts: [],
};

export const MOCK_ACCOUNTANT_DATA = {
  kpis: {
    todayRevenue: '₹ 0',
    totalMonthSales: '₹ 0',
    pendingPayments: '₹ 0',
    outstandingReceivables: '₹ 0',
    todayInvoices: '0 Challans',
    monthlyExpenses: '₹ 0',
  },
  invoiceBreakdown: {
    paid: 0,
    pending: 0,
    overdue: 0,
  },
  customerLedgers: [],
  revenueTrend: [],
  expenseSummary: [],
};

export const MOCK_DISPATCHER_DATA = {
  kpis: {
    pendingOrders: 0,
    todayDispatches: 0,
    vehiclesAvailable: 0,
    vehiclesOnRoute: 0,
    delivered: 0,
    delayed: 0,
  },
  dispatchQueue: [],
  fleetList: [],
};

export const MOCK_QC_DATA = {
  kpis: {
    testsToday: 0,
    passedTests: 0,
    failedTests: 0,
    pendingTests: 0,
    activeBatches: 0,
    rejectedBatches: 0,
  },
  tests: [],
  cubeSchedule: [],
  failedBatches: [],
};

export const MOCK_SITE_SUPERVISOR_DATA = {
  kpis: {
    activeSites: 0,
    todayDeliveries: 0,
    pendingDeliveries: 0,
    completedDeliveries: 0,
    siteIssues: 0,
    pourEfficiency: '0%',
  },
  currentSite: null,
  todayDeliveries: [],
  pouringStatus: {
    pumpStatus: 'Standby',
    pressure: '0 Bar',
    slumpOnSite: '--',
    temperature: '--',
  },
  siteIssues: [],
};

export const MOCK_DRIVER_DATA = {
  kpis: {
    todayTrips: 0,
    distanceCovered: '0 km',
    fuelConsumed: '0 L',
    currentStatus: 'Standby',
  },
  currentTrip: null,
  todayCompletedTrips: [],
};

export const MOCK_OWNER_DATA = {
  kpis: {
    totalRevenue: '₹ 0',
    totalProduction: '0 m³',
    totalDispatches: '0 Loads',
    outstandingAmount: '₹ 0',
    activePlants: '3 Plants',
    activeCustomers: '0 Clients',
  },
  plantComparison: [],
  topClients: [],
  managementInsights: [],
};
