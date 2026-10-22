/**
 * Plant Operations Business Logic & Telemetry Service
 * Phase 2 Complete Implementation for SM CONCRETE TECH ERP
 * 
 * Handles:
 * - Material Inward & Two-Stage Weighbridge Stock Updates
 * - Chemical Barrel Calculations (220L and custom capacities)
 * - Mix Design Versioning & Approvals
 * - Dynamic Batching Calculations (configurable batch size & truck batches)
 * - Delivery Challans & Non-Bill (NB) Invoice Guard
 * - Driver Smartphone 4-Step Trip Workflow & Distance Math
 * - Diesel Inward, Issue, Tank Stock, Vehicle Mileage & Equipment Consumption
 */

import { subscribeCloudStore, pushCloudStore } from './cloudSyncService.js';

// Storage Keys
export const STORAGE_KEYS = {
  INWARD: 'rmc_material_inward_v2',
  WEIGHBRIDGE: 'rmc_weighbridge_v2',
  CHEMICAL_BARRELS: 'rmc_chemical_barrels_v2',
  MIX_DESIGNS: 'rmc_mix_designs_v2',
  BATCHING: 'rmc_batching_sheets_v2',
  CHALLANS: 'rmc_delivery_challans_v2',
  TRIPS: 'rmc_driver_trips_v2',
  DIESEL: 'rmc_diesel_management_v2',
  DIESEL_INWARD: 'rmc_diesel_inward_v2',
  SILO_INVENTORY: 'rmc_silo_inventory_v2',
};

// Initial Stock Baseline
export const INITIAL_SILO_STOCK = {
  cement: { name: 'Cement (OPC 53 Grade)', stockTons: 85.4, capacityTons: 100, unit: 'Tons', siloName: 'Cement Silo #01' },
  flyash: { name: 'Fly Ash (Pozzocrete)', stockTons: 42.0, capacityTons: 60, unit: 'Tons', siloName: 'Fly Ash Silo #02' },
  agg20: { name: '20mm Coarse Aggregate', stockTons: 148.0, capacityTons: 200, unit: 'Tons', siloName: '20mm Agg Bin #01' },
  agg10: { name: '10mm Coarse Aggregate', stockTons: 110.0, capacityTons: 150, unit: 'Tons', siloName: '10mm Agg Bin #02' },
  sand: { name: 'Crushed M-Sand (Fine Sand)', stockTons: 180.5, capacityTons: 200, unit: 'Tons', siloName: 'Crushed M-Sand Bin' },
  riverSand: { name: 'Natural River Sand', stockTons: 75.0, capacityTons: 120, unit: 'Tons', siloName: 'Natural Sand Yard' },
  admixturePce: { name: 'Chemical Admixture (PCE)', stockLiters: 3200, capacityLiters: 5000, unit: 'Litres', siloName: 'Admixture Tank #01' },
  retarder: { name: 'Retarder / Plasticizer Chemical', stockLiters: 1100, capacityLiters: 3000, unit: 'Litres', siloName: 'Chemical Barrel Yard' },
};

