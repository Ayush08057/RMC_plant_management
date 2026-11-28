/**
 * Road Snapping & Real Road Network Routing Service
 * Snaps raw GPS telemetry pins to real road network geometry via OSRM (Open Source Routing Machine)
 * with graceful in-memory caching, dual endpoint fallback (Project-OSRM + OSM Germany),
 * chunked requests for long routes, and offline straight-line fallback.
 */

// In-memory cache for snapped routes and single points (strictly cache successful snaps only!)
const snappedRouteCache = new Map();
const snappedPointCache = new Map();

// Maximum waypoints per OSRM request (URL length safety limit ~8000 chars)
const OSRM_CHUNK_SIZE = 25;

/**
 * Haversine distance in meters between two lat/lng objects
 */
function haversineMeters(a, b) {
  if (!a || !b) return 0;
  const R = 6371000;
  const latA = Number(a.lat);
  const lngA = Number(a.lng);
  const latB = Number(b.lat);
  const lngB = Number(b.lng);
  if (isNaN(latA) || isNaN(lngA) || isNaN(latB) || isNaN(lngB)) return 0;

  const f1 = (latA * Math.PI) / 180;
  const f2 = (latB * Math.PI) / 180;
  const df = ((latB - latA) * Math.PI) / 180;
  const dl = ((lngB - lngA) * Math.PI) / 180;
  const aa = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

/**
 * Fetch a single OSRM road-following segment between a chunk of stops.
 * Tries router.project-osrm.org first, then routing.openstreetmap.de as secondary fallback.
 * Returns array of [lat, lng] leaflet coords, or null on failure.
 */
async function fetchOsrmChunk(chunkStops) {
  if (!chunkStops || chunkStops.length < 2) return null;

  const coordString = chunkStops
    .map((s) => `${Number(s.lng).toFixed(5)},${Number(s.lat).toFixed(5)}`)
    .join(';');

  const rawPathMeters = chunkStops.reduce((acc, s, i) => {
    if (i === 0) return acc;
    return acc + haversineMeters(chunkStops[i - 1], s);
  }, 0);

  const endpoints = [
    `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`,
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordString}?overview=full&geometries=geojson`
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.code === 'Ok' && data.routes && data.routes[0]) {
          const route = data.routes[0];
          const osrmDist = Number(route.distance || 0);

          // Reject artificial highway loops when OSRM detours excessively from direct GPS geometry
          const maxAllowedDetourMeters = chunkStops.length === 2 && rawPathMeters < 800
            ? rawPathMeters * 3.0 + 1000
            : Math.max(rawPathMeters * 2.1 + 1500, 1200);
          const isReasonableDetour = osrmDist <= maxAllowedDetourMeters;

          if (isReasonableDetour && route.geometry?.coordinates?.length > 1) {
            return route.geometry.coordinates.map((c) => [c[1], c[0]]);
          }
        }
      }
    } catch {
      // Try next endpoint mirror
    }
  }

  return null;
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

  const urls = [
    `https://router.project-osrm.org/nearest/v1/driving/${numLng},${numLat}`,
    `https://routing.openstreetmap.de/routed-car/nearest/v1/driving/${numLng},${numLat}`
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

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
      // Try next mirror
    }
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
  return fallback;
}

/**
 * Calculates a road-snapped polyline trail along real streets/highways between visited waypoints.
 * Handles large GPS trails via chunked OSRM requests (max 25 coords per chunk).
 * Falls back to raw GPS straight-line segments gracefully when OSRM is unreachable.
 * Strictly never caches failed responses so road snapping retries smoothly.
 * @param {Array<{lat: number, lng: number}>} stops - Array of waypoint stops
 * @returns {Promise<{coords: Array<[number, number]>, distanceKm: number, durationMinutes: number, snapped: boolean}>}
 */
