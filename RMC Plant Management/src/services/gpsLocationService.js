/**
 * High-Precision Device Geolocation & Reverse Geocoding Service
 * Implements multi-tiered GNSS, Wi-Fi Triangulation, IP Geo fallback, and real address resolution
 */

import { resolveSangliLandmark, calculateDistanceMeters } from '../utils/sangliGeofence';
import { nativeTracking } from './nativeTrackingBridge';

// In-memory cache for reverse geocoding to prevent excessive lookups
const reverseGeocodeCache = new Map();

/**
 * Resolves accurate address from coordinates
 * Supports Sangli landmarks, Pune urban landmarks, and OpenStreetMap reverse geocoding
 */
export async function resolveAccurateAddress(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return {
      landmarkName: 'Location Pending',
      address: 'GPS Telemetry Pending',
      shortName: 'Pending',
      city: 'Unknown'
    };
  }

  const numLat = Number(Number(lat).toFixed(6));
  const numLng = Number(Number(lng).toFixed(6));
  const cacheKey = `${numLat.toFixed(4)},${numLng.toFixed(4)}`;

  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey);
  }

  // 1. Check if user is genuinely INSIDE an operational plant site (tight <= 100m boundary)
  const siteCheck = resolveSangliLandmark(numLat, numLng);
  if (siteCheck.isKnownLandmark && siteCheck.distanceMeters !== null && siteCheck.distanceMeters <= 100) {
    const res = {
      landmarkName: siteCheck.landmarkName,
      address: siteCheck.address,
      shortName: siteCheck.shortName,
      city: 'Plant HQ'
    };
    reverseGeocodeCache.set(cacheKey, res);
    return res;
  }

  // 2. Resolve genuine real-world street / neighborhood address via BigDataCloud & OpenStreetMap Nominatim
  try {
    const bdcPromise = fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${numLat}&longitude=${numLng}&localityLanguage=en`
    ).then((r) => (r.ok ? r.json() : null)).catch(() => null);

    const nomController = new AbortController();
    const nomTimeout = setTimeout(() => nomController.abort(), 800);
    const nomPromise = fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${numLat}&lon=${numLng}&zoom=18&addressdetails=1`,
      { signal: nomController.signal, headers: { Accept: 'application/json' } }
    ).then((r) => {
      clearTimeout(nomTimeout);
      return r.ok ? r.json() : null;
    }).catch(() => null);

    // Ultra-fast resolution: capped at 400ms to keep mobile punch under 1 second
    const bdcData = await Promise.race([
      bdcPromise,
      new Promise((res) => setTimeout(() => res(null), 400))
    ]);

    if (bdcData && (bdcData.locality || bdcData.city)) {
      const loc = bdcData.locality || bdcData.city;
      const city = bdcData.city || loc;
      const state = bdcData.principalSubdivision || 'Maharashtra';
      const landmarkName = loc ? `${loc}, ${city}` : city;
      const address = `${loc}, ${city}, ${state}`;
      const res = {
        landmarkName,
        address,
        shortName: loc,
        city
      };
      reverseGeocodeCache.set(cacheKey, res);
      return res;
    }

    const nomData = await nomPromise;
    if (nomData && nomData.display_name) {
      const addr = nomData.address || {};
      const road = addr.road || addr.suburb || addr.neighbourhood || addr.residential || '';
      const city = addr.city || addr.town || addr.district || 'Sangli';
      const landmarkName = road ? `${road}, ${city}` : city;
      const res = {
        landmarkName,
        address: nomData.display_name,
        shortName: road || city,
        city
      };
      reverseGeocodeCache.set(cacheKey, res);
      return res;
    }
  } catch {}

  // 3. Fallback: Clean coordinates format without fake landmarks or guessed cities
  const coordRes = {
    landmarkName: `${numLat.toFixed(4)}°N, ${numLng.toFixed(4)}°E`,
    address: `${numLat.toFixed(5)}°N, ${numLng.toFixed(5)}°E`,
    shortName: `${numLat.toFixed(3)}°, ${numLng.toFixed(3)}°`,
    city: 'GPS Fix'
  };
  reverseGeocodeCache.set(cacheKey, coordRes);
  return coordRes;
}

/**
 * High-Precision Device Geolocation Fetcher
 * Tier 1: Flutter Native Hardware GPS Fix (mobile app bridge)
 * Tier 2: Browser Hardware GPS with High Accuracy
 * Tier 3: Browser Wi-Fi / Cell Triangulation
 * Strictly zero hardcoded coordinates, zero IP geolocation estimates.
 */
