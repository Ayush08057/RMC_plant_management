/**
 * Real-Time Cloud Synchronization Service for SM CONCRETECH ERP
 * Enables instant cross-device data synchronization across Laptops, Desktops, Tablets, and Mobile phones.
 * 
 * Synchronizes:
 * - Billing, Cash Memos & Payment Histories
 * - Batching Sheets (SCADA actuals & tickets)
 * - Delivery Challans & Gate Passes
 * - Driver & Transit Mixer Trips
 * - Diesel & Fuel Dispensation
 * - Weighbridge Gross-Tare-Net Tickets
 * - Vehicle Fleet & Equipment
 */

import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { sanitizeForFirestore } from './firestoreService.js';

// Default company scope
const DEFAULT_COMPANY_SCOPE = 'sm-concretech';

function resolveSyncScope() {
  try {
    const activeCompanyId = localStorage.getItem('rmc_active_company_v1');
    if (activeCompanyId && typeof activeCompanyId === 'string' && activeCompanyId.trim()) {
      return activeCompanyId.trim();
    }
  } catch {
    // fallback
  }
  return DEFAULT_COMPANY_SCOPE;
}

/**
 * Returns the clean partitioned plant-sync collection path (`plantSync_<companyId>`)
 */
export function getSyncCollectionName() {
  return `plantSync_${resolveSyncScope()}`;
}

/**
 * Legacy collection path used prior to separation from hrSettings
 */
export function getLegacySyncCollectionName() {
  return `hrSettings_${resolveSyncScope()}`;
}

/**
 * Checks if a store record is a legacy dummy/test entry
 */
export function isDummyStoreItem(item) {
  if (!item) return true;
  // Strictly filter only items that are explicitly flagged as mock/dummy test entries
  if (item.isMock === true || item.isDummy === true) return true;
  if (typeof item.id === 'string' && (item.id.startsWith('DUMMY-') || item.id.startsWith('MOCK-'))) return true;
  return false;
}

/**
 * Records an item ID as explicitly deleted to prevent resurrection by cross-device sync
 */
