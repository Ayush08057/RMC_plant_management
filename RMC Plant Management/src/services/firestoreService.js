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
  updateDoc, 
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
 * Save or overwrite a document by custom ID (e.g. employeeId like EMP-101)
 */
export async function saveDocumentWithId(collectionName, docId, data) {
  try {
    const docRef = doc(db, collectionName, String(docId));
    await setDoc(docRef, data, { merge: true });
    return { id: String(docId), ...data };
  } catch (error) {
    console.error(`Error saving document ${docId} in ${collectionName}:`, error);
    return { id: String(docId), ...data };
  }
}

/**
 * Add a new document with an auto-generated ID
 */
export async function createDocument(collectionName, data) {
  try {
    const colRef = collection(db, collectionName);
    const docRef = await addDoc(colRef, data);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    return { id: `local_${Date.now()}`, ...data };
  }
}

/**
 * Update specific fields in an existing document
 */
export async function updateDocument(collectionName, docId, fields) {
  try {
    const docRef = doc(db, collectionName, String(docId));
    await updateDoc(docRef, fields);
    return { id: String(docId), ...fields };
  } catch (error) {
    console.error(`Error updating document ${docId} in ${collectionName}:`, error);
    return { id: String(docId), ...fields };
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
    return docId;
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
      return setDoc(docRef, {
        ...acc,
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
