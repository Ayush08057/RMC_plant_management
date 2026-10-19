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

  // 1. First load from local storage if available
  let localData = initialDefault;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawLocal = localStorage.getItem(localKey);
      if (rawLocal) {
        localData = JSON.parse(rawLocal);
      }
    } catch (e) {
      console.warn(`[CloudSync] Local read error for ${localKey}:`, e);
    }
  }

  // 2. Fetch initial cloud data & push local if cloud is empty
  getDoc(docRef)
    .then(async (snap) => {
      if (!isMounted) return;

      if (snap.exists()) {
        const cloudPayload = snap.data();
        if (cloudPayload && Array.isArray(cloudPayload.items)) {
          // Cloud has data -> update local and callback
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              localStorage.setItem(localKey, JSON.stringify(cloudPayload.items));
            } catch {}
          }
          onDataUpdated(cloudPayload.items);
          return;
        }
      }

      // If cloud is empty but local has items, upload local data to cloud so other devices get it
      if (Array.isArray(localData) && localData.length > 0) {
        try {
          await setDoc(docRef, {
            items: localData,
            updatedAt: Date.now(),
            source: 'initial_device_seed'
          }, { merge: true });
        } catch (uploadErr) {
          console.warn(`[CloudSync] Seed error for ${docKey}:`, uploadErr.message);
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
          try {
            localStorage.setItem(localKey, JSON.stringify(data.items));
          } catch {}
          onDataUpdated(data.items);
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
  // 1. Immediately update localStorage for zero latency
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(localKey, JSON.stringify(data));
    } catch (e) {
      console.error(`[CloudSync] Local cache write error for ${localKey}:`, e);
    }
  }

  // 2. Broadcast to Cloud Firestore
  try {
    const collectionName = getSyncCollectionName();
    const docRef = doc(db, collectionName, docKey);
    await setDoc(docRef, {
      items: Array.isArray(data) ? data : [],
      updatedAt: Date.now(),
      lastUpdatedDevice: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Client'
    }, { merge: true });
  } catch (cloudErr) {
    console.warn(`[CloudSync] Cloud push notice for ${docKey}:`, cloudErr.message);
  }
}
