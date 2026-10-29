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
 * 1. Filter out GPS teleportation spikes / satellite acquisition jumps (> 130 km/h impossible jumps)
 */
export function filterGpsSpikes(points, maxDistMeters = 120) {
  if (!Array.isArray(points) || points.length < 3) return points || [];
  const pts = [...points];

  // Clean initial spike/jump (e.g. cached cell tower fix before GPS lock)
  while (pts.length >= 3) {
    const d01 = getHaversineDistanceMeters(pts[0], pts[1]);
    const d12 = getHaversineDistanceMeters(pts[1], pts[2]);
    const t0 = pts[0].ts || (pts[0].timestamp ? new Date(pts[0].timestamp).getTime() : 0);
    const t1 = pts[1].ts || (pts[1].timestamp ? new Date(pts[1].timestamp).getTime() : 0);
    const timeDelta01 = t0 && t1 ? Math.abs(t1 - t0) / 1000 : 0;
    const speed01 = timeDelta01 > 0 ? (d01 / timeDelta01) * 3.6 : 0;

    if (d01 > 100 && speed01 > 120 && d12 <= maxDistMeters) {
      pts.shift();
    } else {
      break;
    }
  }

  // Clean trailing spike
  while (pts.length >= 3) {
    const n = pts.length;
    const dLast = getHaversineDistanceMeters(pts[n - 2], pts[n - 1]);
    const tPrev = pts[n - 2].ts || (pts[n - 2].timestamp ? new Date(pts[n - 2].timestamp).getTime() : 0);
    const tLast = pts[n - 1].ts || (pts[n - 1].timestamp ? new Date(pts[n - 1].timestamp).getTime() : 0);
    const timeDelta = tPrev && tLast ? Math.abs(tLast - tPrev) / 1000 : 0;
    const speed = timeDelta > 0 ? (dLast / timeDelta) * 3.6 : 0;

    if (dLast > 100 && speed > 120) {
      pts.pop();
    } else {
      break;
    }
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

  // Step 1: Remove impossible GPS teleports
  let step1 = filterGpsSpikes(rawTrail, 120);

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
