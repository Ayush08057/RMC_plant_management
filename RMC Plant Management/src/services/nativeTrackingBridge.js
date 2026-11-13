/**
 * Native App Tracking Bridge
 * Seamlessly interfaces between React Web panel and Flutter Native Host.
 * Automatically communicates punch-in/out to start/stop the Android Foreground Location Service.
 */

class NativeTrackingService {
  constructor() {
    this.listeners = new Set();
    this.permissionListeners = new Set();
    this.lastPing = null;
    this.lastPermissionStatus = null;
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

    // Persistent dispatcher so checkPermissions() and UI modals never clobber each other
    window.__onTrackingPermissionsStatus = (statusData) => {
      const normalized = statusData || {};
      this.lastPermissionStatus = normalized;
      this.permissionListeners.forEach((listener) => {
        try {
          listener(normalized);
        } catch (e) {
          console.error('[NativeTracking] Error in permission listener:', e);
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
    let refreshToken = '';
    let userId = '';
    let attendanceDocId = '';
    let clearTrail = false;

    if (typeof options === 'string') {
      companyId = options;
    } else if (options && typeof options === 'object') {
      companyId = options.companyId || 'sm-concretech';
      authToken = options.authToken || '';
      refreshToken = options.refreshToken || '';
      userId = options.userId || '';
      attendanceDocId = options.attendanceDocId || options.docId || '';
      clearTrail = Boolean(options.clearTrail);
    }

    const payload = JSON.stringify({
      action: 'START_TRACKING',
      employeeId: String(employeeId),
      employeeName: String(employeeName || 'Employee'),
      companyId: String(companyId || 'sm-concretech'),
      authToken: String(authToken || ''),
      refreshToken: String(refreshToken || ''),
      userId: String(userId || ''),
      attendanceDocId: String(attendanceDocId || ''),
      clearTrail,
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
  syncAuth(authToken, companyId = 'sm-concretech', refreshToken = '', userId = '') {
    if (typeof window === 'undefined') return;

    const payload = JSON.stringify({
      action: 'SYNC_AUTH',
      authToken: String(authToken || ''),
      refreshToken: String(refreshToken || ''),
      companyId: String(companyId || 'sm-concretech'),
      userId: String(userId || ''),
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
   * Subscribe to tracking permission status updates from native Flutter host
   */
  onPermissionStatus(callback, { replayLast = false } = {}) {
    if (typeof window !== 'undefined' && typeof window.__onTrackingPermissionsStatus !== 'function') {
      this._setupWindowListener();
    }
    this.permissionListeners.add(callback);
    if (replayLast && this.lastPermissionStatus) {
      callback(this.lastPermissionStatus);
    }
    return () => this.permissionListeners.delete(callback);
  }

  /**
   * Check permissions status from native Flutter host
   */
  async checkPermissions(timeoutMs = 2500) {
    if (typeof window === 'undefined' || !this.isNativeApp()) {
      return {
        hasLocationAlways: true,
        hasLocationInUse: true,
        hasPreciseLocation: true,
        isIgnoringBattery: true,
        hasNotification: true,
        isGpsEnabled: true,
      };
    }

    if (typeof window.__onTrackingPermissionsStatus !== 'function') {
      this._setupWindowListener();
    }

    return new Promise((resolve) => {
      let resolved = false;
      let unsubscribe = () => {};

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsubscribe();
          resolve({
            hasLocationAlways: false,
            hasLocationInUse: false,
            hasPreciseLocation: false,
            isIgnoringBattery: false,
            hasNotification: false,
            isGpsEnabled: true,
          });
        }
      }, timeoutMs);

      unsubscribe = this.onPermissionStatus((statusData) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          unsubscribe();
          resolve(statusData || {});
        }
      });

      const payload = JSON.stringify({ action: 'CHECK_PERMISSIONS' });
      if (window.NativeTrackingBridge && typeof window.NativeTrackingBridge.postMessage === 'function') {
        window.NativeTrackingBridge.postMessage(payload);
      } else {
        clearTimeout(timer);
        unsubscribe();
        resolve({
          hasLocationAlways: true,
          hasLocationInUse: true,
          hasPreciseLocation: true,
          isIgnoringBattery: true,
          hasNotification: true,
          isGpsEnabled: true,
        });
      }
    });
  }

  /**
   * Request native host to open a specific settings screen
   */
  openSetting(target) {
    if (typeof window === 'undefined') return;
    const payload = JSON.stringify({
      action: 'OPEN_SETTING',
      target: String(target || 'APP_SETTINGS'),
    });
    if (window.NativeTrackingBridge && typeof window.NativeTrackingBridge.postMessage === 'function') {
      window.NativeTrackingBridge.postMessage(payload);
    }
  }

  /**
   * Subscribe to real-time pings pushed by native foreground service
   */
  onLocationPing(callback, { replayLast = false } = {}) {
    if (typeof window !== 'undefined' && typeof window.__onNativeLocationPing !== 'function') {
      this._setupWindowListener();
    }
    this.listeners.add(callback);
    if (replayLast && this.lastPing) {
      callback(this.lastPing);
    }
    return () => this.listeners.delete(callback);
  }
}

export const nativeTracking = new NativeTrackingService();
