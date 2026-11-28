/**
 * Professional GPS Route Filter & Anti-Spider Cleaning Engine
 * Ported from high-precision fleet tracking system in crm2-FINAL.
 * Eliminates stationary jitter ("spider-webbing"), removes GPS spike anomalies,
 * and collapses long dwell/halt stops (10-15+ mins) into clean, distinct stop waypoints.
 */

/**
 * Calculates Haversine distance in meters between two coordinates
 */
export function getHaversineDistanceMeters(p1, p2) {
  if (!p1 || !p2) return 0;
  const lat1 = Number(p1.lat);
  const lng1 = Number(p1.lng);
  const lat2 = Number(p2.lat);
  const lng2 = Number(p2.lng);

  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) return 0;

  const R = 6371e3; // Earth radius in meters
  const f1 = (lat1 * Math.PI) / 180;
  const f2 = (lat2 * Math.PI) / 180;
  const df = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(df / 2) * Math.sin(df / 2) +
    Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 0. Filter extreme geographic outliers (e.g. fake default fallbacks or GPS teleport jumps > 50km from route cluster)
 */
export function filterGeographicOutliers(points, maxDistanceMeters = 50000) {
  if (!Array.isArray(points) || points.length <= 1) return points || [];
  
  // Anchor on the verified start / punch-in location (first recorded waypoint)
  const startPoint = points[0];
  const startLat = Number(startPoint?.lat);
  const startLng = Number(startPoint?.lng);

  if (points.length === 2 && !isNaN(startLat) && !isNaN(startLng)) {
    const dist = getHaversineDistanceMeters(startPoint, points[1]);
    if (dist > maxDistanceMeters) {
      // Point 1 is an extreme outlier (e.g. Pune/Mumbai gateway jump of 200km)
      // Collapse point 1 to start point rather than keeping a fake 200km teleport
      return [
        startPoint,
        {
          ...points[1],
          lat: startLat,
          lng: startLng,
          address: startPoint.address || `${startLat.toFixed(5)}°N, ${startLng.toFixed(5)}°E`,
          title: points[1].title || 'Punch-Out Station',
          distanceKm: 0.0
        }
      ];
    }
    return points;
  }

  const sortedLats = points.map(p => Number(p.lat)).filter(v => !isNaN(v)).sort((a, b) => a - b);
  const sortedLngs = points.map(p => Number(p.lng)).filter(v => !isNaN(v)).sort((a, b) => a - b);
  if (sortedLats.length === 0 || sortedLngs.length === 0) return points;

  const medianLat = sortedLats[Math.floor(sortedLats.length / 2)];
  const medianLng = sortedLngs[Math.floor(sortedLngs.length / 2)];
  const center = { lat: medianLat, lng: medianLng };

  const valid = points.filter(p => {
    const dist = getHaversineDistanceMeters(center, p);
    return dist <= maxDistanceMeters;
  });

  return valid.length > 0 ? valid : points;
}

