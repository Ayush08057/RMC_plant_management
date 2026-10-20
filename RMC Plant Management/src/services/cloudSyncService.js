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
  const str = JSON.stringify(item).toLowerCase();
  return (
    str.includes('godrej') ||
    str.includes('rohan builders') ||
    str.includes('kolte patil') ||
    str.includes('vtp realty') ||
    str.includes('ramesh pawar') ||
    str.includes('sanjay kumar yadav') ||
    str.includes('sanjay yadav') ||
    str.includes('mahesh shinde') ||
    str.includes('deepak gaikwad') ||
    str.includes('ultratech') ||
    str.includes('mahalaxmi stone') ||
    str.includes('sangamner') ||
    str.includes('fosroc') ||
    str.includes('inv-ut-9021') ||
    str.includes('ch-ut-9901') ||
    str.includes('mukta') ||
    str.includes('aayush') ||
    str.includes('pranav') ||
    str.includes('adm-001') ||
    str.includes('acc-001')
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
export function subscribeCloudStore(docKey, localKey, initialDefault, onDataUpdated) {
  const collectionName = getSyncCollectionName();
  const docRef = doc(db, collectionName, docKey);

  let isMounted = true;

  // 1. First load from local storage if available and sanitize immediately
  let localData = initialDefault;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawLocal = localStorage.getItem(localKey);
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        localData = Array.isArray(parsed) ? sanitizeStoreItems(parsed) : parsed;
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
        if (cloudPayload && Array.isArray(cloudPayload.items)) {
          const cleanItems = sanitizeStoreItems(cloudPayload.items);
          if (cleanItems.length !== cloudPayload.items.length) {
            // Permanent cloud purge of legacy dummy records
            try {
              await setDoc(docRef, {
                items: cleanItems,
                updatedAt: Date.now(),
                source: 'clean_cloud_purge'
              }, { merge: true });
            } catch (err) {
              console.warn('[CloudSync] Cloud purge error:', err.message);
            }
          }
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              localStorage.setItem(localKey, JSON.stringify(cleanItems));
            } catch {}
          }
          onDataUpdated(cleanItems);
          return;
        }
      }

      // If cloud is empty and localData has only clean valid items, push clean localData
      if (Array.isArray(localData) && localData.length > 0) {
        const cleanLocal = sanitizeStoreItems(localData);
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
        if (data && Array.isArray(data.items)) {
          const cleanItems = sanitizeStoreItems(data.items);
          if (cleanItems.length !== data.items.length) {
            setDoc(docRef, {
              items: cleanItems,
              updatedAt: Date.now(),
              source: 'clean_cloud_purge'
            }, { merge: true }).catch(() => {});
          }
          try {
            localStorage.setItem(localKey, JSON.stringify(cleanItems));
          } catch {}
          onDataUpdated(cleanItems);
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
 * Pushes updated data to Cloud Firestore and updates local cache
 * @param {string} docKey - e.g. 'cloud_billing_bills'
 * @param {string} localKey - localStorage key
 * @param {any} data - array or object to save
 */
export async function pushCloudStore(docKey, localKey, data) {
  const cleanData = Array.isArray(data) ? sanitizeStoreItems(data) : data;

  // 1. Immediately update localStorage for zero latency
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(localKey, JSON.stringify(cleanData));
    } catch (e) {
      console.error(`[CloudSync] Local cache write error for ${localKey}:`, e);
    }
  }

  // 2. Persist to Firestore
  try {
    const collectionName = getSyncCollectionName();
    const docRef = doc(db, collectionName, docKey);
    await setDoc(docRef, {
      items: cleanData,
      updatedAt: Date.now(),
      source: 'web_client_sync'
    }, { merge: true });
  } catch (err) {
    console.warn(`[CloudSync] Cloud push error for ${docKey}:`, err.message);
  }
}
