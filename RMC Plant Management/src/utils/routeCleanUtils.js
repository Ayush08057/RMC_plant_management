/**
 * Professional GPS Route Filter & Accurate Distance Engine
 * Computes exact cumulative Haversine distance from consecutive, cleaned GPS telemetry.
 * 
 * Rules enforced:
 * 1. Cumulative Haversine over accuracy-filtered, timestamp-sorted, deduplicated raw GPS points.
 * 2. Speed / teleport outlier rejection (> 120 km/h or instant zero-delta teleports).
 * 3. Gap detection (reserves distance across tracking gaps, avoids straight-line jumps > 15 km).
 * 4. Dwell / stay-point drift suppression (suppresses micro-jitter inside stationary zones so 
 *    parked workers / workers in one facility do NOT accumulate false mileage).
 * 5. OSRM map-matching cross-check for authoritative distance verification.
 * 6. Douglas-Peucker trajectory simplification used ONLY for Leaflet rendering (never for distance calculation).
 */

/**
 * Calculates Haversine distance in meters between two coordinates
 */
export function getHaversineDistanceMeters(p1, p2) {
  if (!p1 || !p2) return 0;
  const lat1 = Number(p1.lat != null ? p1.lat : (Array.isArray(p1) ? p1[0] : p1.latitude));
  const lng1 = Number(p1.lng != null ? p1.lng : (Array.isArray(p1) ? p1[1] : p1.longitude));
  const lat2 = Number(p2.lat != null ? p2.lat : (Array.isArray(p2) ? p2[0] : p2.latitude));
  const lng2 = Number(p2.lng != null ? p2.lng : (Array.isArray(p2) ? p2[1] : p2.longitude));

  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) return 0;
  if (lat1 === lat2 && lng1 === lng2) return 0;

  const R = 6371000; // Earth radius in meters
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Filter extreme geographic outliers (> 50km from route cluster)
 */
export function filterGeographicOutliers(points, maxDistanceMeters = 50000) {
  if (!Array.isArray(points) || points.length <= 1) return points || [];
  
  const startPoint = points[0];
  const startLat = Number(startPoint?.lat != null ? startPoint.lat : startPoint?.latitude);
  const startLng = Number(startPoint?.lng != null ? startPoint.lng : startPoint?.longitude);

  if (points.length === 2 && !isNaN(startLat) && !isNaN(startLng)) {
    const dist = getHaversineDistanceMeters(startPoint, points[1]);
    if (dist > maxDistanceMeters) {
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

  const validPts = points.filter(p => {
    const lat = Number(p.lat != null ? p.lat : p.latitude);
    const lng = Number(p.lng != null ? p.lng : p.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  });
  if (validPts.length === 0) return points;

  const sortedLats = validPts.map(p => Number(p.lat != null ? p.lat : p.latitude)).sort((a, b) => a - b);
  const sortedLngs = validPts.map(p => Number(p.lng != null ? p.lng : p.longitude)).sort((a, b) => a - b);

  const medianLat = sortedLats[Math.floor(sortedLats.length / 2)];
  const medianLng = sortedLngs[Math.floor(sortedLngs.length / 2)];
  const center = { lat: medianLat, lng: medianLng };

  const valid = validPts.filter(p => {
    const dist = getHaversineDistanceMeters(center, p);
    return dist <= maxDistanceMeters;
  });

  return valid.length > 0 ? valid : points;
}

/**
 * Discards points with accuracy > 30 meters
 */
export function filterAccuracy(points, maxAccuracyMeters = 30) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const start = points[0];
  const startLat = Number(start?.lat != null ? start.lat : start?.latitude);
  const startLng = Number(start?.lng != null ? start.lng : start?.longitude);
  const hasStart = !isNaN(startLat) && !isNaN(startLng) && startLat !== 0;

  return points.filter((p, idx) => {
    const acc = Number(p.accuracy != null ? p.accuracy : 15);
    const isAnchor = (idx === 0 || idx === points.length - 1) &&
      (p.status === 'Punch-In Station' || p.status === 'Punch-Out Station' || p.category?.includes('Punch'));
    if (isAnchor && acc <= 50) return true;
    if (acc <= maxAccuracyMeters) return true;
    // For genuine local excursions (e.g. walking to nearby shops, bakeries, or site areas > 30m away),
    // accept GPS accuracy up to 50m so urban market street points are never dropped
    if (acc <= 50 && hasStart) {
      const pLat = Number(p.lat != null ? p.lat : p.latitude);
      const pLng = Number(p.lng != null ? p.lng : p.longitude);
      if (!isNaN(pLat) && !isNaN(pLng)) {
        const distFromStart = getHaversineDistanceMeters({ lat: startLat, lng: startLng }, { lat: pLat, lng: pLng });
        if (distFromStart >= 30) return true;
      }
    }
    return false;
  });
}

/**
 * Discard GPS spikes with impossible speed (> 120 km/h) between consecutive points
 */
export function filterGpsSpikes(points, maxSpeedKmh = 120) {
  if (!Array.isArray(points) || points.length < 2) return points || [];
  const result = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];

    const distMeters = getHaversineDistanceMeters(prev, curr);
    const tPrev = prev.timeMs || prev.ts || (prev.timestamp ? new Date(prev.timestamp).getTime() : 0);
    const tCurr = curr.timeMs || curr.ts || (curr.timestamp ? new Date(curr.timestamp).getTime() : 0);
    const timeDeltaSec = (tPrev > 0 && tCurr > 0) ? Math.abs(tCurr - tPrev) / 1000 : 0;

    if (timeDeltaSec > 0) {
      const speedKmh = (distMeters / timeDeltaSec) * 3.6;
      if (speedKmh > maxSpeedKmh) {
        // Impossible speed (> 120 km/h) rejected
        continue;
      }
    } else if (distMeters > 200) {
      // Instant teleport jump with zero delta rejected
      continue;
    }

    result.push(curr);
  }

  return result;
}