function getPointTimestampMs(pt) {
  if (!pt) return 0;
  if (typeof pt.ts === 'number' && Number.isFinite(pt.ts) && pt.ts > 0) return pt.ts;
  if (pt.timestamp) {
    const parsed = Date.parse(pt.timestamp);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function isProtectedShiftEndpoint(pt) {
  return Boolean(
    pt &&
    (pt.category === 'Punch-In Location' ||
      pt.category === 'Punch In' ||
      pt.status === 'Punch-In Station' ||
      pt.category === 'Punch-Out Location' ||
      pt.status === 'Punch-Out Station' ||
      pt.category === 'Site Visit' ||
      pt.status === 'Visited Site')
  );
}

/**
 * 1. Filter out GPS teleportation spikes / satellite acquisition jumps (> 130 km/h or sharp mid-route bounce)
 */
export function filterGpsSpikes(points, maxDistMeters = 120) {
  if (!Array.isArray(points) || points.length < 3) return points || [];
  let pts = [...points];

  // Clean initial spike/jump (never strip verified Punch-In anchor)
  while (pts.length >= 3) {
    if (isProtectedShiftEndpoint(pts[0])) {
      break;
    }
    const d01 = getHaversineDistanceMeters(pts[0], pts[1]);
    const d12 = getHaversineDistanceMeters(pts[1], pts[2]);
    const t0 = getPointTimestampMs(pts[0]);
    const t1 = getPointTimestampMs(pts[1]);
    const timeDelta01 = t0 && t1 ? Math.abs(t1 - t0) / 1000 : 0;
    const speed01 = timeDelta01 > 0 ? (d01 / timeDelta01) * 3.6 : 0;

    if (d01 > 100 && speed01 > 120 && d12 <= maxDistMeters) {
      pts.shift();
    } else {
      break;
    }
  }

  // Clean trailing spike (never strip verified Punch-Out endpoint)
  while (pts.length >= 3) {
    const n = pts.length;
    if (isProtectedShiftEndpoint(pts[n - 1])) {
      break;
    }
    const dLast = getHaversineDistanceMeters(pts[n - 2], pts[n - 1]);
    const tPrev = getPointTimestampMs(pts[n - 2]);
    const tLast = getPointTimestampMs(pts[n - 1]);
    const timeDelta = tPrev && tLast ? Math.abs(tLast - tPrev) / 1000 : 0;
    const speed = timeDelta > 0 ? (dLast / timeDelta) * 3.6 : 0;

    if (dLast > 100 && speed > 120) {
      pts.pop();
    } else {
      break;
    }
  }

  // Pass 1: Remove impossible instantaneous GPS teleports (> 140 km/h over > 500m)
  let removedAny = true;
  let guard = 0;
  while (removedAny && pts.length >= 3 && guard < 25) {
    removedAny = false;
    guard++;
    const nextPts = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = nextPts[nextPts.length - 1];
      const curr = pts[i];
      if (isProtectedShiftEndpoint(curr)) {
        nextPts.push(curr);
        continue;
      }
      const dPrevCurr = getHaversineDistanceMeters(prev, curr);
      const tPrev = getPointTimestampMs(prev);
      const tCurr = getPointTimestampMs(curr);
      const dtSec = tPrev && tCurr ? Math.abs(tCurr - tPrev) / 1000 : 0;
      const speedKmh = dtSec > 0 ? (dPrevCurr / dtSec) * 3.6 : 0;

      if (dPrevCurr > 500 && speedKmh > 140) {
        removedAny = true;
        continue;
      }
      nextPts.push(curr);
    }
    nextPts.push(pts[pts.length - 1]);
    pts = nextPts;
  }

  // Pass 2: Remove brief (< 3 min) single-point out-and-back GPS bounces (never collapses genuine multi-minute turnarounds)
  removedAny = true;
  guard = 0;
  while (removedAny && pts.length >= 3 && guard < 20) {
    removedAny = false;
    guard++;
    const nextPts = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = nextPts[nextPts.length - 1];
      const curr = pts[i];
      const next = pts[i + 1];

      if (isProtectedShiftEndpoint(curr)) {
        nextPts.push(curr);
        continue;
      }

      const dPrevCurr = getHaversineDistanceMeters(prev, curr);
      const dCurrNext = getHaversineDistanceMeters(curr, next);
      const dPrevNext = getHaversineDistanceMeters(prev, next);

      const tPrev = getPointTimestampMs(prev);
      const tNext = getPointTimestampMs(next);
      const dtWindowSec = tPrev && tNext ? Math.abs(tNext - tPrev) / 1000 : 0;

      const isBriefBounce =
        dtWindowSec > 0 &&
        dtWindowSec <= 180 &&
        dPrevCurr > 1500 &&
        dCurrNext > 1500 &&
        dPrevNext < (dPrevCurr + dCurrNext) * 0.35;

      if (isBriefBounce) {
        removedAny = true;
        continue;
      }
      nextPts.push(curr);
    }
    nextPts.push(pts[pts.length - 1]);
    pts = nextPts;
  }

  return pts;
}

/**
 * 2. Collapse stationary stay points (Anti-Spider Algorithm)
 * When an employee stops at one place for 10-15+ minutes, GPS sensors create random wandering
 * lines ("spider web"). This function collapses that stationary jitter into a single centroid
 * and tags it with stayMinutes duration.
 */