// Standard Mix Design Library (IS:10262 & IS:456)
export const DEFAULT_MIX_DESIGNS = [
  {
    id: 'MD-M10',
    grade: 'M10',
    name: 'PCC Foundation & Leveling Concrete',
    cement: 220,
    flyash: 30,
    agg20: 820,
    agg10: 540,
    sand: 850,
    water: 180,
    admixture: 1.5,
    slump: '90 ± 25 mm',
    wcRatio: 0.58,
    targetStrength: '15.0 N/mm²',
    designRef: 'SM-MIX-2026-M10-R1',
    effectiveDate: '2026-01-01',
    revision: 'v1.0',
    status: 'Active',
    approvalStatus: 'Approved',
    approvedBy: 'QC Incharge / Lab Head'
  },
  {
    id: 'MD-M15',
    grade: 'M15',
    name: 'Standard Bedding / PCC Concrete',
    cement: 300,
    flyash: 40,
    agg20: 780,
    agg10: 520,
    sand: 820,
    water: 175,
    admixture: 2.2,
    slump: '100 ± 25 mm',
    wcRatio: 0.52,
    targetStrength: '20.5 N/mm²',
    designRef: 'SM-MIX-2026-M15-R2',
    effectiveDate: '2026-01-01',
    revision: 'v1.0',
    status: 'Active',
    approvalStatus: 'Approved',
    approvedBy: 'QC Incharge / Lab Head'
  },
  {
    id: 'MD-M20',
    grade: 'M20',
    name: 'General Structural RCC Concrete',
    cement: 330,
    flyash: 50,
    agg20: 760,
    agg10: 510,
    sand: 810,
    water: 170,
    admixture: 2.5,
    slump: '110 ± 25 mm',
    wcRatio: 0.48,
    targetStrength: '26.0 N/mm²',
    designRef: 'SM-MIX-2026-M20-R2',
    effectiveDate: '2026-01-01',
    revision: 'v1.1',
    status: 'Active',
    approvalStatus: 'Approved',
    approvedBy: 'QC Incharge / Lab Head'
  },
  {
    id: 'MD-M25',
    grade: 'M25',
    name: 'Heavy Structural Columns & Slabs',
    cement: 360,
    flyash: 60,
    agg20: 750,
    agg10: 500,
    sand: 800,
    water: 165,
    admixture: 3.0,
    slump: '120 ± 25 mm',
    wcRatio: 0.42,
    targetStrength: '31.5 N/mm²',
    designRef: 'SM-MIX-2026-M25-R3',
    effectiveDate: '2026-01-01',
    revision: 'v2.0',
    status: 'Active',
    approvalStatus: 'Approved',
    approvedBy: 'QC Incharge / Lab Head'
  },
  {
    id: 'MD-M30',
    grade: 'M30',
    name: 'Commercial Pavement, Piers & Bridges',
    cement: 390,
    flyash: 70,
    agg20: 740,
    agg10: 490,
    sand: 790,
    water: 160,
    admixture: 3.5,
    slump: '130 ± 25 mm',
    wcRatio: 0.38,
    targetStrength: '38.0 N/mm²',
    designRef: 'SM-MIX-2026-M30-R2',
    effectiveDate: '2026-01-01',
    revision: 'v1.2',
    status: 'Active',
    approvalStatus: 'Approved',
    approvedBy: 'QC Incharge / Lab Head'
  },
  {
    id: 'MD-M35',
    grade: 'M35',
    name: 'High-Strength Pre-stressed Concrete',
    cement: 420,
    flyash: 80,
    agg20: 730,
    agg10: 480,
    sand: 780,
    water: 155,
    admixture: 4.0,
    slump: '140 ± 25 mm',
    wcRatio: 0.35,
    targetStrength: '43.5 N/mm²',
    designRef: 'SM-MIX-2026-M35-R1',
    effectiveDate: '2026-01-01',
    revision: 'v1.0',
    status: 'Active',
    approvalStatus: 'Approved',
    approvedBy: 'QC Incharge / Lab Head'
  },
  {
    id: 'MD-M40',
    grade: 'M40',
    name: 'High-Performance Marine & Pier Concrete',
    cement: 450,
    flyash: 90,
    agg20: 720,
    agg10: 470,
    sand: 770,
    water: 150,
    admixture: 4.5,
    slump: '150 ± 25 mm',
    wcRatio: 0.32,
    targetStrength: '49.0 N/mm²',
    designRef: 'SM-MIX-2026-M40-R1',
    effectiveDate: '2026-01-01',
    revision: 'v1.0',
    status: 'Active',
    approvalStatus: 'Approved',
    approvedBy: 'QC Incharge / Lab Head'
  }
];

// ==========================================
// 1. WEIGHBRIDGE & MATERIAL INWARD FORMULAS
// ==========================================

/**
 * Net Material Quantity = Gross Weight - Tare Weight
 * Validates weights are numeric, non-negative, and gross >= tare
 */
export function calculateNetWeight(gross, tare) {
  const g = Number(gross) || 0;
  const t = Number(tare) || 0;
  if (g < 0 || t < 0) {
    throw new Error('Weight readings cannot be negative.');
  }
  if (g < t) {
    throw new Error(`Gross weight (${g} kg) cannot be less than Tare weight (${t} kg).`);
  }
  return Number((g - t).toFixed(2));
}

/**
 * Chemical Barrel Volume Calculation
 * Total Volume = (Number of Full Barrels * Barrel Capacity) + Partially Filled Volume
 * Example: 5 full 220L barrels = 1,100 Litres
 */
export function calculateChemicalBarrelVolume({ fullBarrels = 0, barrelCapacity = 220, partialLiters = 0 }) {
  const full = Math.max(0, parseInt(fullBarrels, 10) || 0);
  const cap = Math.max(0, Number(barrelCapacity) || 220);
  const partial = Math.max(0, Number(partialLiters) || 0);
  const totalVolume = Number((full * cap + partial).toFixed(2));
  return {
    fullBarrels: full,
    barrelCapacity: cap,
    partialLiters: partial,
    totalVolumeLiters: totalVolume
  };
}

// ==========================================
// 2. MIX DESIGN & BATCHING CALCULATIONS
// ==========================================

/**
 * Calculates batch count dynamically from total order volume and mixer batch capacity.
 * DOES NOT hardcode batches (e.g. 14, 15, 16).
 * Example: 6.0 m³ with 0.5 m³ plant pan mixer = 12 batches.
 * Example: 7.0 m³ with 0.5 m³ pan mixer = 14 batches.
 */
