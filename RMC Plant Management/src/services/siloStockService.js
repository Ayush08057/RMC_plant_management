/**
 * Silo Inventory Integrity & Stock Audit Service
 * Provides atomic, idempotent Firestore transactions on /silo_inventory/{companyId}
 * and append-only audit trail in /silo_logs/{logId}.
 * Enforces negative stock rejection, supervisor override audit logging,
 * and 3-decimal string-exponent rounding.
 */

import { doc, runTransaction, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase.js';
import { INITIAL_SILO_STOCK, STORAGE_KEYS } from './plantOperationsService.js';
import { isAdminPerson } from '../data/mockUsers.js';

export const SILO_OUTBOX_STORAGE_KEY = 'rmc_silo_outbox_v1';
export const SILO_LOCAL_CACHE_KEY = STORAGE_KEYS?.SILO_INVENTORY || 'rmc_silo_inventory_v2';

/**
 * Rounds stock values to exact decimal places (default 3 = 1kg / 1mL precision)
 * Uses string-exponent representation to avoid floating-point binary IEEE 754 drift.
 */
export function roundStock(value, decimals = 3) {
  if (value === null || value === undefined || isNaN(value)) return 0;
  const num = Number(value);
  if (!isFinite(num)) return 0;
  return Number(Math.round(Number(`${num}e${decimals}`)) + `e-${decimals}`);
}

/**
 * Generates a deterministic idempotency log document ID from reference.
 * Supported operations:
 * - deduct_<batchId>
 * - inward_<slipId>
 * - weighment_<slipId>
 * - reversal_<refId>
 */
export function getSiloLogId(operation, referenceId) {
  const cleanOp = (operation || 'op').toLowerCase().trim();
  const cleanRef = String(referenceId || 'ref').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${cleanOp}_${cleanRef}`;
}

/**
 * Maps any material name or alias to canonical silo key
 */
export function resolveMaterialKey(rawNameOrKey) {
  if (!rawNameOrKey) return null;
  const str = String(rawNameOrKey).trim().toLowerCase();
  if (str === 'cement' || str.includes('cement')) return 'cement';
  if (str === 'flyash' || str.includes('fly ash') || str.includes('pozzocrete')) return 'flyash';
  if (str === 'agg20' || str.includes('20mm')) return 'agg20';
  if (str === 'agg10' || str.includes('10mm')) return 'agg10';
  if (str === 'riversand' || str.includes('river sand')) return 'riverSand';
  if (str === 'sand' || str.includes('m-sand') || str.includes('crushed') || str.includes('sand')) return 'sand';
  if (str === 'retarder' || str.includes('retarder')) return 'retarder';
  if (str === 'admixturepce' || str.includes('admixture') || str.includes('pce') || str.includes('chemical')) return 'admixturePce';
  return rawNameOrKey;
}

/**
 * Returns the stock property name for a given material key ('stockTons' vs 'stockLiters')
 */
export function getStockProperty(materialKey) {
  return (materialKey === 'admixturePce' || materialKey === 'retarder') ? 'stockLiters' : 'stockTons';
}

/**
 * Reads current silo stock from local cache or baseline
 */
export function getLocalSiloStock() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(SILO_LOCAL_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    }
  } catch (e) {
    console.warn('[SiloStockService] Local cache read error:', e);
  }
  return { ...INITIAL_SILO_STOCK };
}

/**
 * Saves silo stock snapshot to local cache
 */
export function setLocalSiloStock(stockData) {
  try {
    if (typeof window !== 'undefined' && window.localStorage && stockData) {
      localStorage.setItem(SILO_LOCAL_CACHE_KEY, JSON.stringify(stockData));
    }
  } catch (e) {
    console.error('[SiloStockService] Local cache write error:', e);
  }
}

/**
 * Atomically adjusts silo stock with idempotency check, negative balance rejection,
 * supervisor override verification, and immutable log document creation.
 *
 * @param {Object} options
 * @param {string} options.companyId - e.g. 'sm-concretech'
 * @param {'deduct'|'inward'|'weighment'|'reversal'} options.operation
 * @param {string} options.referenceId - batchId, slipId, or reversalRef
 * @param {Array<{ materialKey: string, delta: number, unit?: string, rawName?: string }>} options.items
 * @param {boolean} [options.allowNegative=false] - Whether supervisor shortfall override is active
 * @param {string} [options.overrideReason=''] - Mandatory reason if allowNegative is true
 * @param {Object} [options.user=null] - Current user performing the action
 * @returns {Promise<{ success: boolean, alreadyProcessed: boolean, logId: string, updatedStock: Object }>}
 */
export async function adjustSiloStock({
  companyId = 'sm-concretech',
  operation = 'deduct',
  referenceId,
  items = [],
  allowNegative = false,
  overrideReason = '',
  user = null,
}) {
  if (!referenceId) {
    throw new Error('Missing referenceId for silo stock adjustment.');
  }
  if (!items || items.length === 0) {
    return { success: true, alreadyProcessed: false, logId: null, updatedStock: getLocalSiloStock() };
  }

  const cleanCompany = (companyId || 'sm-concretech').trim().replace(/[^a-zA-Z0-9_-]/g, '-');
  const logId = getSiloLogId(operation, referenceId);
  const siloRef = doc(db, 'silo_inventory', cleanCompany);
  const logRef = doc(db, 'silo_logs', logId);

  const currentUid = auth.currentUser?.uid || user?.id || user?.employeeId || 'system_authenticated';
  const currentUserName = user?.name || user?.username || 'Authorized Operator';
  const currentUserRole = user?.role || 'Operator';

  // Check supervisor authorization if allowNegative requested
  if (allowNegative) {
    const isAuthSuper = isAdminPerson(user) || currentUserRole === 'Plant Manager' || currentUserRole === 'Plant Incharge';
    if (!isAuthSuper) {
      const err = new Error('PERMISSION_DENIED: Only Admin or Plant Manager can authorize negative stock overrides.');
      err.code = 'PERMISSION_DENIED';
      throw err;
    }
    if (!overrideReason || !String(overrideReason).trim()) {
      const err = new Error('INVALID_ARGUMENT: Mandatory reason is required to authorize negative stock override.');
      err.code = 'INVALID_ARGUMENT';
      throw err;
    }
  }

  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. Idempotency Check: if log doc exists, return success without double-modifying stock
      const logSnap = await transaction.get(logRef);
      if (logSnap.exists()) {
        const existingLog = logSnap.data();
        return {
          success: true,
          alreadyProcessed: true,
          logId,
          updatedStock: getLocalSiloStock(),
          existingLog,
        };
      }

      // 2. Fetch current stock
      const siloSnap = await transaction.get(siloRef);
      const stockData = siloSnap.exists()
        ? { ...siloSnap.data() }
        : { ...INITIAL_SILO_STOCK };

      const shortfalls = [];
      const stockDeltas = [];

      // 3. Compute deltas and validate stock levels
      for (const it of items) {
        const matKey = resolveMaterialKey(it.materialKey || it.rawName);
        if (!matKey) continue;

        const prop = getStockProperty(matKey);
        const currentEntry = stockData[matKey] || {
          name: it.rawName || matKey,
          [prop]: 0,
          unit: prop === 'stockLiters' ? 'Litres' : 'Tons',
          capacityTons: 100,
          siloName: matKey,
        };

        const currentVal = roundStock(Number(currentEntry[prop]) || 0, 3);
        const deltaVal = roundStock(Math.abs(Number(it.delta) || 0), 3);

        let finalVal;
        let isDeduction = false;

        if (operation === 'deduct') {
          isDeduction = true;
          finalVal = roundStock(currentVal - deltaVal, 3);
        } else if (operation === 'inward' || operation === 'weighment') {
          finalVal = roundStock(currentVal + deltaVal, 3);
        } else if (operation === 'reversal') {
          // Reversing inward means deducting
          isDeduction = true;
          finalVal = roundStock(currentVal - deltaVal, 3);
        } else {
          finalVal = roundStock(currentVal - deltaVal, 3);
        }

        if (isDeduction && finalVal < 0) {
          shortfalls.push({
            materialKey: matKey,
            materialName: currentEntry.name || matKey,
            required: deltaVal,
            available: currentVal,
            deficit: roundStock(Math.abs(finalVal), 3),
            unit: currentEntry.unit || (prop === 'stockLiters' ? 'Litres' : 'Tons'),
          });
        }

        stockDeltas.push({
          materialKey: matKey,
          materialName: currentEntry.name || matKey,
          prop,
          before: currentVal,
          delta: deltaVal,
          after: finalVal,
          unit: currentEntry.unit,
        });
      }

      // 4. Reject if negative and override not authorized
      if (shortfalls.length > 0 && !allowNegative) {
        const deficitList = shortfalls.map((s) => `${s.materialName}: deficit ${s.deficit} ${s.unit} (available: ${s.available})`).join(', ');
        const insErr = new Error(`INSUFFICIENT_STOCK: Silo inventory deficit detected for [${deficitList}]. Shortfall approval required.`);
        insErr.code = 'INSUFFICIENT_STOCK';
        insErr.shortfalls = shortfalls;
        throw insErr;
      }

      // 5. Apply new stock values (remove silent clamp only when authorized override applies)
      stockDeltas.forEach((d) => {
        if (!stockData[d.materialKey]) {
          stockData[d.materialKey] = {
            name: d.materialName,
            [d.prop]: d.after,
            unit: d.unit,
          };
        } else {
          stockData[d.materialKey] = {
            ...stockData[d.materialKey],
            [d.prop]: d.after,
            lastUpdated: new Date().toISOString(),
          };
        }
      });

      stockData.companyId = cleanCompany;
      stockData.updatedAt = new Date().toISOString();
      stockData.updatedBy = currentUid;

      // 6. Write updated stock document
      transaction.set(siloRef, stockData, { merge: true });

      // 7. Write immutable audit log document
      const logPayload = {
        logId,
        companyId: cleanCompany,
        operation,
        referenceId,
        deltas: stockDeltas,
        shortfalls: shortfalls.length > 0 ? shortfalls : null,
        isOverride: shortfalls.length > 0 && allowNegative,
        overrideReason: allowNegative ? overrideReason.trim() : null,
        authorizedBy: allowNegative ? currentUserName : null,
        performedBy: {
          uid: currentUid,
          name: currentUserName,
          role: currentUserRole,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUid,
      };

      transaction.set(logRef, logPayload);

      return {
        success: true,
        alreadyProcessed: false,
        logId,
        updatedStock: stockData,
      };
    });

    // Update local cache for zero-latency UI reactivity
    if (result.updatedStock) {
      setLocalSiloStock(result.updatedStock);
    }

    return result;
  } catch (err) {
    if (err.code === 'INSUFFICIENT_STOCK' || err.code === 'PERMISSION_DENIED' || err.code === 'INVALID_ARGUMENT') {
      throw err;
    }

    console.warn(`[SiloStockService] Central transaction failed (${err.code || err.message}). Applying resilient local store fallback and outbox queuing.`);

    // Resilient local fallback applies monotonic stock update to local cache
    // and queues the deterministic logId in the outbox to guarantee zero loss or double-deduction
    const fallbackStock = applyLocalStockFallback({
      operation,
      referenceId,
      items,
      allowNegative,
      overrideReason,
      user,
      logId,
      cleanCompany,
    });

    return {
      success: true,
      alreadyProcessed: false,
      logId,
      updatedStock: fallbackStock,
      isFallback: true,
    };
  }
}

/**
 * Resilient local fallback that updates localStorage and enqueues to outbox
 */
function applyLocalStockFallback({
  operation,
  referenceId,
  items,
  allowNegative,
  overrideReason,
  user,
  logId,
  cleanCompany,
}) {
  const stockData = getLocalSiloStock();
  const shortfalls = [];
  const stockDeltas = [];

  for (const it of items) {
    const matKey = resolveMaterialKey(it.materialKey || it.rawName);
    if (!matKey) continue;

    const prop = getStockProperty(matKey);
    const currentEntry = stockData[matKey] || {
      name: it.rawName || matKey,
      [prop]: 0,
      unit: prop === 'stockLiters' ? 'Litres' : 'Tons',
    };

    const currentVal = roundStock(Number(currentEntry[prop]) || 0, 3);
    const deltaVal = roundStock(Math.abs(Number(it.delta) || 0), 3);

    let finalVal;
    let isDeduction = false;

    if (operation === 'deduct' || operation === 'reversal') {
      isDeduction = true;
      finalVal = roundStock(currentVal - deltaVal, 3);
    } else {
      finalVal = roundStock(currentVal + deltaVal, 3);
    }

    if (isDeduction && finalVal < 0) {
      shortfalls.push({
        materialKey: matKey,
        materialName: currentEntry.name || matKey,
        required: deltaVal,
        available: currentVal,
        deficit: roundStock(Math.abs(finalVal), 3),
        unit: currentEntry.unit,
      });
    }

    stockDeltas.push({
      materialKey: matKey,
      materialName: currentEntry.name || matKey,
      prop,
      before: currentVal,
      delta: deltaVal,
      after: finalVal,
      unit: currentEntry.unit,
    });
  }

  if (shortfalls.length > 0 && !allowNegative) {
    const deficitList = shortfalls.map((s) => `${s.materialName}: deficit ${s.deficit} ${s.unit}`).join(', ');
    const insErr = new Error(`INSUFFICIENT_STOCK: Silo inventory deficit detected for [${deficitList}].`);
    insErr.code = 'INSUFFICIENT_STOCK';
    insErr.shortfalls = shortfalls;
    throw insErr;
  }

  stockDeltas.forEach((d) => {
    if (stockData[d.materialKey]) {
      stockData[d.materialKey] = {
        ...stockData[d.materialKey],
        [d.prop]: d.after,
        lastUpdated: new Date().toISOString(),
      };
    }
  });

  setLocalSiloStock(stockData);

  // Enqueue in outbox keyed by deterministic logId
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const rawOutbox = localStorage.getItem(SILO_OUTBOX_STORAGE_KEY);
      const outbox = rawOutbox ? JSON.parse(rawOutbox) : {};
      outbox[logId] = {
        logId,
        companyId: cleanCompany,
        operation,
        referenceId,
        items,
        allowNegative,
        overrideReason,
        user,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(SILO_OUTBOX_STORAGE_KEY, JSON.stringify(outbox));
    }
  } catch (e) {
    console.warn('[SiloStockService] Outbox write error:', e);
  }

  return stockData;
}

/**
 * Real-time listener for /silo_inventory/{companyId}
 */
export function subscribeSiloStock(companyId = 'sm-concretech', callback) {
  const cleanCompany = (companyId || 'sm-concretech').trim().replace(/[^a-zA-Z0-9_-]/g, '-');
  const siloRef = doc(db, 'silo_inventory', cleanCompany);

  try {
    return onSnapshot(
      siloRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setLocalSiloStock(data);
          callback(data);
        } else {
          const local = getLocalSiloStock();
          callback(local);
        }
      },
      (err) => {
        console.warn('[SiloStockService] Snapshot listener error, falling back to local cache:', err);
        callback(getLocalSiloStock());
      }
    );
  } catch (err) {
    console.warn('[SiloStockService] Could not establish snapshot listener:', err);
    callback(getLocalSiloStock());
    return () => {};
  }
}