export function filterStayPoints(points, maxRadiusMeters = 25, minStayDurationMs = 180000) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const cleaned = [];
  let cluster = [];
  let sumLat = 0;
  let sumLng = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (cluster.length === 0) {
      cluster.push(p);
      sumLat = Number(p.lat);
      sumLng = Number(p.lng);
      continue;
    }

    const centerLat = sumLat / cluster.length;
    const centerLng = sumLng / cluster.length;
    const center = { lat: centerLat, lng: centerLng };

    if (getHaversineDistanceMeters(center, p) <= maxRadiusMeters) {
      cluster.push(p);
      sumLat += Number(p.lat);
      sumLng += Number(p.lng);
    } else {
      // Cluster finished
      const tStart = cluster[0].ts || (cluster[0].timestamp ? new Date(cluster[0].timestamp).getTime() : 0);
      const tEnd = cluster[cluster.length - 1].ts || (cluster[cluster.length - 1].timestamp ? new Date(cluster[cluster.length - 1].timestamp).getTime() : 0);
      const stayDuration = tStart && tEnd ? tEnd - tStart : 0;

      if (stayDuration >= minStayDurationMs && cluster.length > 2) {
        // Collapsed halt stay point
        const centroid = {
          ...cluster[0],
          lat: Number((sumLat / cluster.length).toFixed(6)),
          lng: Number((sumLng / cluster.length).toFixed(6)),
          isHaltStop: true,
          stayMinutes: Math.round(stayDuration / 60000),
        };
        cleaned.push(centroid);
      } else {
        // Normal transit points
        for (let j = 0; j < cluster.length; j++) {
          cleaned.push(cluster[j]);
        }
      }

      cluster = [p];
      sumLat = Number(p.lat);
      sumLng = Number(p.lng);
    }
  }

  // Check tail cluster
  if (cluster.length > 0) {
    const tStart = cluster[0].ts || (cluster[0].timestamp ? new Date(cluster[0].timestamp).getTime() : 0);
    const tEnd = cluster[cluster.length - 1].ts || (cluster[cluster.length - 1].timestamp ? new Date(cluster[cluster.length - 1].timestamp).getTime() : 0);
    const stayDuration = tStart && tEnd ? tEnd - tStart : 0;

    if (stayDuration >= minStayDurationMs && cluster.length > 2) {
      const centroid = {
        ...cluster[0],
        lat: Number((sumLat / cluster.length).toFixed(6)),
        lng: Number((sumLng / cluster.length).toFixed(6)),
        isHaltStop: true,
        stayMinutes: Math.round(stayDuration / 60000),
      };
      cleaned.push(centroid);
    } else {
      for (let j = 0; j < cluster.length; j++) {
        cleaned.push(cluster[j]);
      }
    }
  }

  return cleaned;
}

/**
 * 3. Filter micro stationary noise (< 15 meters)
 */
export function filterStationaryNoise(points, minDistMeters = 15) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const cleaned = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const dist = getHaversineDistanceMeters(cleaned[cleaned.length - 1], points[i]);
    if (dist >= minDistMeters) {
      cleaned.push(points[i]);
    }
  }

  // Always keep the final end punch-out point
  if (points.length > 1 && cleaned[cleaned.length - 1] !== points[points.length - 1]) {
    cleaned.push(points[points.length - 1]);
  }

  return cleaned;
}

/**
 * Calculates exact route distance traveled in Kilometers
 */
export function calculateAccurateRouteDistanceKm(cleanedPoints) {
  if (!Array.isArray(cleanedPoints) || cleanedPoints.length < 2) return 0.0;
  let totalMeters = 0;

  for (let i = 0; i < cleanedPoints.length - 1; i++) {
    totalMeters += getHaversineDistanceMeters(cleanedPoints[i], cleanedPoints[i + 1]);
  }

  return Number((totalMeters / 1000).toFixed(2));
}

/**
 * Master Pipeline: Transforms raw GPS breadcrumbs into a clean, sharp, non-spider trajectory
 */
export function cleanRawRoutePipeline(rawTrail) {
  if (!Array.isArray(rawTrail) || rawTrail.length < 2) return rawTrail || [];

  // Step 0: Prune extreme geographic anomalies / fake fallback jumps (> 50 km from route cluster)
  let step0 = filterGeographicOutliers(rawTrail, 50000);

  // Step 1: Remove impossible GPS teleports
  let step1 = filterGpsSpikes(step0, 120);

  // Step 2: Collapse 10-15+ minute stops into stationary centroids (NO SPIDERS)
  let step2 = filterStayPoints(step1, 25, 180000); // 25 meters radius, min 3 minutes

  // Step 3: Strip stationary noise
  let step3 = filterStationaryNoise(step2, 12);

  // Step 4: Re-calculate progressive distanceKm for every waypoint
  let cumDistanceMeters = 0;
  const finalWaypoints = step3.map((pt, idx) => {
    if (idx > 0) {
      cumDistanceMeters += getHaversineDistanceMeters(step3[idx - 1], pt);
    }
    return {
      ...pt,
      stopNo: idx + 1,
      distanceKm: Number((cumDistanceMeters / 1000).toFixed(2)),
    };
  });

  return finalWaypoints;
}