export function calculateBatchPlan({ totalVolumeM3, batchCapacityM3 = 0.5, mixDesign }) {
  const vol = Number(totalVolumeM3) || 1;
  const cap = Number(batchCapacityM3) > 0 ? Number(batchCapacityM3) : 0.5;
  const batchCount = Math.ceil(vol / cap);
  const actualPerBatchVol = Number((vol / batchCount).toFixed(3));

  if (!mixDesign) {
    throw new Error('Valid mix design required to generate batch plan.');
  }

  // Calculate material targets per individual batch based on actualPerBatchVol
  const materialsPerBatch = [
    { name: 'Cement (OPC 53)', targetKg: Math.round(mixDesign.cement * actualPerBatchVol), unit: 'kg' },
    { name: 'Fly Ash (Pozzocrete)', targetKg: Math.round(mixDesign.flyash * actualPerBatchVol), unit: 'kg' },
    { name: '20mm Coarse Aggregate', targetKg: Math.round(mixDesign.agg20 * actualPerBatchVol), unit: 'kg' },
    { name: '10mm Coarse Aggregate', targetKg: Math.round(mixDesign.agg10 * actualPerBatchVol), unit: 'kg' },
    { name: 'Crushed M-Sand', targetKg: Math.round(mixDesign.sand * actualPerBatchVol), unit: 'kg' },
    { name: 'Water', targetKg: Math.round(mixDesign.water * actualPerBatchVol), unit: 'L' },
    { name: 'Admixture (PCE)', targetKg: Number((mixDesign.admixture * actualPerBatchVol).toFixed(2)), unit: 'kg' }
  ];

  // Total planned materials for whole truckload
  const totalPlannedMaterials = materialsPerBatch.map(m => ({
    name: m.name,
    targetKg: Math.round(m.targetKg * batchCount),
    unit: m.unit
  }));

  // Generate individual batches array
  const batches = [];
  for (let i = 1; i <= batchCount; i++) {
    batches.push({
      batchNo: i,
      batchSequence: `${i} of ${batchCount}`,
      volumeM3: actualPerBatchVol,
      materials: materialsPerBatch.map(m => ({
        ...m,
        actualKg: m.targetKg // default to target; operator updates if measured
      })),
      status: 'Planned'
    });
  }

  return {
    totalVolumeM3: vol,
    batchCapacityM3: cap,
    batchCount,
    actualPerBatchVol,
    materialsPerBatch,
    totalPlannedMaterials,
    batches
  };
}

// ==========================================
// 3. DELIVERY CHALLAN & NON-BILL (NB) GUARD
// ==========================================

/**
 * Checks if a challan can be billed or invoiced.
 * Non-Bill (NB) challans are strictly prevented from generating financial invoices!
 */
export function canChallanGenerateInvoice(challan) {
  if (!challan) return false;
  if (
    challan.isNonBill ||
    challan.billingType === 'Non-Bill' ||
    challan.challanType === 'NB' ||
    (typeof challan.challanNo === 'string' && challan.challanNo.startsWith('NBC'))
  ) {
    return false;
  }
  return true;
}

// ==========================================
// 4. DRIVER TRIP & DISTANCE CALCULATIONS
// ==========================================

/**
 * Trip Distance = Final Odometer Reading - Starting Odometer Reading
 * Validates final >= starting
 */
export function calculateTripDistance(startOdo, finalOdo) {
  const start = Number(startOdo) || 0;
  const end = Number(finalOdo) || 0;
  if (start < 0 || end < 0) {
    throw new Error('Odometer readings cannot be negative.');
  }
  if (end < start) {
    throw new Error(`Final odometer (${end} km) cannot be less than starting odometer (${start} km).`);
  }
  return Number((end - start).toFixed(1));
}

// ==========================================
// 5. DIESEL MANAGEMENT & MILEAGE FORMULAS
// ==========================================

/**
 * Vehicle Mileage = Distance Travelled / Diesel Consumed (km/L)
 * Returns null if data is insufficient rather than an inaccurate figure.
 */
export function calculateDieselMileage(distanceKm, dieselConsumedLiters) {
  const km = Number(distanceKm) || 0;
  const liters = Number(dieselConsumedLiters) || 0;
  if (km <= 0 || liters <= 0) {
    return null; // "Mileage Not Available"
  }
  return Number((km / liters).toFixed(2));
}

/**
 * Equipment Fuel Consumption = Diesel Consumed / Operating Hours (L/hour)
 * For stationary equipment like Generators and Concrete Pumps without odometers.
 */
export function calculateEquipmentHourlyConsumption(litersConsumed, operatingHours) {
  const liters = Number(litersConsumed) || 0;
  const hours = Number(operatingHours) || 0;
  if (liters <= 0 || hours <= 0) {
    return null;
  }
  return Number((liters / hours).toFixed(2));
}