export async function getAccurateDeviceLocation(options = {}) {
  const { forceFresh = false } = options;

  // Step 0: Priority 1 - Native Flutter Hardware GPS Fix via Bridge (mobile app is authoritative)
  if (nativeTracking.isNativeApp()) {
    try {
      // 1. Instant check: If we already have a warm hardware GPS fix in memory, return it immediately (<1ms)
      if (!forceFresh) {
        const cached = nativeTracking.getLatestNativeFix();
        if (cached && cached.lat && cached.lng) {
          const nLat = Number(Number(cached.lat).toFixed(6));
          const nLng = Number(Number(cached.lng).toFixed(6));
          const addrInfo = await resolveAccurateAddress(nLat, nLng);
          return {
            lat: nLat,
            lng: nLng,
            accuracy: Math.round(cached.accuracy || 15),
            timestamp: cached.timestamp || new Date().toISOString(),
            address: addrInfo.address,
            landmarkName: addrInfo.landmarkName,
            shortName: addrInfo.shortName,
            source: 'NATIVE_HARDWARE_GPS_CACHED',
            isFallback: false
          };
        }
      }

      // 2. Request a fresh real GNSS satellite ping from the phone's GPS hardware (wait up to 1500ms max)
      const nativeFix = await nativeTracking.requestImmediateFix(1500);
      if (nativeFix && nativeFix.lat && nativeFix.lng) {
        const nLat = Number(Number(nativeFix.lat).toFixed(6));
        const nLng = Number(Number(nativeFix.lng).toFixed(6));
        const addrInfo = await resolveAccurateAddress(nLat, nLng);
        return {
          lat: nLat,
          lng: nLng,
          accuracy: Math.round(nativeFix.accuracy || 10),
          timestamp: nativeFix.timestamp || new Date().toISOString(),
          address: addrInfo.address,
          landmarkName: addrInfo.landmarkName,
          shortName: addrInfo.shortName,
          source: 'NATIVE_HARDWARE_GPS',
          isFallback: false
        };
      }

      // 3. Fallback to latest real hardware fix recorded by foreground service
      const cached = nativeTracking.getLatestNativeFix();
      if (cached && cached.lat && cached.lng) {
        const nLat = Number(Number(cached.lat).toFixed(6));
        const nLng = Number(Number(cached.lng).toFixed(6));
        const addrInfo = await resolveAccurateAddress(nLat, nLng);
        return {
          lat: nLat,
          lng: nLng,
          accuracy: Math.round(cached.accuracy || 15),
          timestamp: cached.timestamp || new Date().toISOString(),
          address: addrInfo.address,
          landmarkName: addrInfo.landmarkName,
          shortName: addrInfo.shortName,
          source: 'NATIVE_HARDWARE_GPS_CACHED',
          isFallback: false
        };
      }
    } catch (_) {}

    // In native mobile app, NEVER fall back to browser network IP geolocation!
    // Browser WebView geolocation resolves to ISP gateway in Pune/Mumbai rather than actual device location.
    const lastResort = nativeTracking.getLatestNativeFix();
    if (lastResort && lastResort.lat && lastResort.lng) {
      const nLat = Number(Number(lastResort.lat).toFixed(6));
      const nLng = Number(Number(lastResort.lng).toFixed(6));
      const addrInfo = await resolveAccurateAddress(nLat, nLng);
      return {
        lat: nLat,
        lng: nLng,
        accuracy: Math.round(lastResort.accuracy || 20),
        timestamp: lastResort.timestamp || new Date().toISOString(),
        address: addrInfo.address,
        landmarkName: addrInfo.landmarkName,
        shortName: addrInfo.shortName,
        source: 'NATIVE_HARDWARE_GPS_CACHED',
        isFallback: false
      };
    }
  }

  // Step 1: Check Browser Geolocation
  if (typeof window !== 'undefined' && navigator.geolocation) {
    // Helper to wrap getCurrentPosition in a promise
    const tryGeo = (geoOptions) => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => reject(err),
          geoOptions
        );
      });
    };

    // Tier 1: Try High Accuracy (GPS hardware)
    try {
      const pos = await tryGeo({
        enableHighAccuracy: true,
        timeout: 3500,
        maximumAge: forceFresh ? 0 : 30000
      });

      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      const accuracy = Math.round(pos.coords.accuracy || 15);
      const addrInfo = await resolveAccurateAddress(lat, lng);

      return {
        lat,
        lng,
        accuracy,
        timestamp: new Date().toISOString(),
        address: addrInfo.address,
        landmarkName: addrInfo.landmarkName,
        shortName: addrInfo.shortName,
        source: 'GPS_HIGH_ACCURACY',
        isFallback: false
      };
    } catch (highErr) {
      console.warn('GPS High-accuracy acquisition notice, falling back to Wi-Fi/Network positioning:', highErr.message);
    }

    // Tier 2: Try Low Accuracy (Wi-Fi SSID / Cell tower triangulation)
    try {
      const pos = await tryGeo({
        enableHighAccuracy: false,
        timeout: 2500,
        maximumAge: forceFresh ? 0 : 120000
      });

      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      const accuracy = Math.round(pos.coords.accuracy || 45);

      const addrInfo = await resolveAccurateAddress(lat, lng);

      return {
        lat,
        lng,
        accuracy,
        timestamp: new Date().toISOString(),
        address: addrInfo.address,
        landmarkName: addrInfo.landmarkName,
        shortName: addrInfo.shortName,
        source: 'WIFI_CELL_TRIANGULATION',
        isFallback: false
      };
    } catch (lowErr) {
      console.warn('Network location acquisition notice:', lowErr.message);
    }
  }

  // Strict: NEVER use IP Geolocation or hardcoded fallback coordinates!
  // IP addresses resolve to ISP server hubs (e.g. Pune/Mumbai gateways) rather than actual device location.
  throw new Error('Real GPS satellite fix could not be acquired. Please ensure Device Location (GPS) is turned ON and try again.');
}
