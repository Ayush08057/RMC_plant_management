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

// Default company scope
const DEFAULT_COMPANY_SCOPE = 'sm-concretech';

/**
 * Returns the scoped collection path allowed by Firestore security rules
 */
export function getSyncCollectionName() {
  try {
    const activeCompanyId = localStorage.getItem('rmc_active_company_v1');
    if (activeCompanyId && (activeCompanyId === 'sm-concretech-unit-2' || activeCompanyId === 'sm-infra-projects')) {
      return `hrSettings_${activeCompanyId}`;
    }
  } catch {
    // fallback
  }
  return `hrSettings_${DEFAULT_COMPANY_SCOPE}`;
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
export function subscribeCloudStore(docKey, localKey, initialDefault, onDataUpdated) {
  const collectionName = getSyncCollectionName();
  const docRef = doc(db, collectionName, docKey);

  let isMounted = true;

  // 1. First load from local storage if available and sanitize immediately
  const deletedIds = getDeletedItemIds(localKey);
  let localData = initialDefault;
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

  // 2. Fetch initial cloud data & purge dummy from cloud
  getDoc(docRef)
    .then(async (snap) => {
      if (!isMounted) return;

      if (snap.exists()) {
        const cloudPayload = snap.data();
        if (cloudPayload && cloudPayload.items !== undefined) {
          const cleanItems = (Array.isArray(cloudPayload.items)
            ? sanitizeStoreItems(cloudPayload.items)
            : cloudPayload.items).filter((it) => !isItemDeleted(it, deletedIds));
          
          // Merge local cache with cloud items so local unsynced records are never discarded
          const merged = mergeCollectionItems(localData, cleanItems).filter((it) => !isItemDeleted(it, deletedIds));
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              localStorage.setItem(localKey, JSON.stringify(merged));
            } catch {}
          }
          onDataUpdated(merged);
          return;
        }
      }

      // If cloud is empty and localData has only clean valid items, push clean localData
      if (Array.isArray(localData) && localData.length > 0) {
        const cleanLocal = sanitizeStoreItems(localData).filter((it) => !isItemDeleted(it, deletedIds));
        if (cleanLocal.length > 0) {
          try {
            await setDoc(docRef, {
              items: cleanLocal,
              updatedAt: Date.now(),
              source: 'initial_device_seed'
            }, { merge: true });
          } catch (uploadErr) {
            console.warn(`[CloudSync] Seed error for ${docKey}:`, uploadErr.message);
          }
        }
      }
    })
    .catch((err) => {
      console.warn(`[CloudSync] Initial fetch error for ${docKey}:`, err.message);
    });

  // 3. Real-time subscription to cloud changes from other devices
  let unsub = () => {};
  try {
    unsub = onSnapshot(docRef, (docSnap) => {
      if (!isMounted) return;
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.items !== undefined) {
          const activeDeletedIds = getDeletedItemIds(localKey);
          const cleanItems = (Array.isArray(data.items)
            ? sanitizeStoreItems(data.items)
            : data.items).filter((it) => !isItemDeleted(it, activeDeletedIds));
          let currentLocal = [];
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              const raw = localStorage.getItem(localKey);
              if (raw) currentLocal = JSON.parse(raw);
            } catch {}
          }
          const merged = mergeCollectionItems(currentLocal, cleanItems).filter((it) => !isItemDeleted(it, activeDeletedIds));
          try {
            localStorage.setItem(localKey, JSON.stringify(merged));
          } catch {}
          onDataUpdated(merged);
        }
      }
    }, (err) => {
      console.warn(`[CloudSync] Real-time listener notice for ${docKey}:`, err.message);
    });
  } catch (subErr) {
    console.warn(`[CloudSync] Subscription setup error for ${docKey}:`, subErr);
  }

  return () => {
    isMounted = false;
    if (typeof unsub === 'function') unsub();
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
export async function pushCloudStore(docKey, localKey, data) {
  const deletedIds = getDeletedItemIds(localKey);
  const cleanData = Array.isArray(data)
    ? sanitizeStoreItems(data).filter((it) => !isItemDeleted(it, deletedIds))
    : data;

  // 1. Immediately update localStorage for zero latency
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(localKey, JSON.stringify(cleanData));
    } catch (e) {
      console.error(`[CloudSync] Local cache write error for ${localKey}:`, e);
    }
  }

  // 2. Persist to Firestore with smart concurrency merge
  try {
    const collectionName = getSyncCollectionName();
    const docRef = doc(db, collectionName, docKey);

    let finalPayload = cleanData;

    // Concurrency protection: fetch latest cloud snapshot before overwrite
    if (Array.isArray(cleanData)) {
      try {
        const cloudSnap = await getDoc(docRef);
        if (cloudSnap.exists()) {
          const cloudPayload = cloudSnap.data();
          if (cloudPayload && Array.isArray(cloudPayload.items)) {
            const cleanCloud = sanitizeStoreItems(cloudPayload.items).filter((it) => !isItemDeleted(it, deletedIds));
            // Merge to prevent overwriting records added concurrently by other users
            finalPayload = mergeCollectionItems(cleanData, cleanCloud).filter((it) => !isItemDeleted(it, deletedIds));
          }
        }
      } catch (fetchErr) {
        // Fall back to cleanData if getDoc encounters a network issue
      }
    }

    await setDoc(docRef, {
      items: finalPayload,
      updatedAt: Date.now(),
      source: 'web_client_sync'
    }, { merge: true });

    // Update local cache if merged with new remote items
    if (Array.isArray(finalPayload) && typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(localKey, JSON.stringify(finalPayload));
      } catch {}
    }
  } catch (err) {
    console.warn(`[CloudSync] Cloud push error for ${docKey}:`, err.message);
  }
}
