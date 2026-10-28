/**
 * Road Snapping & Real Road Network Routing Service
 * Snaps raw GPS telemetry pins to real road network geometry via OSRM (Open Source Routing Machine)
 * with graceful in-memory caching and offline straight-line fallback.
 */

// In-memory cache for snapped routes and single points to avoid redundant network calls
const snappedRouteCache = new Map();
const snappedPointCache = new Map();

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

  const validStops = stops.filter((s) => s && s.lat !== null && s.lng !== null && !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)));
  if (validStops.length < 2) {
    const coords = validStops.map((s) => [Number(s.lat), Number(s.lng)]);
    return { coords, distanceKm: 0.0, durationMinutes: 0, snapped: false };
  }

  const cacheKey = validStops
    .map((s) => `${Number(s.lat).toFixed(4)},${Number(s.lng).toFixed(4)}`)
    .join(';');

  if (snappedRouteCache.has(cacheKey)) {
    return snappedRouteCache.get(cacheKey);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    // OSRM expects coordinates in lng,lat order separated by semicolons
    const coordString = validStops
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
        // Convert GeoJSON [lng, lat] coordinates to Leaflet [lat, lng]
        const leafletCoords = route.geometry.coordinates.map((c) => [c[1], c[0]]);
        const distanceKm = Number((route.distance / 1000).toFixed(1));
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
