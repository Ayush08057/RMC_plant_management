/**
 * Road Snapping & Real Road Network Routing Service
 * Snaps raw GPS telemetry pins to real road network geometry via OSRM (Open Source Routing Machine)
 * with graceful in-memory caching and offline straight-line fallback.
 */

// In-memory cache for snapped routes and single points to avoid redundant network calls
const snappedRouteCache = new Map();
const snappedPointCache = new Map();

/**
 * Haversine distance in meters between two lat/lng objects
 */
function haversineMeters(a, b) {
  if (!a || !b) return 0;
  const R = 6371000;
  const f1 = (Number(a.lat) * Math.PI) / 180;
  const f2 = (Number(b.lat) * Math.PI) / 180;
  const df = ((Number(b.lat) - Number(a.lat)) * Math.PI) / 180;
  const dl = ((Number(b.lng) - Number(a.lng)) * Math.PI) / 180;
  const aa = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

/**
 * Snaps a single GPS coordinate to the nearest real drivable road center
 * @param {number} lat - Raw latitude
 * @param {number} lng - Raw longitude
 * @returns {Promise<{lat: number, lng: number, roadName: string|null, snapped: boolean, offsetMeters: number}>}
 */
export async function snapCoordinateToRoad(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return { lat, lng, roadName: null, snapped: false, offsetMeters: 0 };
  }

  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) {
    return { lat, lng, roadName: null, snapped: false, offsetMeters: 0 };
  }

  const cacheKey = `${numLat.toFixed(5)},${numLng.toFixed(5)}`;
  if (snappedPointCache.has(cacheKey)) {
    return snappedPointCache.get(cacheKey);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://router.project-osrm.org/nearest/v1/driving/${numLng},${numLat}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.code === 'Ok' && data.waypoints && data.waypoints[0]) {
        const wp = data.waypoints[0];
        const snappedLng = wp.location[0];
        const snappedLat = wp.location[1];
        const offsetMeters = Math.round(wp.distance || 0);

        // Only snap if road is reasonably close (< 400m); otherwise preserve true pin
        if (offsetMeters <= 400) {
          const result = {
            lat: snappedLat,
            lng: snappedLng,
            rawLat: numLat,
            rawLng: numLng,
            roadName: wp.name || null,
            snapped: true,
            offsetMeters
          };
          snappedPointCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch {
    // Graceful offline fallback
  }

  const fallback = {
    lat: numLat,
    lng: numLng,
    rawLat: numLat,
    rawLng: numLng,
    roadName: null,
    snapped: false,
    offsetMeters: 0
  };
  snappedPointCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Calculates a road-snapped polyline trail along real streets/highways between visited waypoints
 * @param {Array<{lat: number, lng: number}>} stops - Array of waypoint stops
 * @returns {Promise<{coords: Array<[number, number]>, distanceKm: number, durationMinutes: number, snapped: boolean}>}
 */
export async function fetchRoadSnappedRoute(stops) {
  if (!Array.isArray(stops) || stops.length < 2) {
    const coords = (stops || []).map((s) => [Number(s.lat), Number(s.lng)]);
    return { coords, distanceKm: 0.0, durationMinutes: 0, snapped: false };
  }

  let validStops = stops.filter((s) => s && s.lat !== null && s.lng !== null && !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)));
  if (validStops.length < 2) {
    const coords = validStops.map((s) => [Number(s.lat), Number(s.lng)]);
    return { coords, distanceKm: 0.0, durationMinutes: 0, snapped: false };
  }

  // Geographic sanity check: remove waypoints that are outliers (> 80 km from the median cluster).
  // This eliminates fake Pune/Mumbai fallback coordinates that contaminate a Sangli shift route.
  if (validStops.length > 1) {
    const sortedLats = [...validStops].map(s => Number(s.lat)).sort((a, b) => a - b);
    const medianLat = sortedLats[Math.floor(sortedLats.length / 2)];
    const sortedLngs = [...validStops].map(s => Number(s.lng)).sort((a, b) => a - b);
    const medianLng = sortedLngs[Math.floor(sortedLngs.length / 2)];
    const center = { lat: medianLat, lng: medianLng };
    const filtered = validStops.filter(s => haversineMeters(center, s) <= 80000);
    if (filtered.length >= 2) {
      validStops = filtered;
    }
  }

  // Collapse indoor GPS jitter (< 60m between consecutive points) while preserving start & end
  const significantStops = [validStops[0]];
  for (let i = 1; i < validStops.length - 1; i++) {
    if (haversineMeters(significantStops[significantStops.length - 1], validStops[i]) >= 60) {
      significantStops.push(validStops[i]);
    }
  }
  const endStop = validStops[validStops.length - 1];
  if (haversineMeters(significantStops[significantStops.length - 1], endStop) >= 60) {
    significantStops.push(endStop);
  }

  // Compute raw GPS path distance across valid stops
  let rawPathMeters = 0;
  for (let i = 0; i < significantStops.length - 1; i++) {
    rawPathMeters += haversineMeters(significantStops[i], significantStops[i + 1]);
  }

  // Stationary / indoor drift (< 100m actual movement): never call OSRM driving router (prevents fake block loops)
  if (significantStops.length < 2 || rawPathMeters < 100) {
    return {
      coords: validStops.map((s) => [Number(s.lat), Number(s.lng)]),
      distanceKm: 0.0,
      durationMinutes: 0,
      snapped: false,
    };
  }

  const cacheKey = significantStops
    .map((s) => `${Number(s.lat).toFixed(4)},${Number(s.lng).toFixed(4)}`)
    .join(';');

  if (snappedRouteCache.has(cacheKey)) {
    return snappedRouteCache.get(cacheKey);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    // OSRM expects coordinates in lng,lat order separated by semicolons
    const coordString = significantStops
      .map((s) => `${Number(s.lng).toFixed(5)},${Number(s.lat).toFixed(5)}`)
      .join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.code === 'Ok' && data.routes && data.routes[0]) {
        const route = data.routes[0];
        const osrmDistMeters = Number(route.distance || 0);
        // Reject impossible block-circling OSRM detours when GPS points moved far less
        const isLikelyDetourLoop = osrmDistMeters > (rawPathMeters * 2.2 + 250);
        if (!isLikelyDetourLoop) {
          const leafletCoords = route.geometry.coordinates.map((c) => [c[1], c[0]]);
          const distanceKm = Number((osrmDistMeters / 1000).toFixed(1));
          const durationMinutes = Math.round((route.duration || 0) / 60);

          const result = {
            coords: leafletCoords,
            distanceKm,
            durationMinutes,
            snapped: true
          };
          snappedRouteCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch {
    // Network or timeout: gracefully fall back to straight line segments
  }

  const fallback = {
    coords: validStops.map((s) => [Number(s.lat), Number(s.lng)]),
    distanceKm: 0.0,
    durationMinutes: 0,
    snapped: false
  };
  snappedRouteCache.set(cacheKey, fallback);
  return fallback;
}