export function markItemAsDeleted(localKey, itemId) {
  if (!localKey || !itemId) return;
  try {
    const delKey = `${localKey}_deleted_ids`;
    const raw = localStorage.getItem(delKey);
    const set = new Set(raw ? JSON.parse(raw) : []);
    set.add(String(itemId).trim().toLowerCase());
    localStorage.setItem(delKey, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Returns set of deleted IDs for a given store
 */
export function getDeletedItemIds(localKey) {
  if (!localKey) return new Set();
  try {
    const delKey = `${localKey}_deleted_ids`;
    const raw = localStorage.getItem(delKey);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

/**
 * Checks if an item has been deleted
 */
export function isItemDeleted(item, deletedIds) {
  if (!item || !deletedIds || deletedIds.size === 0) return false;
  const id = item.id ? String(item.id).trim().toLowerCase() : '';
  const billNo = item.billNo ? String(item.billNo).trim().toLowerCase() : '';
  const voucherNo = item.voucherNo ? String(item.voucherNo).trim().toLowerCase() : '';
  return (id && deletedIds.has(id)) || (billNo && deletedIds.has(billNo)) || (voucherNo && deletedIds.has(voucherNo));
}

/**
 * Strips all legacy dummy records from an item array
 */
export function sanitizeStoreItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => !isDummyStoreItem(item));
}

/**
 * Subscribes to a shared cloud document with real-time updates and local caching
 * @param {string} docKey - e.g. 'cloud_billing_bills'
 * @param {string} localKey - localStorage key for local cache
 * @param {any} initialDefault - fallback if no data in cloud or local
 * @param {function} onDataUpdated - callback invoked whenever cloud updates
 * @returns {function} unsubscribe function
 */
export function subscribeCloudStore(docKey, localKeyOrCb, initialDefault = [], onDataUpdated = null) {
  // Support 2-arg call signature: subscribeCloudStore(storageKey, callback)
  const localKey = typeof localKeyOrCb === 'function' ? docKey : localKeyOrCb;
  const resolvedDefault = typeof localKeyOrCb === 'function' ? [] : initialDefault;
  const callback = typeof localKeyOrCb === 'function' ? localKeyOrCb : (onDataUpdated || (() => {}));

  const primaryCollection = getSyncCollectionName();
  const legacyCollection = getLegacySyncCollectionName();
  const primaryRef = doc(db, primaryCollection, docKey);
  const legacyRef = doc(db, legacyCollection, docKey);

  let isMounted = true;

  // 1. First load from local storage if available and sanitize immediately
  const deletedIds = getDeletedItemIds(localKey);
  let localData = resolvedDefault;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawLocal = localStorage.getItem(localKey);
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        localData = Array.isArray(parsed)
          ? sanitizeStoreItems(parsed).filter((it) => !isItemDeleted(it, deletedIds))
          : parsed;
        if (Array.isArray(parsed) && localData.length !== parsed.length) {
          localStorage.setItem(localKey, JSON.stringify(localData));
        }
      }
    } catch (e) {
      console.warn(`[CloudSync] Local read error for ${localKey}:`, e);
    }
  }

  const applyCloudPayload = (cloudPayload) => {
    if (!cloudPayload || cloudPayload.items === undefined) return null;
    const cleanItems = (Array.isArray(cloudPayload.items)
      ? sanitizeStoreItems(cloudPayload.items)
      : cloudPayload.items).filter((it) => !isItemDeleted(it, deletedIds));

    let currentLocal = localData;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) currentLocal = JSON.parse(raw);
      } catch {}
    }
    const merged = mergeCollectionItems(currentLocal, cleanItems).filter((it) => !isItemDeleted(it, deletedIds));
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(localKey, JSON.stringify(merged));
      } catch {}
    }
    callback(merged);
    return merged;
  };

  // 2. Fetch from plantSync_* first; auto-migrate / fallback cleanly to legacy hrSettings_* if needed
  getDoc(primaryRef)
    .then(async (snap) => {
      if (!isMounted) return;
      if (snap.exists() && applyCloudPayload(snap.data()) !== null) {
        return;
      }

      // Check legacy hrSettings_* collection for prior operational records and auto-migrate cleanly
      try {
        const legacySnap = await getDoc(legacyRef);
        if (!isMounted) return;
        if (legacySnap.exists()) {
          const migrated = applyCloudPayload(legacySnap.data());
          if (migrated !== null) {
            setDoc(primaryRef, {
              items: migrated,
              updatedAt: Date.now(),
              source: 'auto_migrated_from_hrSettings'
            }, { merge: true }).catch(() => {});
            return;
          }
        }
      } catch {}

      if (Array.isArray(localData) && localData.length > 0) {
        const cleanLocal = sanitizeStoreItems(localData).filter((it) => !isItemDeleted(it, deletedIds));
        if (cleanLocal.length > 0) {
          try {
            await setDoc(primaryRef, {
              items: cleanLocal,
              updatedAt: Date.now(),
              source: 'initial_device_seed'
            }, { merge: true });
          } catch {
            // Fall back to legacy collection if rules for plantSync_* have not been published yet
            setDoc(legacyRef, {
              items: cleanLocal,
              updatedAt: Date.now(),
              source: 'initial_device_seed_fallback'
            }, { merge: true }).catch(() => {});
          }
        }
      }
    })
    .catch(async () => {
      // Fallback read when plantSync_* is not yet permitted by deployed rules
      try {
        const legacySnap = await getDoc(legacyRef);
        if (isMounted && legacySnap.exists()) {
          applyCloudPayload(legacySnap.data());
        }
      } catch (err) {
        console.warn(`[CloudSync] Initial fetch error for ${docKey}:`, err.message);
      }
    });

  // 3. Real-time subscription with seamless fallback to legacy collection on permission-denied
  let unsubPrimary = () => {};
  let unsubLegacy = () => {};
  try {
    unsubPrimary = onSnapshot(
      primaryRef,
      (docSnap) => {
        if (isMounted && docSnap.exists()) {
          applyCloudPayload(docSnap.data());
        }
      },
      (err) => {
        console.warn(`[CloudSync] Primary listener notice for ${docKey}:`, err.message);
        if (err?.code === 'permission-denied' || String(err?.message || '').toLowerCase().includes('permission')) {
          try {
            unsubLegacy = onSnapshot(
              legacyRef,
              (legacySnap) => {
                if (isMounted && legacySnap.exists()) {
                  applyCloudPayload(legacySnap.data());
                }
              },
              () => {}
            );
          } catch {}
        }
      }
    );
  } catch (subErr) {
    console.warn(`[CloudSync] Subscription setup error for ${docKey}:`, subErr);
  }

  return () => {
    isMounted = false;
    if (typeof unsubPrimary === 'function') unsubPrimary();
    if (typeof unsubLegacy === 'function') unsubLegacy();
  };
}

/**
 * Smart concurrency merge: merges local and cloud collections by unique entity ID and timestamp
 * Prevents stale local state from silently overwriting newer cloud records added by other devices.
 * 
 * @param {Array|Object} localItems 
 * @param {Array|Object} cloudItems 
 * @returns {Array|Object} Merged and deduplicated collection
 */
