/**
 * Firestore Database Service
 * Helper utilities for interacting with Cloud Firestore collections.
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

// Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  COMPANIES: 'companies',
  EMPLOYEES: 'employees',
  PLANTS: 'plants',
  ORDERS: 'orders',
  ATTENDANCE: 'attendance',
  SHIFTS: 'shifts',
  DAILY_WORK: 'dailyWork',
  LEAVES: 'leaves',
  ADVANCES: 'advances',
  LOANS: 'loans',
  PAYROLL: 'payrollRecords',
  DOCUMENTS: 'documents',
  AUDIT_LOGS: 'auditLogs',
  HR_SETTINGS: 'hrSettings',
  LIVE_LOCATIONS: 'liveLocations',
  PLANT_SYNC: 'plantSync',
};

/**
 * Fetch all documents from a collection
 */
export async function fetchCollection(collectionName) {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    return [];
  }
}

/**
 * Fetch a single document by ID
 */
export async function fetchDocument(collectionName, docId) {
  try {
    const docRef = doc(db, collectionName, docId);
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
 * Query documents by field condition
 */
export async function queryDocuments(collectionName, fieldPath, opStr, value) {
  try {
    const colRef = collection(db, collectionName);
    const q = query(colRef, where(fieldPath, opStr, value));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error(`Error querying ${collectionName} by ${fieldPath}:`, error);
    return [];
  }
}

/**
 * Recursively strips undefined values so Firestore setDoc never throws
 * "Unsupported field value: undefined"
 */
export function sanitizeForFirestore(obj) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter((v) => v !== undefined)
      .map((v) => (typeof v === 'object' && v !== null ? sanitizeForFirestore(v) : v));
  }
  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = (typeof val === 'object' && val !== null) ? sanitizeForFirestore(val) : val;
    }
  }
  return clean;
}

/**
 * Save or overwrite a document by custom ID (e.g. employeeId like EMP-101)
 */
export async function saveDocumentWithId(collectionName, docId, data) {
  try {
    const docRef = doc(db, collectionName, String(docId));
    const cleanData = sanitizeForFirestore(data);
    await setDoc(docRef, cleanData, { merge: true });
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
  try {
    const colRef = collection(db, collectionName);
    const cleanData = sanitizeForFirestore(data);
    const docRef = await addDoc(colRef, cleanData);
    return { id: docRef.id, ...cleanData };
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Update specific fields, creating the document when an offline/realtime
 * location event arrives before the initial attendance write has completed.
 * `updateDoc` rejects that normal race with "No document to update"; merge
 * writes preserve all fields already stored on the attendance record.
 */
export async function updateDocument(collectionName, docId, fields) {
  try {
    const docRef = doc(db, collectionName, String(docId));
    const cleanFields = sanitizeForFirestore(fields);
    await setDoc(docRef, cleanFields, { merge: true });
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
  try {
    const docRef = doc(db, collectionName, String(docId));
    await deleteDoc(docRef);
    return docId;
  } catch (error) {
    console.error(`Error deleting document ${docId} in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Real-time listener for a collection
 */
export function subscribeToCollection(collectionName, callback) {
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
 * Batch write multiple documents efficiently
 */
export async function batchSaveDocuments(collectionName, items, idKey = 'id') {
  if (!items || items.length === 0) return;
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docId = String(item[idKey] || item.id || `doc_${Date.now()}_${Math.random()}`);
      const docRef = doc(db, collectionName, docId);
      batch.set(docRef, item, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.error(`Error batch saving to ${collectionName}:`, error);
  }
}

/**
 * Synchronize and save all official role accounts to Firebase Cloud Firestore
 */
export async function syncRoleAccountsToFirestore(accounts) {
  if (!accounts || accounts.length === 0) return { success: false, count: 0 };
  try {
    const promises = accounts.map((acc) => {
      const docId = String(acc.id || acc.employeeId);
      const docRef = doc(db, COLLECTIONS.USERS, docId);
      // Strip plaintext password to strictly satisfy Requirement 7
      const { password: _pw, ...safeAcc } = acc;
      return setDoc(docRef, {
        ...safeAcc,
        syncedToFirebaseAt: new Date().toISOString(),
      }, { merge: true });
    });
    await Promise.all(promises);
    return { success: true, count: accounts.length };
  } catch (error) {
    console.warn('Firebase role accounts sync notice:', error.message);
    return { success: false, error: error.message };
  }
}
