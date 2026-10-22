/**
 * Secure Firebase Storage Service for Enterprise Document Management
 * SM CONCRETECH - RMC Plant Management ERP
 * 
 * Provides:
 * - Strict client-side validation (MIME types, 5MB size limit)
 * - Company- and employee-segregated storage paths
 * - Resumable uploads with real-time percentage progress tracking
 * - Authenticated file download URL generation & binary file retrieval
 * - Safe file deletion
 */

import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  getBlob
} from 'firebase/storage';
import { storage } from '../config/firebase.js';

// Maximum allowed document size (5 Megabytes)
export const MAX_DOCUMENT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

// Allowed MIME types for personnel documentation
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

// Allowed MIME types for driver trip photographs
export const ALLOWED_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

/**
 * Validates a driver trip photograph file before upload
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateTripPhotoFile(file) {
  if (!file) {
    return { valid: false, error: 'No photograph selected for upload.' };
  }

  if (file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Photo exceeds 5 MB limit (Current: ${sizeMb} MB). Maximum allowed size is 5 MB.`
    };
  }

  const isAllowedMime = ALLOWED_PHOTO_MIME_TYPES.includes(file.type);
  const isAllowedExtension = /\.(jpe?g|png|webp)$/i.test(file.name || '');

  if (!isAllowedExtension || (file.type && !isAllowedMime)) {
    return {
      valid: false,
      error: 'Invalid photograph format. Only JPEG, PNG, and WebP images are accepted.'
    };
  }

  return { valid: true, error: null };
}

/**
 * Validates a document file before upload
 * @param {File} file 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDocumentFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected for upload.' };
  }

  if (file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return { 
      valid: false, 
      error: `File is too large (${sizeMb} MB). Maximum allowed size is 5 MB.` 
    };
  }

  // Validate MIME type and file extension
  const isAllowedMime = ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type);
  const isAllowedExtension = /\.(pdf|jpe?g|png|webp)$/i.test(file.name || '');

  if (!isAllowedExtension || (file.type && !isAllowedMime)) {
    return { 
      valid: false, 
      error: 'Invalid file format. Only PDF, JPEG, PNG, and WebP documents are accepted.' 
    };
  }

  return { valid: true, error: null };
}

/**
 * Format bytes into human readable string
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Sanitizes a filename for secure Cloud Storage storage
 */
export function sanitizeFileName(name) {
  // Strip any directory path components (e.g. ../ or / or \) to prevent traversal
  const basename = (name || 'doc').split(/[/\\]/).pop();
  return basename
    .replace(/^\.+/, '') // remove leading dots
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_') || 'document.pdf';
}

/**
 * Uploads an employee document to Firebase Cloud Storage with progress reporting
 * 
 * Storage path hierarchy:
 * documents/{companyId}/{employeeId}/{timestamp}_{filename}
 * 
 * @param {File} file
 * @param {Object} metadata { companyId, employeeId, documentType }
 * @param {Function} onProgress Callback receiving percentage 0-100
 * @returns {Promise<{ storagePath: string, downloadUrl: string, fileName: string, fileSizeFormatted: string }>}
 */
export async function uploadEmployeeDocument(file, { companyId = 'CMP-SM-001', employeeId, documentType }, onProgress) {
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (!employeeId) {
    throw new Error('Employee ID is required for secure document storage segregation.');
  }

  const cleanEmpId = employeeId.trim().toUpperCase();
  const cleanCompanyId = companyId.trim();
  const safeName = sanitizeFileName(file.name);
  const timestamp = Date.now();
  const storagePath = `documents/${cleanCompanyId}/${cleanEmpId}/${timestamp}_${safeName}`;

  const storageRef = ref(storage, storagePath);

  const customMetadata = {
    companyId: cleanCompanyId,
    employeeId: cleanEmpId,
    documentType: documentType || 'General Personnel Document',
    uploadedAt: new Date().toISOString(),
    originalName: file.name,
  };

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/pdf',
      customMetadata,
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (typeof onProgress === 'function') {
          onProgress(progress);
        }
      },
      (error) => {
        console.error('Firebase Storage upload error:', error);
        let userMessage = 'Upload failed due to a network or storage error.';
        if (error.code === 'storage/unauthorized') {
          userMessage = 'Permission denied. You are not authorized to upload documents for this employee.';
        } else if (error.code === 'storage/canceled') {
          userMessage = 'Upload was canceled.';
        } else if (error.code === 'storage/quota-exceeded') {
          userMessage = 'Storage quota exceeded. Please contact Administrator.';
        }
        reject(new Error(userMessage));
      },
      async () => {
        resolve({
          storagePath,
          fileName: file.name,
          fileSizeFormatted: formatBytes(file.size),
          fileType: file.type,
          // downloadUrl omitted intentionally to prevent persistent unauthenticated public token generation
        });
      }
    );
  });
}

/**
 * Downloads or opens a secured employee document using authenticated binary retrieval (getBlob).
 * 
 * Enforces Firebase Storage security rules for every download request.
 * Creates an ephemeral, temporary in-memory Object URL which is immediately revoked
 * after the download is initiated, preventing persistent public URL leakage.
 * 
 * If storagePath is absent (legacy documents), falls back to fallbackUrl.
 * 
 * @param {string} storagePath Cloud Storage object path (e.g. documents/CMP-SM-001/EMP-001/172906...pdf)
 * @param {string} fallbackUrl Legacy public download URL fallback
 * @param {string} fileName Target download file name
 * @returns {Promise<{ success: boolean, method: string }>}
 */