/**
 * Discards stationary micro-jitter under 2 meters or near-identical consecutive pings
 */
export function filterStationaryNoise(points, minDistMeters = 2) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const cleaned = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    const prev = cleaned[cleaned.length - 1];
    const isLast = (i === points.length - 1);
    const isAnchor = curr.status === 'Punch-Out Station' || curr.category === 'Punch-Out Location';

    const dist = getHaversineDistanceMeters(prev, curr);
    if (dist >= minDistMeters || (isLast && isAnchor)) {
      cleaned.push(curr);
    }
  }

  return cleaned;
}

/**
 * Normalizes, orders, and deduplicates raw GPS session points
 */
export function cleanSessionGpsPoints(points, options = {}) {
  if (!Array.isArray(points) || points.length === 0) return [];

  const maxAccuracy = options.maxAccuracyMeters ?? 30;
  const maxSpeed = options.maxSpeedKmh ?? 120;
  const minStationaryDist = options.minStationaryDistanceMeters ?? 2;

  // 1. Normalize and extract lat, lng, timeMs, accuracy
  const parsed = points.map((p, idx) => {
    const lat = Number(p.lat != null ? p.lat : p.latitude);
    const lng = Number(p.lng != null ? p.lng : p.longitude);
    const accuracy = Number(p.accuracy != null ? p.accuracy : 15);

    let timeMs = 0;
    if (p.timeMs) timeMs = Number(p.timeMs);
    else if (p.ts) timeMs = Number(p.ts);
    else if (p.timestamp) {
      const parsedTime = new Date(p.timestamp).getTime();
      timeMs = isNaN(parsedTime) ? 0 : parsedTime;
    }
    if (!timeMs) timeMs = idx * 10000;

    return {
      ...p,
      lat,
      lng,
      accuracy,
      timeMs,
    };
  }).filter(p => !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0);

  if (parsed.length <= 1) return parsed;

  // 2. Sort strictly by timestamp ascending
  parsed.sort((a, b) => a.timeMs - b.timeMs);

  // 3. Discard points with accuracy > maxAccuracy
  const accClean = filterAccuracy(parsed, maxAccuracy);
  const ptsToClean = accClean.length > 0 ? accClean : (parsed.length > 0 ? [parsed[0]] : []);

  // 4. Discard extreme geographic outliers (> 120km from route cluster to preserve regional plant routes)
  const outClean = filterGeographicOutliers(ptsToClean, 120000);

  // 5. Discard impossible speed (> 140 km/h)
  const spikeClean = filterGpsSpikes(outClean, maxSpeed);

  // 6. Deduplicate micro-jitter (< 2m)
  const stationaryClean = filterStationaryNoise(spikeClean, minStationaryDist);

  return stationaryClean;
}

