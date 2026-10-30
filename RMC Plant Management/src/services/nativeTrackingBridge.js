/**
 * Native App Tracking Bridge
 * Seamlessly interfaces between React Web panel and Flutter Native Host.
 * Automatically communicates punch-in/out to start/stop the Android Foreground Location Service.
 */

class NativeTrackingService {
  constructor() {
    this.listeners = new Set();
    this.lastPing = null;
    this._setupWindowListener();
  }

  _setupWindowListener() {
    if (typeof window === 'undefined') return;

    // Hook called directly from Flutter's controller.runJavaScript
    window.__onNativeLocationPing = (locationData) => {
      this.lastPing = locationData;
      this.listeners.forEach((listener) => {
        try {
          listener(locationData);
        } catch (e) {
          console.error('[NativeTracking] Error in listener:', e);
        }
      });
    };
  }

  /**
   * Check if running inside the Flutter Android / iOS Webview
   */
  isNativeApp() {
    return typeof window !== 'undefined' && Boolean(window.NativeTrackingBridge || window.__nativeTrackingBridgeReady);
  }

  /**
   * Notify native Android layer that employee punched in
   * Starts high-precision Background Foreground Service with persistent notification
   */
  startForegroundTracking(employeeId, employeeName, options = {}) {
    if (typeof window === 'undefined') return;

    let companyId = 'sm-concretech';
    let authToken = '';
    let attendanceDocId = '';

    if (typeof options === 'string') {
      companyId = options;
    } else if (options && typeof options === 'object') {
      companyId = options.companyId || 'sm-concretech';
      authToken = options.authToken || '';
      attendanceDocId = options.attendanceDocId || options.docId || '';
    }

    const payload = JSON.stringify({
      action: 'START_TRACKING',
      employeeId: String(employeeId),
      employeeName: String(employeeName || 'Employee'),
      companyId: String(companyId || 'sm-concretech'),
      authToken: String(authToken || ''),
      attendanceDocId: String(attendanceDocId || ''),
    });

    if (window.NativeTrackingBridge && typeof window.NativeTrackingBridge.postMessage === 'function') {
      window.NativeTrackingBridge.postMessage(payload);
      console.log('[NativeTracking] Foreground tracking started for:', employeeId, 'company:', companyId, 'docId:', attendanceDocId);
    } else {
      console.log('[NativeTracking] Native bridge not detected (running in browser mode)');
    }
  }

  /**
   * Sync active Firebase Auth token and company ID to Flutter background service
   */
  syncAuth(authToken, companyId = 'sm-concretech') {
    if (typeof window === 'undefined') return;

    const payload = JSON.stringify({
      action: 'SYNC_AUTH',
      authToken: String(authToken || ''),
      companyId: String(companyId || 'sm-concretech'),
    });

    if (window.NativeTrackingBridge && typeof window.NativeTrackingBridge.postMessage === 'function') {
      window.NativeTrackingBridge.postMessage(payload);
      console.log('[NativeTracking] Auth credentials synced to native host');
    }
  }

  /**
   * Request locally recorded shift breadcrumb trail from Flutter isolate
   */
  async requestLocalTrail(employeeId, timeoutMs = 4000) {
    if (typeof window === 'undefined') return [];

    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          window.__onNativeTrailExport = null;
          resolve([]);
        }
      }, timeoutMs);

      window.__onNativeTrailExport = (trailData) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          window.__onNativeTrailExport = null;
          resolve(Array.isArray(trailData) ? trailData : []);
        }
      };

      const payload = JSON.stringify({
        action: 'GET_LOCAL_TRAIL',
        employeeId: String(employeeId),
      });

      if (window.NativeTrackingBridge && typeof window.NativeTrackingBridge.postMessage === 'function') {
        window.NativeTrackingBridge.postMessage(payload);
      } else {
        clearTimeout(timer);
        window.__onNativeTrailExport = null;
        resolve([]);
      }
    });
  }

  /**
   * Clear local trail buffer from device
   */
  clearLocalTrail(employeeId) {
    if (typeof window === 'undefined') return;
    const payload = JSON.stringify({
      action: 'CLEAR_LOCAL_TRAIL',
      employeeId: String(employeeId),
    });
    if (window.NativeTrackingBridge && typeof window.NativeTrackingBridge.postMessage === 'function') {
      window.NativeTrackingBridge.postMessage(payload);
    }
  }

  /**
   * Notify native Android layer that employee punched out
   * Stops background foreground service cleanly
   */
  stopForegroundTracking() {
    if (typeof window === 'undefined') return;

    const payload = JSON.stringify({
      action: 'STOP_TRACKING',
    });

    if (window.NativeTrackingBridge && typeof window.NativeTrackingBridge.postMessage === 'function') {
      window.NativeTrackingBridge.postMessage(payload);
      console.log('[NativeTracking] Foreground tracking stopped');
    }
  }

  /**
   * Request an immediate high-precision hardware GPS fix from Flutter layer
   * Returns a Promise that waits up to 6 seconds for the native GNSS ping
   */
  async requestImmediateFix(timeoutMs = 6000) {
    if (typeof window === 'undefined') return this.getLatestNativeFix();
    
    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsubscribe();
          resolve(this.getLatestNativeFix());
        }
      }, timeoutMs);

      const unsubscribe = this.onLocationPing((data) => {
        if (!resolved && data && data.lat && data.lng) {
          resolved = true;
          clearTimeout(timer);
          unsubscribe();
          resolve(data);
        }
      });

      const payload = JSON.stringify({ action: 'REQUEST_GPS_NOW' });
      if (window.NativeTrackingBridge && typeof window.NativeTrackingBridge.postMessage === 'function') {
        window.NativeTrackingBridge.postMessage(payload);
      } else {
        clearTimeout(timer);
        unsubscribe();
        resolve(this.getLatestNativeFix());
      }
    });
  }

  /**
   * Get latest accurate native ping if fresh (within 30 seconds)
   */
  getLatestNativeFix() {
    if (this.lastPing && this.lastPing.lat && this.lastPing.lng) {
      return this.lastPing;
    }
    if (typeof window !== 'undefined' && window.__latestNativeGpsFix && window.__latestNativeGpsFix.lat && window.__latestNativeGpsFix.lng) {
      this.lastPing = window.__latestNativeGpsFix;
      return window.__latestNativeGpsFix;
    }
    return null;
  }

  /**
   * Subscribe to real-time pings pushed by native foreground service
   */
  onLocationPing(callback) {
    this.listeners.add(callback);
    if (this.lastPing) {
      callback(this.lastPing);
    }
    return () => this.listeners.delete(callback);
  }
}

export const nativeTracking = new NativeTrackingService();
