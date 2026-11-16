/**
 * Firebase Configuration & Database Initializer for SM CONCRETE TECH
 * Connects Cloud Firestore, Realtime Database, Authentication, and Storage.
 */

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyArzrvlIIXYiafzurcD0GGPlbMagqgAk6w",
  authDomain: "smconcretech-2149c.firebaseapp.com",
  projectId: "smconcretech-2149c",
  storageBucket: "smconcretech-2149c.firebasestorage.app",
  messagingSenderId: "658193047633",
  appId: "1:658193047633:web:41155562d9a2373bdfd870",
  measurementId: "G-FMD700NYHG"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore Database (Main Database)
export const db = getFirestore(app);

// Initialize Realtime Database (Optional/Live Telematics)
export const rtdb = getDatabase(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firebase Cloud Storage (Documents, photos, payslips)
export const storage = getStorage(app);

// Initialize Analytics safely (only supported in browser environments)
export let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch((err) => {
    console.warn("Firebase Analytics initialization skipped:", err);
  });
}

// Initialize Firebase App Check in MONITOR mode (un-enforced, with development debug token)
export let appCheck = null;
if (typeof window !== "undefined") {
  try {
    // Enable debug token in development environment for emulator and local testing
    if (import.meta.env?.DEV) {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
    }
    const recaptchaSiteKey = import.meta.env?.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    // Monitor mode: never block application startup if App Check initialization is delayed or unsupported
    console.warn("Firebase App Check monitor mode notice:", err?.message || err);
  }
}

export default app;