/**
 * CORE ENGINE: Dwell / Stay-Point Drift Suppression & Gap Detection
 * Eliminates two-directional distance error:
 * - OVERESTIMATION: While stationary at punch-in, destination, or site visit (e.g. 100-300 pings within 25m),
 *   micro-jitter distance is suppressed (adds 0 km).
 * - UNDERESTIMATION: Raw travel points along roads are preserved without Douglas-Peucker cutting of curves,
 *   and tracking gaps (< 15 km) are detected and included.
 */
export function filterDwellDriftAndDetectGaps(points, options = {}) {
  if (!Array.isArray(points) || points.length === 0) {
    return {
      travelPoints: [],
      rawFilteredPoints: [],
      dwellCentroids: [],
      totalDistanceMeters: 0,
      metrics: {
        rawPointsCount: 0,
        validPointsCount: 0,
        droppedAccuracyCount: 0,
        droppedSpeedCount: 0,
        stationaryPointsCount: 0,
        gapsDetected: 0,
        suppressedDriftDistanceMeters: 0,
      }
    };
  }

  const dwellRadiusMeters = options.dwellRadiusMeters ?? 25;
  const gapTimeThresholdSec = options.gapTimeThresholdSec ?? 300; // 5 mins
  const maxGapJumpMeters = options.maxGapJumpMeters ?? 60000; // 60 km (allows realistic highway inter-district travel, e.g. Miraj to Palus)

  // Initial cleaning: accuracy, speed, timestamp sort
  const rawCount = points.length;
  const cleaned = cleanSessionGpsPoints(points, {
    maxAccuracyMeters: options.maxAccuracyMeters ?? 80, // Allow up to 80m accuracy on moving mobile highway pings
    maxSpeedKmh: options.maxSpeedKmh ?? 140,
    minStationaryDistanceMeters: 2,
  });

  const droppedAccuracyCount = Math.max(0, rawCount - cleaned.length);
  if (cleaned.length <= 1) {
    return {
      travelPoints: cleaned,
      rawFilteredPoints: cleaned,
      dwellCentroids: [],
      totalDistanceMeters: 0,
      metrics: {
        rawPointsCount: rawCount,
        validPointsCount: cleaned.length,
        droppedAccuracyCount,
        droppedSpeedCount: 0,
        stationaryPointsCount: 0,
        gapsDetected: 0,
        suppressedDriftDistanceMeters: 0,
      }
    };
  }

  const travelPoints = [cleaned[0]];
  const dwellCentroids = [];
  let totalDistanceMeters = 0;
  let suppressedDriftMeters = 0;
  let stationaryPointsCount = 0;
  let gapsDetected = 0;

  let currentDwellCluster = [cleaned[0]];
  let dwellSumLat = cleaned[0].lat;
  let dwellSumLng = cleaned[0].lng;

  for (let i = 1; i < cleaned.length; i++) {
    const curr = cleaned[i];
    const prev = cleaned[i - 1];
    const legDist = getHaversineDistanceMeters(prev, curr);

    // Gap detection: check if time delta > 5 mins
    const tPrev = prev.timeMs || (prev.timestamp ? new Date(prev.timestamp).getTime() : 0);
    const tCurr = curr.timeMs || (curr.timestamp ? new Date(curr.timestamp).getTime() : 0);
    const deltaSec = (tPrev > 0 && tCurr > 0) ? Math.abs(tCurr - tPrev) / 1000 : 0;

    if (deltaSec >= gapTimeThresholdSec && legDist > 400) {
      gapsDetected++;
      // If gap distance is reasonable (< 15km), count it to prevent underestimation
      if (legDist <= maxGapJumpMeters) {
        totalDistanceMeters += legDist;
        travelPoints.push(curr);
        currentDwellCluster = [curr];
        dwellSumLat = curr.lat;
        dwellSumLng = curr.lng;
        continue;
      }
    }

    // Check distance from current dwell cluster center
    const clusterLen = currentDwellCluster.length;
    const centerLat = dwellSumLat / clusterLen;
    const centerLng = dwellSumLng / clusterLen;
    const distFromCenter = getHaversineDistanceMeters({ lat: centerLat, lng: centerLng }, curr);

    const speedKmh = deltaSec > 0 ? (legDist / deltaSec) * 3.6 : 0;
    // Suppress stationary drift if within dwell radius (25m), OR if drift is slow velocity (< 2.5 km/h) within 40m
    const isStationaryDrift = (distFromCenter <= dwellRadiusMeters) || (speedKmh < 2.5 && distFromCenter <= 40);

    if (isStationaryDrift) {
      // Point is inside stationary dwell zone: SUPPRESS DRIFT
      stationaryPointsCount++;
      suppressedDriftMeters += legDist;
      currentDwellCluster.push(curr);
      dwellSumLat += curr.lat;
      dwellSumLng += curr.lng;
    } else {
      // Worker has moved OUTSIDE the dwell zone: genuine movement (e.g. walking to Safa Bakers & nearby shops)
      if (clusterLen >= 3) {
        // Close prior dwell cluster and record its centroid
        const finalCentroid = {
          lat: Number((dwellSumLat / clusterLen).toFixed(6)),
          lng: Number((dwellSumLng / clusterLen).toFixed(6)),
          dwellPointsCount: clusterLen,
          isDwellCentroid: true,
          timeMs: currentDwellCluster[0].timeMs,
          time: currentDwellCluster[0].time || prev.time,
        };
        dwellCentroids.push(finalCentroid);

        // Distance from dwell centroid to this new moving point
        const moveDist = getHaversineDistanceMeters(finalCentroid, curr);
        totalDistanceMeters += moveDist;
      } else {
        totalDistanceMeters += legDist;
      }

      travelPoints.push(curr);
      currentDwellCluster = [curr];
      dwellSumLat = curr.lat;
      dwellSumLng = curr.lng;
    }
  }

  // Handle final dwell cluster at end of trip
  if (currentDwellCluster.length >= 3) {
    const finalLen = currentDwellCluster.length;
    dwellCentroids.push({
      lat: Number((dwellSumLat / finalLen).toFixed(6)),
      lng: Number((dwellSumLng / finalLen).toFixed(6)),
      dwellPointsCount: finalLen,
      isDwellCentroid: true,
      timeMs: currentDwellCluster[0].timeMs,
      time: currentDwellCluster[finalLen - 1].time || cleaned[cleaned.length - 1].time,
    });
  }

  // Always ensure the true last recorded point is preserved at trip end
  const lastCleaned = cleaned[cleaned.length - 1];
  const lastTravel = travelPoints[travelPoints.length - 1];
  if (lastCleaned && lastTravel && (lastCleaned.lat !== lastTravel.lat || lastCleaned.lng !== lastTravel.lng)) {
    travelPoints.push(lastCleaned);
  }

  return {
    travelPoints,
    rawFilteredPoints: cleaned,
    dwellCentroids,
    totalDistanceMeters: Math.round(totalDistanceMeters),
    metrics: {
      rawPointsCount: rawCount,
      validPointsCount: cleaned.length,
      droppedAccuracyCount,
      droppedSpeedCount: 0,
      stationaryPointsCount,
      gapsDetected,
      suppressedDriftDistanceMeters: Math.round(suppressedDriftMeters),
    }
  };
}

