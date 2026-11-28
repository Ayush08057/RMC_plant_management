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

// Quota-saving registries:
// 1. Payload fingerprint cache prevents redundant Firestore writes/callbacks when data is unchanged.
// 2. Active listener registry multiplexes multiple subscribeCloudStore calls for the same doc onto 1 onSnapshot.
// 3. Trailing debounce queue coalesces rapid consecutive pushCloudStore bursts.
const lastSyncedFingerprintMap = new Map();
const lastCloudSnapshotDataMap = new Map();
const activeCloudChannels = new Map();
const pendingPushTimers = new Map();
const pendingPushPayloads = new Map();

function computeSyncFingerprint(items, deletedArr = []) {
  try {
    return JSON.stringify({ items: items ?? null, deleted: deletedArr || [] });
  } catch {
    return String(Date.now());
  }
}

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
    const arr = raw ? JSON.parse(raw) : [];
    const set = new Set(Array.isArray(arr) ? arr : []);
    set.add(String(itemId).trim().toLowerCase());
    const trimmed = Array.from(set).slice(-500);
    localStorage.setItem(delKey, JSON.stringify(trimmed));
  } catch {}
}

/**
 * Merges cloud tombstone IDs with local tombstone IDs and persists locally
 */
function mergeDeletedIds(localKey, cloudDeletedIds = []) {
  const set = getDeletedItemIds(localKey);
  if (Array.isArray(cloudDeletedIds) && cloudDeletedIds.length > 0) {
    cloudDeletedIds.forEach((id) => {
      if (id) set.add(String(id).trim().toLowerCase());
    });
    if (typeof window !== 'undefined' && window.localStorage && localKey) {
      try {
        const trimmed = Array.from(set).slice(-500);
        localStorage.setItem(`${localKey}_deleted_ids`, JSON.stringify(trimmed));
      } catch {}
    }
  }
  return set;
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
  const vehicleNo = item.vehicleNo && !item.id ? String(item.vehicleNo).trim().toLowerCase() : '';
  return (
    (id && deletedIds.has(id)) ||
    (billNo && deletedIds.has(billNo)) ||
    (voucherNo && deletedIds.has(voucherNo)) ||
    (vehicleNo && deletedIds.has(vehicleNo))
  );
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
  const scopeKey = `${primaryCollection}::${docKey}`;
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
    const activeDeletedIds = mergeDeletedIds(localKey, cloudPayload.deletedIds);
    const deletedArr = Array.from(activeDeletedIds).slice(-500);
    const isArrayPayload = Array.isArray(cloudPayload.items);
    const cleanItems = isArrayPayload
      ? sanitizeStoreItems(cloudPayload.items).filter((it) => !isItemDeleted(it, activeDeletedIds))
      : cloudPayload.items;

    lastCloudSnapshotDataMap.set(scopeKey, { items: cleanItems, deletedIds: deletedArr });

    let currentLocal = localData;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) currentLocal = JSON.parse(raw);
      } catch {}
    }
    const rawMerged = mergeCollectionItems(currentLocal, cleanItems);
    const merged = Array.isArray(rawMerged)
      ? rawMerged.filter((it) => !isItemDeleted(it, activeDeletedIds))
      : rawMerged;

    const mergedFp = computeSyncFingerprint(merged, deletedArr);
    const prevFp = lastSyncedFingerprintMap.get(scopeKey);
    lastSyncedFingerprintMap.set(scopeKey, mergedFp);

    if (mergedFp !== prevFp && typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(localKey, JSON.stringify(merged));
      } catch {}
    }
    callback(merged);
    return merged;
  };

  // 2. Shared multiplexed real-time subscription (eliminates duplicate getDoc + redundant listeners per doc)
  let channel = activeCloudChannels.get(scopeKey);
  if (!channel) {
    channel = {
      listeners: new Set(),
      latestPayload: null,
      legacyChecked: false,
      unsubPrimary: () => {},
      unsubLegacy: () => {},
    };
    activeCloudChannels.set(scopeKey, channel);

    const notifyChannel = (payload) => {
      channel.latestPayload = payload;
      channel.listeners.forEach((fn) => {
        try { fn(payload); } catch {}
      });
    };

    const handleMissingPrimaryDoc = async () => {
      if (channel.legacyChecked) return;
      channel.legacyChecked = true;
      const migratedFlagKey = `rmc_migrated_${primaryCollection}_${docKey}`;
      const alreadyMigrated = typeof window !== 'undefined' && window.localStorage && localStorage.getItem(migratedFlagKey) === '1';

      if (!alreadyMigrated) {
        try {
          const legacySnap = await getDoc(legacyRef);
          if (legacySnap.exists() && legacySnap.data()?.items !== undefined) {
            const migratedData = legacySnap.data();
            notifyChannel(migratedData);
            setDoc(primaryRef, {
              items: migratedData.items,
              deletedIds: migratedData.deletedIds || [],
              updatedAt: Date.now(),
              source: 'auto_migrated_from_hrSettings'
            }, { merge: true }).catch(() => {});
            try { localStorage.setItem(migratedFlagKey, '1'); } catch {}
            return;
          }
          try { localStorage.setItem(migratedFlagKey, '1'); } catch {}
        } catch {}
      }

      if (Array.isArray(localData) && localData.length > 0) {
        const cleanLocal = sanitizeStoreItems(localData).filter((it) => !isItemDeleted(it, deletedIds));
        if (cleanLocal.length > 0) {
          const cleanFp = computeSyncFingerprint(cleanLocal, Array.from(deletedIds).slice(-500));
          lastSyncedFingerprintMap.set(scopeKey, cleanFp);
          setDoc(primaryRef, {
            items: cleanLocal,
            updatedAt: Date.now(),
            source: 'initial_device_seed'
          }, { merge: true }).catch(() => {});
        }
      }
    };

    try {
      channel.unsubPrimary = onSnapshot(
        primaryRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && data.items !== undefined) {
              notifyChannel(data);
              return;
            }
          }
          handleMissingPrimaryDoc();
        },
        (err) => {
          console.warn(`[CloudSync] Primary listener notice for ${docKey}:`, err.message);
          if (err?.code === 'permission-denied' || String(err?.message || '').toLowerCase().includes('permission')) {
            try {
              channel.unsubLegacy = onSnapshot(
                legacyRef,
                (legacySnap) => {
                  if (legacySnap.exists()) {
                    notifyChannel(legacySnap.data());
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
  }

  const listener = (cloudData) => {
    if (isMounted) applyCloudPayload(cloudData);
  };
  channel.listeners.add(listener);
  if (channel.latestPayload) {
    applyCloudPayload(channel.latestPayload);
  }

  return () => {
    isMounted = false;
    const ch = activeCloudChannels.get(scopeKey);
    if (ch) {
      ch.listeners.delete(listener);
      if (ch.listeners.size === 0) {
        if (typeof ch.unsubPrimary === 'function') ch.unsubPrimary();
        if (typeof ch.unsubLegacy === 'function') ch.unsubLegacy();
        activeCloudChannels.delete(scopeKey);
      }
    }
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
      return { ...(localItems || {}), ...(cloudItems || {}) };
    }
    return cloudItems !== undefined ? cloudItems : localItems;
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
export async function pushCloudStore(docKey, localKeyOrData, dataArg, options = {}) {
  // Support both 3-arg pushCloudStore(docKey, localKey, data) and 2-arg pushCloudStore(storageKey, data)
  const localKey = dataArg === undefined ? docKey : localKeyOrData;
  const rawData = dataArg === undefined ? localKeyOrData : dataArg;
  const { debounceMs = 450, immediate = false } = options || {};

  const deletedIds = getDeletedItemIds(localKey);
  const deletedArr = Array.from(deletedIds).slice(-500);
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

  const primaryCollection = getSyncCollectionName();
  const scopeKey = `${primaryCollection}::${docKey}`;
  const localFp = computeSyncFingerprint(cleanData, deletedArr);

  // Skip redundant cloud read+write if payload is identical to the last synced state
  if (!immediate && lastSyncedFingerprintMap.get(scopeKey) === localFp && !pendingPushTimers.has(scopeKey)) {
    return;
  }

  const flushToCloud = async (payloadToPush) => {
    const activeDeleted = getDeletedItemIds(localKey);
    const activeDeletedArr = Array.from(activeDeleted).slice(-500);
    const flushFp = computeSyncFingerprint(payloadToPush, activeDeletedArr);
    if (!immediate && lastSyncedFingerprintMap.get(scopeKey) === flushFp) {
      return;
    }

    const mergeWithDocRef = async (ref, dataToMerge, useCachedSnapshot = false) => {
      let mergedDeleted = getDeletedItemIds(localKey);
      let cloudPayload = useCachedSnapshot ? lastCloudSnapshotDataMap.get(scopeKey) : null;
      if (!cloudPayload) {
        try {
          const cloudSnap = await getDoc(ref);
          if (cloudSnap.exists()) cloudPayload = cloudSnap.data();
        } catch {}
      }
      if (cloudPayload) {
        mergedDeleted = mergeDeletedIds(localKey, cloudPayload.deletedIds);
        if (Array.isArray(dataToMerge) && Array.isArray(cloudPayload.items)) {
          const cleanCloud = sanitizeStoreItems(cloudPayload.items).filter((it) => !isItemDeleted(it, mergedDeleted));
          const cleanLocal = dataToMerge.filter((it) => !isItemDeleted(it, mergedDeleted));
          const merged = mergeCollectionItems(cleanLocal, cleanCloud).filter((it) => !isItemDeleted(it, mergedDeleted));
          return { payload: merged, deletedArr: Array.from(mergedDeleted).slice(-500) };
        }
      }
      const filteredLocal = Array.isArray(dataToMerge)
        ? dataToMerge.filter((it) => !isItemDeleted(it, mergedDeleted))
        : dataToMerge;
      return { payload: filteredLocal, deletedArr: Array.from(mergedDeleted).slice(-500) };
    };

    // 2. Persist to partitioned plantSync_* first; fall back seamlessly to hrSettings_* if rules aren't updated yet
    const primaryRef = doc(db, primaryCollection, docKey);
    const legacyRef = doc(db, getLegacySyncCollectionName(), docKey);
    const companyScope = resolveSyncScope();
    const hasLiveChannel = activeCloudChannels.has(scopeKey) && lastCloudSnapshotDataMap.has(scopeKey);

    try {
      const { payload: finalPayload, deletedArr: finalDeleted } = await mergeWithDocRef(primaryRef, payloadToPush, hasLiveChannel);
      const cleanPayload = sanitizeForFirestore(finalPayload);
      const finalFp = computeSyncFingerprint(cleanPayload, finalDeleted);
      if (!immediate && lastSyncedFingerprintMap.get(scopeKey) === finalFp) {
        return;
      }
      lastSyncedFingerprintMap.set(scopeKey, finalFp);
      lastCloudSnapshotDataMap.set(scopeKey, { items: cleanPayload, deletedIds: finalDeleted });

      await setDoc(primaryRef, {
        id: docKey,
        nodeKey: docKey,
        companyId: companyScope,
        items: cleanPayload,
        deletedIds: finalDeleted,
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
        const { payload: legacyPayload, deletedArr: legacyDeleted } = await mergeWithDocRef(legacyRef, payloadToPush, false);
        const cleanLegacyPayload = sanitizeForFirestore(legacyPayload);
        await setDoc(legacyRef, {
          id: docKey,
          nodeKey: docKey,
          companyId: companyScope,
          items: cleanLegacyPayload,
          deletedIds: legacyDeleted,
          updatedAt: Date.now(),
          updatedAtIso: new Date().toISOString(),
          source: 'web_client_sync_fallback'
        }, { merge: true });
      } catch (fallbackErr) {
        console.warn(`[CloudSync] Cloud push error for ${docKey}:`, err?.message || fallbackErr?.message);
      }
    }
  };

  if (immediate || debounceMs <= 0) {
    if (pendingPushTimers.has(scopeKey)) {
      clearTimeout(pendingPushTimers.get(scopeKey));
      pendingPushTimers.delete(scopeKey);
      pendingPushPayloads.delete(scopeKey);
    }
    return flushToCloud(cleanData);
  }

  pendingPushPayloads.set(scopeKey, cleanData);
  if (pendingPushTimers.has(scopeKey)) {
    clearTimeout(pendingPushTimers.get(scopeKey));
  }
  return new Promise((resolve) => {
    const timer = setTimeout(async () => {
      pendingPushTimers.delete(scopeKey);
      const latest = pendingPushPayloads.get(scopeKey);
      pendingPushPayloads.delete(scopeKey);
      await flushToCloud(latest);
      resolve();
    }, debounceMs);
    pendingPushTimers.set(scopeKey, timer);
  });
}