export function mergeCollectionItems(localItems, cloudItems) {
  if (!Array.isArray(localItems) && !Array.isArray(cloudItems)) {
    if (typeof localItems === 'object' && typeof cloudItems === 'object') {
      return { ...(cloudItems || {}), ...(localItems || {}) };
    }
    return localItems !== undefined ? localItems : cloudItems;
  }

  const lList = Array.isArray(localItems) ? localItems : [];
  const cList = Array.isArray(cloudItems) ? cloudItems : [];

  const itemMap = new Map();

  const getItemKey = (item, idx) => {
    if (!item) return `idx_${idx}`;
    return String(
      item.id ||
      item.billNo ||
      item.dispatchId ||
      item.tripId ||
      item.challanNo ||
      item.slipNo ||
      item.sheetNo ||
      item.invoiceNo ||
      item.key ||
      (item.vehicleNo && item.date && item.time ? `${item.vehicleNo}_${item.date}_${item.time}` : '') ||
      `idx_${idx}`
    );
  };

  const getItemTimestamp = (item) => {
    if (!item) return 0;
    const ts = item.updatedAt || item.timestamp || item.createdAt || item.date;
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') {
      const parsed = Date.parse(ts);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  };

  // 1. Seed with existing cloud records
  cList.forEach((cItem, idx) => {
    if (!cItem) return;
    const key = getItemKey(cItem, idx);
    itemMap.set(key, cItem);
  });

  // 2. Merge local records:
  // - Retains items unique to local
  // - Retains items unique to cloud (added concurrently on another terminal)
  // - For items in both, selects the newer revision
  lList.forEach((lItem, idx) => {
    if (!lItem) return;
    const key = getItemKey(lItem, idx);
    if (!itemMap.has(key)) {
      itemMap.set(key, lItem);
    } else {
      const existingCloud = itemMap.get(key);
      const lTime = getItemTimestamp(lItem);
      const cTime = getItemTimestamp(existingCloud);
      if (lTime >= cTime) {
        itemMap.set(key, { ...existingCloud, ...lItem });
      } else {
        itemMap.set(key, { ...lItem, ...existingCloud });
      }
    }
  });

  return Array.from(itemMap.values());
}

/**
 * Pushes updated data to Cloud Firestore and updates local cache with smart concurrency merge
 * @param {string} docKey - e.g. 'cloud_billing_bills'
 * @param {string} localKey - localStorage key
 * @param {any} data - array or object to save
 */
export async function pushCloudStore(docKey, localKeyOrData, dataArg) {
  // Support both 3-arg pushCloudStore(docKey, localKey, data) and 2-arg pushCloudStore(storageKey, data)
  const localKey = dataArg === undefined ? docKey : localKeyOrData;
  const rawData = dataArg === undefined ? localKeyOrData : dataArg;

  const deletedIds = getDeletedItemIds(localKey);
  const cleanData = Array.isArray(rawData)
    ? sanitizeStoreItems(rawData).filter((it) => !isItemDeleted(it, deletedIds))
    : rawData;

  // 1. Immediately update localStorage for zero latency
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(localKey, JSON.stringify(cleanData));
    } catch (e) {
      console.error(`[CloudSync] Local cache write error for ${localKey}:`, e);
    }
  }

  const mergeWithDocRef = async (ref, dataToMerge) => {
    if (!Array.isArray(dataToMerge)) return dataToMerge;
    try {
      const cloudSnap = await getDoc(ref);
      if (cloudSnap.exists()) {
        const cloudPayload = cloudSnap.data();
        if (cloudPayload && Array.isArray(cloudPayload.items)) {
          const cleanCloud = sanitizeStoreItems(cloudPayload.items).filter((it) => !isItemDeleted(it, deletedIds));
          return mergeCollectionItems(dataToMerge, cleanCloud).filter((it) => !isItemDeleted(it, deletedIds));
        }
      }
    } catch {}
    return dataToMerge;
  };

  // 2. Persist to partitioned plantSync_* first; fall back seamlessly to hrSettings_* if rules aren't updated yet
  const primaryRef = doc(db, getSyncCollectionName(), docKey);
  const legacyRef = doc(db, getLegacySyncCollectionName(), docKey);
  const companyScope = resolveSyncScope();
  try {
    let finalPayload = await mergeWithDocRef(primaryRef, cleanData);
    const cleanPayload = sanitizeForFirestore(finalPayload);
    await setDoc(primaryRef, {
      id: docKey,
      nodeKey: docKey,
      companyId: companyScope,
      items: cleanPayload,
      updatedAt: Date.now(),
      updatedAtIso: new Date().toISOString(),
      source: 'web_client_sync'
    }, { merge: true });

    if (Array.isArray(finalPayload) && typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(localKey, JSON.stringify(finalPayload));
      } catch {}
    }
  } catch (err) {
    try {
      const legacyPayload = await mergeWithDocRef(legacyRef, cleanData);
      const cleanLegacyPayload = sanitizeForFirestore(legacyPayload);
      await setDoc(legacyRef, {
        id: docKey,
        nodeKey: docKey,
        companyId: companyScope,
        items: cleanLegacyPayload,
        updatedAt: Date.now(),
        updatedAtIso: new Date().toISOString(),
        source: 'web_client_sync_fallback'
      }, { merge: true });
    } catch (fallbackErr) {
      console.warn(`[CloudSync] Cloud push error for ${docKey}:`, err?.message || fallbackErr?.message);
    }
  }
}
