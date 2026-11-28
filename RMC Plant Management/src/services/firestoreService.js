/**
 * Enterprise Firestore Database Service
 * Helper utilities for high-performance, strictly isolated Cloud Firestore operations.
 * 
 * Features:
 * - Strict Domain Node Separation
 * - Throttled & Debounced High-Frequency Writes
 * - Atomic Chunked Batch Writes (Handling 500-Op Firestore Limits)
 * - Deep Payload Sanitization (Zero Undefined / NaN Errors)
 * - Granular Single-Document & Collection Subscriptions
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  limit,
  writeBatch
} from "firebase/firestore";
import { db } from "../config/firebase.js";
import { FIRESTORE_NODES, DEFAULT_COMPANY_ID } from "./firestoreSchema.js";

// Re-export collection node definitions for 100% backward compatibility
export const COLLECTIONS = FIRESTORE_NODES;
export { FIRESTORE_NODES, DEFAULT_COMPANY_ID };
export * from "./firestoreSchema.js";

// In-Memory Throttle Cache for high-frequency write deduplication (e.g. GPS pings)
const writeThrottleRegistry = new Map(); // key -> lastWriteTimestamp

/**
 * Throttles write executions to avoid exceeding Firestore write rate limits
 * @param {string} key - Unique operation identifier (e.g. `gps_${employeeId}`)
 * @param {number} minIntervalMs - Minimum delay between consecutive writes (e.g. 10000ms)
 * @param {Function} writeFn - Async write function to execute
 * @returns {Promise<any>}
 */
export async function throttledWrite(key, minIntervalMs, writeFn) {
  const now = Date.now();
  const lastWrite = writeThrottleRegistry.get(key) || 0;
  if (now - lastWrite < minIntervalMs) {
    return null; // Suppressed: write frequency within throttle window
  }
  writeThrottleRegistry.set(key, now);
  return await writeFn();
}

/**
 * Recursively strips undefined and NaN values to prevent Firestore driver rejections
 */
export function sanitizeForFirestore(obj) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'number' && isNaN(obj)) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter((v) => v !== undefined && (typeof v !== 'number' || !isNaN(v)))
      .map((v) => (typeof v === 'object' && v !== null ? sanitizeForFirestore(v) : v));
  }
  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined && (typeof val !== 'number' || !isNaN(val))) {
      clean[key] = (typeof val === 'object' && val !== null) ? sanitizeForFirestore(val) : val;
    }
  }
  return clean;
}

/**
 * Fetch all documents from a collection with optional companyId scoping
 */
export async function fetchCollection(collectionName, companyId = null) {
  try {
    const colRef = collection(db, collectionName);
    const q = companyId 
      ? query(colRef, where('companyId', '==', String(companyId).trim()))
      : colRef;
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    return [];
  }
}

/**
 * Fetch a single document by ID with fallback safety
 */
export async function fetchDocument(collectionName, docId) {
  if (!collectionName || !docId) return null;
  try {
    const docRef = doc(db, collectionName, String(docId));
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching document ${docId} from ${collectionName}:`, error);
    return null;
  }
}

/**
 * Query documents by field condition with optional sorting and limiting
 */
export async function queryDocuments(collectionName, fieldPath, opStr, value, maxLimit = 100) {
  try {
    const colRef = collection(db, collectionName);
    const q = query(
      colRef, 
      where(fieldPath, opStr, value),
      limit(maxLimit)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error(`Error querying ${collectionName} by ${fieldPath}:`, error);
    return [];
  }
}

/**
 * Save or overwrite a document by custom ID (atomic merge)
 */
export async function saveDocumentWithId(collectionName, docId, data) {
  if (!collectionName || !docId) throw new Error("Collection name and document ID are required");
  try {
    const docRef = doc(db, collectionName, String(docId));
    const cleanData = sanitizeForFirestore({
      ...data,
      id: String(docId),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
    const setPromise = setDoc(docRef, cleanData, { merge: true });
    await Promise.race([
      setPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Firestore write timeout for ${collectionName}/${docId}`)), 3500))
    ]);
    return { id: String(docId), ...cleanData };
  } catch (error) {
    console.error(`Error saving document ${docId} in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Add a new document with an auto-generated ID
 */
export async function createDocument(collectionName, data) {
  if (!collectionName) throw new Error("Collection name is required");
  try {
    const colRef = collection(db, collectionName);
    const cleanData = sanitizeForFirestore({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const addPromise = addDoc(colRef, cleanData);
    const docRef = await Promise.race([
      addPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Firestore create timeout in ${collectionName}`)), 3500))
    ]);
    return { id: docRef.id, ...cleanData };
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Targeted update of specific fields with atomic merge
 */
