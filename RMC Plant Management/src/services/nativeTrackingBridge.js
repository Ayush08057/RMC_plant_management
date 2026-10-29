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
  startForegroundTracking(employeeId, employeeName) {
    if (typeof window === 'undefined') return;

    const payload = JSON.stringify({
      action: 'START_TRACKING',
      employeeId: String(employeeId),
      employeeName: String(employeeName || 'Employee'),
    });

    if (window.NativeTrackingBridge && typeof window.NativeTrackingBridge.postMessage === 'function') {
      window.NativeTrackingBridge.postMessage(payload);
      console.log('[NativeTracking] Foreground tracking started for:', employeeId);
    } else {
      console.log('[NativeTracking] Native bridge not detected (running in browser mode)');
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
   */
  requestImmediateFix() {
    if (typeof window === 'undefined') return;
    const payload = JSON.stringify({ action: 'REQUEST_GPS_NOW' });
    if (window.NativeTrackingBridge && typeof window.NativeTrackingBridge.postMessage === 'function') {
      window.NativeTrackingBridge.postMessage(payload);
    }
  }

  /**
   * Get latest accurate native ping if fresh (within 30 seconds)
   */
  getLatestNativeFix() {
    if (this.lastPing && this.lastPing.lat && this.lastPing.lng) {
      return this.lastPing;
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