export async function fetchRoadSnappedRoute(stops) {
  if (!Array.isArray(stops) || stops.length < 2) {
    const coords = (stops || []).map((s) => [Number(s.lat), Number(s.lng)]);
    return { coords, distanceKm: 0.0, durationMinutes: 0, snapped: false };
  }

  let validStops = stops.filter((s) => s && s.lat != null && s.lng != null && !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)));
  if (validStops.length < 2) {
    const coords = validStops.map((s) => [Number(s.lat), Number(s.lng)]);
    return { coords, distanceKm: 0.0, durationMinutes: 0, snapped: false };
  }

  // Geographic sanity check: remove waypoints that are outliers (> 80 km from the median cluster).
  if (validStops.length > 2) {
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

  // Deduplicate consecutive stationary jitter (< 25m), but ALWAYS preserve first and last points
  const significantStops = [validStops[0]];
  for (let i = 1; i < validStops.length - 1; i++) {
    const current = validStops[i];
    const prev = significantStops[significantStops.length - 1];
    if (haversineMeters(prev, current) >= 25) {
      significantStops.push(current);
    }
  }
  const lastStop = validStops[validStops.length - 1];
  if (significantStops.length === 1 || haversineMeters(significantStops[significantStops.length - 1], lastStop) >= 15) {
    significantStops.push(lastStop);
  } else {
    // Replace last element with true endpoint
    significantStops[significantStops.length - 1] = lastStop;
  }

  if (significantStops.length < 2) {
    return {
      coords: validStops.map((s) => [Number(s.lat), Number(s.lng)]),
      distanceKm: 0.0,
      durationMinutes: 0,
      snapped: false,
    };
  }

  // Calculate total straight-line distance across significant stops
  let rawPathMeters = 0;
  for (let i = 0; i < significantStops.length - 1; i++) {
    rawPathMeters += haversineMeters(significantStops[i], significantStops[i + 1]);
  }

  // If movement is negligible (< 30m total), return direct point
  if (rawPathMeters < 30) {
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
    let allLeafletCoords = [];

    if (significantStops.length <= OSRM_CHUNK_SIZE) {
      const chunkCoords = await fetchOsrmChunk(significantStops);
      if (chunkCoords && chunkCoords.length > 1) {
        allLeafletCoords = chunkCoords;
      }
    } else {
      // Chunked OSRM calls for long routes — overlap by 1 point at chunk boundaries
      let idx = 0;
      while (idx < significantStops.length - 1) {
        const chunk = significantStops.slice(idx, idx + OSRM_CHUNK_SIZE);
        if (chunk.length < 2) break;

        const chunkCoords = await fetchOsrmChunk(chunk);
        if (chunkCoords && chunkCoords.length > 1) {
          if (allLeafletCoords.length === 0) {
            allLeafletCoords.push(...chunkCoords);
          } else {
            allLeafletCoords.push(...chunkCoords.slice(1));
          }
        } else {
          // If a chunk fails, fall back to direct straight-line points for that segment
          if (allLeafletCoords.length === 0) {
            allLeafletCoords.push(...chunk.map((s) => [Number(s.lat), Number(s.lng)]));
          } else {
            allLeafletCoords.push(...chunk.slice(1).map((s) => [Number(s.lat), Number(s.lng)]));
          }
        }

        idx += OSRM_CHUNK_SIZE - 1;
      }
    }

    if (allLeafletCoords.length > 1) {
      let roadDistMeters = 0;
      for (let i = 0; i < allLeafletCoords.length - 1; i++) {
        roadDistMeters += haversineMeters(
          { lat: allLeafletCoords[i][0], lng: allLeafletCoords[i][1] },
          { lat: allLeafletCoords[i + 1][0], lng: allLeafletCoords[i + 1][1] }
        );
      }
      const distanceKm = Number((roadDistMeters / 1000).toFixed(1));

      const result = {
        coords: allLeafletCoords,
        distanceKm,
        durationMinutes: 0,
        snapped: true
      };

      // Only cache successful road snapped routes!
      snappedRouteCache.set(cacheKey, result);
      return result;
    }
  } catch {
    // Offline fallback
  }

  // Graceful fallback to raw straight-line coords without caching failure
  return {
    coords: validStops.map((s) => [Number(s.lat), Number(s.lng)]),
    distanceKm: Number((rawPathMeters / 1000).toFixed(1)),
    durationMinutes: 0,
    snapped: false
  };
}