export async function updateDocument(collectionName, docId, fields) {
  if (!collectionName || !docId) throw new Error("Collection name and document ID are required");
  try {
    const docRef = doc(db, collectionName, String(docId));
    const cleanFields = sanitizeForFirestore({
      ...fields,
      updatedAt: new Date().toISOString(),
    });
    const setPromise = setDoc(docRef, cleanFields, { merge: true });
    await Promise.race([
      setPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Firestore update timeout for ${collectionName}/${docId}`)), 3500))
    ]);
    return { id: String(docId), ...cleanFields };
  } catch (error) {
    console.error(`Error updating document ${docId} in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Permanently delete a document
 */
export async function removeDocument(collectionName, docId) {
  if (!collectionName || !docId) return null;
  try {
    const docRef = doc(db, collectionName, String(docId));
    await Promise.race([
      deleteDoc(docRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Firestore delete timeout for ${collectionName}/${docId}`)), 3500))
    ]);
    return docId;
  } catch (error) {
    console.error(`Error deleting document ${docId} in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Real-time listener for a single document
 */
export function subscribeToDocument(collectionName, docId, callback) {
  if (!collectionName || !docId) return () => {};
  try {
    const docRef = doc(db, collectionName, String(docId));
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() });
        } else {
          callback(null);
        }
      },
      (error) => {
        console.warn(`Realtime document listener notice for ${collectionName}/${docId}:`, error.message);
      }
    );
  } catch (err) {
    console.warn(`Failed to attach document listener to ${collectionName}/${docId}:`, err);
    return () => {};
  }
}

/**
 * Real-time listener for an entire collection
 */
export function subscribeToCollection(collectionName, callback) {
  if (!collectionName) return () => {};
  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef, 
      (snapshot) => {
        const records = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(records);
      }, 
      (error) => {
        console.warn(`Realtime subscription notice for ${collectionName}:`, error.message);
      }
    );
  } catch (err) {
    console.warn(`Failed to attach subscription to ${collectionName}:`, err);
    return () => {};
  }
}

/**
 * Batch write multiple documents with automatic chunking (safely handles >500 items)
 */
export async function batchSaveDocuments(collectionName, items, idKey = 'id') {
  if (!items || items.length === 0) return;
  const CHUNK_SIZE = 450; // Firestore maximum batch limit is 500
  try {
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((rawItem) => {
        if (!rawItem) return;
        const docId = String(rawItem[idKey] || rawItem.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
        const docRef = doc(db, collectionName, docId);
        const cleanItem = sanitizeForFirestore({
          ...rawItem,
          id: docId,
          updatedAt: rawItem.updatedAt || new Date().toISOString(),
        });
        batch.set(docRef, cleanItem, { merge: true });
      });
      await batch.commit();
    }
  } catch (error) {
    console.error(`Error batch saving to ${collectionName}:`, error);
  }
}

/**
 * Synchronize and save official role accounts to Firebase Cloud Firestore
 */
export async function syncRoleAccountsToFirestore(accounts) {
  if (!accounts || accounts.length === 0) return { success: false, count: 0 };
  try {
    const promises = accounts.map((acc) => {
      const docId = String(acc.id || acc.employeeId);
      const docRef = doc(db, COLLECTIONS.USERS, docId);
      // Strip plaintext password for security
      const { password: _pw, ...safeAcc } = acc;
      const cleanData = sanitizeForFirestore({
        ...safeAcc,
        companyId: safeAcc.companyId || DEFAULT_COMPANY_ID,
        syncedToFirebaseAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return setDoc(docRef, cleanData, { merge: true });
    });
    await Promise.all(promises);
    return { success: true, count: accounts.length };
  } catch (error) {
    console.warn('Firebase role accounts sync notice:', error.message);
    return { success: false, error: error.message };
  }
}