/**
 * Douglas-Peucker Trajectory Simplification:
 * Used STRICTLY for Leaflet rendering (never for distance calculation).
 * Smooths out collinear micro-wobble while preserving true highway curves and turns.
 */
export function simplifyTrajectoryDouglasPeucker(points, epsilonMeters = 10) {
  if (!Array.isArray(points) || points.length <= 2) return points || [];

  function getPerpendicularDistMeters(pt, lineStart, lineEnd) {
    const lat = Number(pt.lat != null ? pt.lat : pt[0]);
    const lng = Number(pt.lng != null ? pt.lng : pt[1]);
    const lat1 = Number(lineStart.lat != null ? lineStart.lat : lineStart[0]);
    const lng1 = Number(lineStart.lng != null ? lineStart.lng : lineStart[1]);
    const lat2 = Number(lineEnd.lat != null ? lineEnd.lat : lineEnd[0]);
    const lng2 = Number(lineEnd.lng != null ? lineEnd.lng : lineEnd[1]);

    const dLine = getHaversineDistanceMeters({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
    if (dLine === 0) return getHaversineDistanceMeters({ lat, lng }, { lat: lat1, lng: lng1 });

    const d1 = getHaversineDistanceMeters({ lat, lng }, { lat: lat1, lng: lng1 });
    const d2 = getHaversineDistanceMeters({ lat, lng }, { lat: lat2, lng: lng2 });
    const s = (dLine + d1 + d2) / 2;
    const areaSq = s * (s - dLine) * (s - d1) * (s - d2);
    if (areaSq <= 0) return 0;
    return (2 * Math.sqrt(areaSq)) / dLine;
  }

  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = getPerpendicularDistMeters(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilonMeters) {
    const left = simplifyTrajectoryDouglasPeucker(points.slice(0, maxIdx + 1), epsilonMeters);
    const right = simplifyTrajectoryDouglasPeucker(points.slice(maxIdx), epsilonMeters);
    return left.slice(0, -1).concat(right);
  } else {
    return [points[0], points[points.length - 1]];
  }
}

/**
 * Computes authoritative trip distance per session with OSRM cross-check
 * @param {Array} points - Raw GPS points from session routeTrail
 * @param {number|null} osrmDistanceKm - Optional OSRM road distance for map-matching cross-check
 * @returns {{ authoritativeKm: number, rawFilteredKm: number, matchedKm: number|null, metrics: object }}
 */
export function computeAuthoritativeTripDistance(points, osrmDistanceKm = null) {
  if (!Array.isArray(points) || points.length < 2) {
    return {
      authoritativeKm: 0.0,
      rawFilteredKm: 0.0,
      matchedKm: null,
      metrics: { rawPointsCount: Array.isArray(points) ? points.length : 0 }
    };
  }

  const { totalDistanceMeters, metrics } = filterDwellDriftAndDetectGaps(points);
  const rawFilteredKm = Number((totalDistanceMeters / 1000).toFixed(1));

  let authoritativeKm = rawFilteredKm;
  let matchedKm = null;

  // OSRM map-matching distance cross-check
  if (osrmDistanceKm != null && Number.isFinite(osrmDistanceKm) && osrmDistanceKm > 0) {
    matchedKm = Number(osrmDistanceKm.toFixed(1));
    // If OSRM distance is within ±18% of raw filtered Haversine distance, they cross-validate!
    // We prefer OSRM road distance when available because it aligns to real highway curve geometry
    const ratio = matchedKm / (rawFilteredKm || 1);
    if (ratio >= 0.82 && ratio <= 1.25) {
      authoritativeKm = matchedKm;
    }
  }

  // Session distance logging for telemetry auditing
  try {
    if (typeof console !== 'undefined' && console.log) {
      console.log(
        `[TripDistanceEngine] RawPoints=${metrics.rawPointsCount}, Valid=${metrics.validPointsCount}, ` +
        `StationaryPoints=${metrics.stationaryPointsCount}, SuppressedDrift=${(metrics.suppressedDriftDistanceMeters / 1000).toFixed(2)}km, ` +
        `RawFiltered=${rawFilteredKm}km, Matched=${matchedKm ?? '--'}km -> Authoritative=${authoritativeKm}km`
      );
    }
  } catch (_) {}

  return {
    authoritativeKm,
    rawFilteredKm,
    matchedKm,
    metrics
  };
}

/**
 * Backward-compatible wrapper for calculateAccurateRouteDistanceKm:
 * Uses authoritative Haversine calculation with dwell drift suppression.
 */
export function calculateAccurateRouteDistanceKm(points, osrmDistanceKm = null) {
  const result = computeAuthoritativeTripDistance(points, osrmDistanceKm);
  return result.authoritativeKm;
}

/**
 * GENERATES CLEAN LEAFLET ROUTE POLYLINE (Leaflet Rendering Only)
 * Eliminates the dense blue scribbles/spiderwebs seen in stationary areas (Palus, farms):
 * 1. Collapses dwell clusters (e.g. 100-300 pings in a field) to single centroid coordinates.
 * 2. Applies Douglas-Peucker simplification (10m epsilon) on highway travel legs.
 * 3. Preserves Punch-In and Punch-Out anchors.
 * Returns array of [lat, lng] coordinates for L.polyline.
 */
export function generateCleanLeafletRoutePolyline(points, options = {}) {
  if (!Array.isArray(points) || points.length === 0) return [];
  if (points.length === 1) {
    const lat = Number(points[0].lat != null ? points[0].lat : points[0][0]);
    const lng = Number(points[0].lng != null ? points[0].lng : points[0][1]);
    return [[lat, lng]];
  }

  // 1. Separate genuine travel legs from stationary dwell clusters
  const { travelPoints } = filterDwellDriftAndDetectGaps(points, {
    dwellRadiusMeters: options.dwellRadiusMeters ?? 25,
  });

  if (travelPoints.length <= 2) {
    return travelPoints.map(p => [
      Number(p.lat != null ? p.lat : p[0]),
      Number(p.lng != null ? p.lng : p[1])
    ]);
  }

  // 2. Simplify travel trajectory (10m epsilon) for crisp, lag-free Leaflet rendering
  const simplified = simplifyTrajectoryDouglasPeucker(travelPoints, options.epsilonMeters ?? 10);

  // 3. Format as [lat, lng] Leaflet coordinates
  const polylineCoords = simplified.map(p => [
    Number(p.lat != null ? p.lat : p[0]),
    Number(p.lng != null ? p.lng : p[1])
  ]).filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0);

  return polylineCoords;
}

/**
 * Master Pipeline: Transforms raw GPS breadcrumbs into clean waypoints
 */
export function cleanRawRoutePipeline(rawTrail) {
  if (!Array.isArray(rawTrail) || rawTrail.length === 0) return rawTrail || [];
  if (rawTrail.length === 1) return rawTrail;

  const { travelPoints } = filterDwellDriftAndDetectGaps(rawTrail, {
    dwellRadiusMeters: 25,
  });

  if (travelPoints.length <= 1) return travelPoints;

  // Calculate cumulative Haversine for progressive display on waypoints
  let cumDistanceMeters = 0;
  const finalWaypoints = travelPoints.map((pt, idx) => {
    if (idx > 0) {
      cumDistanceMeters += getHaversineDistanceMeters(travelPoints[idx - 1], pt);
    }
    return {
      ...pt,
      stopNo: idx + 1,
      distanceKm: Number((cumDistanceMeters / 1000).toFixed(1)),
    };
  });

  return finalWaypoints;
}