export async function downloadEmployeeDocument(storagePath, fallbackUrl, fileName = 'document.pdf') {
  try {
    // 1. Authorized download via Cloud Storage SDK getBlob (Enforces storage.rules)
    if (storagePath) {
      const fileRef = ref(storage, storagePath);
      const blob = await getBlob(fileRef);

      if (typeof window !== 'undefined' && window.URL && document) {
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Revoke temporary blob URL safely after download initiates
        setTimeout(() => {
          try {
            window.URL.revokeObjectURL(objectUrl);
          } catch (_) {}
        }, 1500);

        return { success: true, method: 'authenticated_blob' };
      }
      return { success: true, method: 'blob_retrieved' };
    }

    // 2. Fallback for legacy documents lacking storagePath
    if (fallbackUrl) {
      console.warn('Document lacks storagePath; using legacy fallback URL.');
      if (typeof window !== 'undefined' && document) {
        const a = document.createElement('a');
        a.href = fallbackUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return { success: true, method: 'legacy_fallback' };
    }

    throw new Error('No storage reference found for this document.');
  } catch (err) {
    console.error('Authorized document download error:', err);
    let msg = err.message || 'Download failed.';
    if (err.code === 'storage/unauthorized') {
      msg = 'Permission denied. You do not have authorization to download this confidential document.';
    } else if (err.code === 'storage/object-not-found') {
      msg = 'The requested document file was not found in storage.';
    }
    throw new Error(msg);
  }
}

/**
 * Deletes a document file from Firebase Cloud Storage.
 * Throws on authorization or network failures so the caller knows the deletion failed.
 * Treats already-missing objects (storage/object-not-found) as safe idempotent successes.
 * 
 * @param {string} storagePath 
 */
export async function deleteEmployeeDocumentFile(storagePath) {
  if (!storagePath) return;
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
  } catch (err) {
    // If the file is already gone from Cloud Storage, deletion is satisfied
    if (err.code === 'storage/object-not-found') {
      console.warn(`Storage object ${storagePath} was already removed.`);
      return;
    }
    // Propagate all other errors (such as storage/unauthorized)
    console.error(`Storage object ${storagePath} deletion error:`, err);
    throw err;
  }
}

/**
 * Uploads an operational driver trip photograph to Firebase Cloud Storage.
 * 
 * Path hierarchy:
 * operations/{companyId}/{tripId}/{photoType}_{timestamp}_{random}.{ext}
 * 
 * @param {File} file
 * @param {Object} metadata { companyId, tripId, photoType, userId }
 * @param {Function} onProgress Callback receiving percentage 0-100
 * @returns {Promise<{ storagePath: string, downloadUrl: string, fileName: string, fileSizeFormatted: string, photoType: string, tripId: string, timestamp: number, uploadedBy: string }>}
 */
export async function uploadTripPhoto(file, { companyId = 'sm-concretech', tripId, photoType = 'trip_photo', userId = 'DRV' }, onProgress) {
  const validation = validateTripPhotoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  if (!tripId) {
    throw new Error('Trip ID is required for operations storage path segregation.');
  }

  const cleanCompanyId = (companyId || 'sm-concretech').trim();
  const cleanTripId = String(tripId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = (file.name || '').split('.').pop() || 'jpg';
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : 'jpg';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const fileName = `${photoType}_${timestamp}_${randomSuffix}.${cleanExt}`;

  const storagePath = `operations/${cleanCompanyId}/${cleanTripId}/${fileName}`;
  const storageRef = ref(storage, storagePath);

  const customMetadata = {
    companyId: cleanCompanyId,
    tripId: cleanTripId,
    photoType,
    uploadedBy: userId,
    uploadedAt: new Date().toISOString(),
    originalName: file.name || fileName
  };

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'image/jpeg',
      customMetadata
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (typeof onProgress === 'function') onProgress(progress);
      },
      (error) => {
        console.error('Firebase Storage trip photo upload error:', error);
        let userMessage = 'Photo upload failed due to network or storage error.';
        if (error.code === 'storage/unauthorized') {
          userMessage = 'Permission denied. Unauthorized storage operation for this company/trip.';
        } else if (error.code === 'storage/canceled') {
          userMessage = 'Photo upload canceled.';
        } else if (error.code === 'storage/quota-exceeded') {
          userMessage = 'Storage quota exceeded. Please contact Administrator.';
        }
        reject(new Error(userMessage));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(storageRef);
          resolve({
            storagePath,
            downloadUrl,
            fileName,
            fileSizeFormatted: formatBytes(file.size),
            fileType: file.type || 'image/jpeg',
            photoType,
            tripId: cleanTripId,
            uploadedBy: userId,
            timestamp
          });
        } catch (urlErr) {
          // Fallback if getDownloadURL has issues
          resolve({
            storagePath,
            downloadUrl: null,
            fileName,
            fileSizeFormatted: formatBytes(file.size),
            fileType: file.type || 'image/jpeg',
            photoType,
            tripId: cleanTripId,
            uploadedBy: userId,
            timestamp
          });
        }
      }
    );
  });
}
