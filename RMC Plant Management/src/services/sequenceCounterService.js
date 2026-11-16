/**
 * Atomic Sequence Counter Service for Cash Memos and Delivery Challans
 * Uses Firestore transactions on counters/{companyId}_{type}_{financialYear}
 * Enforces dynamic/config-driven financial years, atomic +1 increment,
 * and maintains audit records for any voided allocations.
 */

import { doc, runTransaction, setDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../config/firebase.js';

// Configuration keys for Financial Year & Starting Sequences
export const COUNTER_CONFIG_KEYS = {
  FINANCIAL_YEAR: 'rmc_config_financial_year',
  STARTING_CASH_MEMO: 'rmc_config_starting_cash_memo',
  STARTING_CHALLAN_DC: 'rmc_config_starting_challan_dc',
  STARTING_CHALLAN_NBC: 'rmc_config_starting_challan_nbc',
};

// Default Fallback Starting Values (preserves current numbering baseline without collisions)
export const DEFAULT_COUNTER_STARTING = {
  CASH_MEMO: 115,
  CHALLAN_DC: 1421,
  CHALLAN_NBC: 101,
};

/**
 * Returns active Financial Year in Indian format (YY-(YY+1), e.g. '25-26')
 * Config-driven first; falls back to current calendar FY if not explicitly configured.
 */
export function getActiveFinancialYear(date = new Date()) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const configuredFy = localStorage.getItem(COUNTER_CONFIG_KEYS.FINANCIAL_YEAR);
      if (configuredFy && configuredFy.trim()) {
        return configuredFy.trim();
      }
    }
  } catch {}

  // Default to 25-26 until CA confirms transition to 26-27 series
  // If dynamic calculation desired when config unset:
  const d = date instanceof Date ? date : new Date(date);
  const month = d.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr
  const fullYear = d.getFullYear();
  
  // By default, preserve 25-26 if explicitly before April 2027 or if configured
  if (fullYear === 2025 || (fullYear === 2026 && month < 3)) {
    return '24-25';
  }
  // Standard 25-26 series
  return '25-26';
}

/**
 * Allows dynamic runtime override of the Financial Year
 */
export function setConfiguredFinancialYear(fyString) {
  if (typeof window !== 'undefined' && window.localStorage && fyString) {
    localStorage.setItem(COUNTER_CONFIG_KEYS.FINANCIAL_YEAR, String(fyString).trim());
  }
}

/**
 * Formats a sequence number guaranteed to be <= 16 characters.
 * E.g., '25-26/116' (9 chars)
 * E.g., 'DC-25-26/1422' (14 chars)
 * E.g., 'NBC-25-26/102' (14 chars)
 */
export function formatSequenceNumber({ type, prefix = '', financialYear, sequenceNumber }) {
  const fy = financialYear || getActiveFinancialYear();
  const num = String(sequenceNumber).trim();
  if (type === 'cash_memos') {
    return `${fy}/${num}`;
  }
  const pref = prefix ? `${prefix}-` : 'DC-';
  return `${pref}${fy}/${num}`;
}

/**
 * Atomically allocates the next sequential number via Firestore transaction.
 * @param {Object} options
 * @param {string} options.type - 'cash_memos' | 'delivery_challans' | 'nonbill_challans'
 * @param {string} options.companyId - Company tenant id (default: 'sm-concretech')
 * @param {string} options.prefix - Prefix for challans, e.g. 'DC' or 'NBC'
 * @param {number} options.startingValue - Initial number if counter doc does not exist
 * @returns {Promise<{ sequenceNumber: string, sequenceValue: number, financialYear: string, counterDocId: string }>}
 */
export async function allocateNextSequenceNumber({
  type = 'cash_memos',
  companyId = 'sm-concretech',
  prefix = '',
  startingValue = null,
}) {
  const fy = getActiveFinancialYear();
  const cleanCompany = (companyId || 'sm-concretech').trim().replace(/[^a-zA-Z0-9_-]/g, '-');
  const counterDocId = `${cleanCompany}_${type}_${fy}`;
  const counterRef = doc(db, 'counters', counterDocId);

  const fallbackStart = startingValue !== null && startingValue !== undefined
    ? Number(startingValue)
    : (type === 'cash_memos'
        ? DEFAULT_COUNTER_STARTING.CASH_MEMO
        : (prefix === 'NBC' ? DEFAULT_COUNTER_STARTING.CHALLAN_NBC : DEFAULT_COUNTER_STARTING.CHALLAN_DC));

  const currentUid = auth.currentUser?.uid || 'system_authenticated';

  try {
    const allocated = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      let nextVal;

      if (!counterSnap.exists()) {
        nextVal = fallbackStart;
        transaction.set(counterRef, {
          companyId: cleanCompany,
          type,
          financialYear: fy,
          lastValue: nextVal,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: currentUid,
        });
      } else {
        const data = counterSnap.data() || {};
        const currentVal = typeof data.lastValue === 'number' ? data.lastValue : fallbackStart;
        nextVal = currentVal + 1;
        transaction.update(counterRef, {
          lastValue: nextVal,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUid,
        });
      }

      const formattedNumber = formatSequenceNumber({
        type,
        prefix,
        financialYear: fy,
        sequenceNumber: nextVal,
      });

      return {
        sequenceNumber: formattedNumber,
        sequenceValue: nextVal,
        financialYear: fy,
        counterDocId,
      };
    });

    return allocated;
  } catch (err) {
    console.error(`[SequenceCounter] Atomic counter failed for ${counterDocId}:`, err);
    const counterError = new Error(
      `COUNTER_UNAVAILABLE: Unable to connect to central counter server (${err.message}). ` +
      `Internet connection is required to allocate official sequential numbering.`
    );
    counterError.code = 'COUNTER_UNAVAILABLE';
    counterError.originalError = err;
    throw counterError;
  }
}

/**
 * Records a voided sequence number if document creation fails after allocation,
 * preventing silent gaps in sequential audit logs.
 */
export async function recordVoidedSequenceNumber({
  companyId = 'sm-concretech',
  type = 'cash_memos',
  financialYear = null,
  sequenceNumber,
  reason = 'Save operation aborted or failed',
}) {
  if (!sequenceNumber) return;
  const fy = financialYear || getActiveFinancialYear();
  const cleanCompany = (companyId || 'sm-concretech').trim().replace(/[^a-zA-Z0-9_-]/g, '-');
  const voidDocRef = doc(db, 'counters', `${cleanCompany}_voided_${fy}`);

  try {
    const currentUid = auth.currentUser?.uid || 'system';
    await setDoc(
      voidDocRef,
      {
        companyId: cleanCompany,
        financialYear: fy,
        type,
        voidedNumbers: arrayUnion({
          sequenceNumber,
          reason,
          voidedAt: new Date().toISOString(),
          voidedBy: currentUid,
        }),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[SequenceCounter] Failed to record voided sequence:', e);
  }
}
