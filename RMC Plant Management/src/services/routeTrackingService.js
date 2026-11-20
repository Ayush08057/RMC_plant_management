/**
 * Employee & Vehicle Route Travel Tracking Service
 * Tracks exact visited waypoints, route paths, timestamps, and locations traveled
 */

import { calculateDistanceMeters, resolveSangliLandmark } from '../utils/sangliGeofence';
import { filterGeographicOutliers, cleanRawRoutePipeline, calculateAccurateRouteDistanceKm } from '../utils/routeCleanUtils';
import { subscribeCloudStore, pushCloudStore } from './cloudSyncService';

export const ROUTE_HISTORY_STORAGE_KEY = 'rmc_employee_route_history_v2';

// Baseline Visited Route Waypoints (Clean operational state - strictly live GPS tracking)
export const DEFAULT_ROUTE_TRAILS = {
  driver: [],
  supervisor: [],
  qc: [],
  dispatcher: [],
  accountant: [],
  manager: [],
  default: []
};

/**
 * Retrieves all stored route histories (purges any legacy simulated stops)
 */
export function getAllRouteHistories() {
  try {
    const raw = localStorage.getItem(ROUTE_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      let hasLegacyMocks = false;
      const cleaned = {};
      Object.keys(parsed).forEach((k) => {
        const isDis = k.toUpperCase().includes('DIS') || k.toUpperCase().includes('DISPATCH');
        const isSup = k.toUpperCase().includes('SS') || k.toUpperCase().includes('SUPERVISOR');
        const isAcc = k.toUpperCase().includes('ACC') || k.toUpperCase().includes('ACCOUNT');
        const list = parsed[k];
        if (Array.isArray(list)) {
          let filtered = list.filter((s) => {
            if (!s) return false;
            return (
              s.notes !== 'Formwork & reinforcement check' &&
              s.notes !== 'Batching 6.0 m³ M25 concrete loaded' &&
              s.title !== 'Plant HQ (Loading Bay)' &&
              s.title !== 'Godrej Green Acres Pier Site' &&
              !s.title?.includes('Sangli Plant Operational Zone') &&
              !s.title?.includes('Effotel')
            );
          });
          if (filtered.length !== list.length) {
            hasLegacyMocks = true;
          }
          if (filtered.length > 1) {
            const beforeOutlier = filtered.length;
            filtered = filterGeographicOutliers(filtered, 40000);
            if (filtered.length !== beforeOutlier) {
              hasLegacyMocks = true;
            }
          }
          if (filtered.length > 0) {
            cleaned[k] = filtered;
          }
        }
      });
      if (hasLegacyMocks) {
        localStorage.setItem(ROUTE_HISTORY_STORAGE_KEY, JSON.stringify(cleaned));
      }
      return cleaned;
    }
  } catch (err) {
    console.warn('Failed reading route history:', err);
  }
  return {};
}

/**
 * Saves all route histories
 */
export function saveAllRouteHistories(data) {
  try {
    localStorage.setItem(ROUTE_HISTORY_STORAGE_KEY, JSON.stringify(data));
    pushCloudStore('cloud_employee_routes', ROUTE_HISTORY_STORAGE_KEY, data);
  } catch (err) {
    console.warn('Failed writing route history:', err);
  }
}

const CANONICAL_ALIASES = {
  'USR-SS-001': 'SS-001',
  'USR-DIS-001': 'DIS-001',
  'USR-DV-001': 'DRV-001',
  'USR-DRV-001': 'DRV-001',
  'USR-PM-001': 'PM-001',
  'USR-ACC-001': 'ACC-001',
  'USR-QC-001': 'QC-001',
  'USR-BO-001': 'BO-001',
};

function cleanCanonicalId(id) {
  const u = (id || '').toString().trim().toUpperCase();
  return CANONICAL_ALIASES[u] || u;
}

/**
 * Deletes all recorded route history for a given employee
 */
export function deleteEmployeeRouteHistory(empId) {
  if (!empId) return;
  const key = cleanCanonicalId(empId);
  const rawKey = empId.toString().trim().toUpperCase();
  const allHistories = getAllRouteHistories();
  delete allHistories[key];
  if (rawKey !== key) delete allHistories[rawKey];
  saveAllRouteHistories(allHistories);
}

/**
 * Returns visited route waypoints, total km, and polyline points for an employee
 * Strictly real GPS data only — zero simulated dummy routes!
 */
export function getEmployeeRouteDetails(employee, liveGps = null) {
  if (!employee) return null;

  const empId = (employee.employeeId || employee.id || 'EMP-01').toUpperCase();
  const canonicalId = cleanCanonicalId(empId);
  const empRole = (employee.role || '').toLowerCase();
  const empName = (employee.name || '').toLowerCase();
  const isDis = empId.includes('DIS') || empRole.includes('dispatch') || empName.includes('dispatch');
  const isAcc = empId.includes('ACC') || empRole.includes('account') || empName.includes('accountant');
  const isQc = empId.includes('QC') || empRole.includes('qc') || empRole.includes('quality') || empName.includes('quality');

  let stops = [];

  // 1. Identify punch-in coordinates (Strict Anchor #1)
  const punchInGps = employee.gpsLocation || employee.record?.gpsLocation || null;
  const hasRealPunchIn = punchInGps && Number.isFinite(Number(punchInGps.lat)) && Number.isFinite(Number(punchInGps.lng));
  const punchInTime = employee.punchIn || employee.record?.punchIn || '09:00 AM';

  let pLat = null;
  let pLng = null;
  let resolvedTitle = 'Punch-In Station';
  let resolvedAddress = '';

  if (hasRealPunchIn) {
    pLat = Number(punchInGps.lat);
    pLng = Number(punchInGps.lng);
    const landmark = resolveSangliLandmark(pLat, pLng);
    resolvedTitle = punchInGps.landmarkName || landmark.landmarkName || 'Punch-In Station';
    resolvedAddress = punchInGps.address || landmark.address || `${pLat.toFixed(4)}°N, ${pLng.toFixed(4)}°E`;
  }

  // 2. Extract recorded routeTrail strictly from the attendance record of THIS shift
  const attTrail = employee.routeTrail || employee.record?.routeTrail || [];
  if (Array.isArray(attTrail) && attTrail.length > 0) {
    // Clean and collapse stationary dwell clusters and GPS noise so parked workers do not accumulate false mileage
    const cleanedTrail = cleanRawRoutePipeline(attTrail);
    const trailToUse = (cleanedTrail && cleanedTrail.length > 0) ? cleanedTrail : attTrail;

    const rawStops = trailToUse
      .filter((s) => s && Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng)))
      .map((s, idx) => {
        const sLat = Number(s.lat);
        const sLng = Number(s.lng);
        const landmark = resolveSangliLandmark(sLat, sLng);
        const timeStr = s.time || (s.timestamp ? new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--');
        return {
          ...s,
          stopNo: idx + 1,
          lat: sLat,
          lng: sLng,
          title: s.title || landmark.landmarkName || (idx === 0 ? 'Punch-In Station' : `Waypoint #${idx + 1}`),
          address: s.address || landmark.address || `${sLat.toFixed(4)}°N, ${sLng.toFixed(4)}°E`,
          time: timeStr,
          status: s.status || (idx === 0 ? 'Punch-In Station' : 'En Route'),
        };
      });

    if (hasRealPunchIn && rawStops.length > 0) {
      // Continuity check: allow real highway travel and cross-town movements (up to 150 km between intermediate points)
      stops = [rawStops[0]];
      for (let i = 1; i < rawStops.length; i++) {
        const prev = stops[stops.length - 1];
        const curr = rawStops[i];
        const legDist = calculateDistanceMeters(prev.lat, prev.lng, curr.lat, curr.lng);
        if (legDist <= 150000) {
          stops.push(curr);
        }
      }
    } else if (!hasRealPunchIn && rawStops.length > 0) {
      // No verified punch-in GPS → allow continuous trail up to 150 km jumps
      const firstRaw = rawStops[0];
      const contiguous = [firstRaw];
      for (let i = 1; i < rawStops.length; i++) {
        const prev = contiguous[contiguous.length - 1];
        const curr = rawStops[i];
        const legDist = calculateDistanceMeters(prev.lat, prev.lng, curr.lat, curr.lng);
        if (legDist <= 150000) {
          contiguous.push(curr);
        }
      }
      stops = contiguous;
    } else {
      stops = [];
    }
  }

  // 3. Ensure Punch-In Anchor is strictly the first stop
  if (hasRealPunchIn) {
    if (stops.length === 0) {
      stops.push({
        stopNo: 1,
        title: resolvedTitle.startsWith('Punch-In') ? resolvedTitle : `Punch-In: ${resolvedTitle}`,
        category: 'Punch-In Location',
        address: resolvedAddress,
        time: punchInTime,
        lat: pLat,
        lng: pLng,
        status: 'Punch-In Station',
        distanceKm: 0.0,
        stayMinutes: null,
        notes: 'Verified biometric punch-in'
      });
    } else {
      stops[0] = {
        ...stops[0],
        title: resolvedTitle.startsWith('Punch-In') ? resolvedTitle : `Punch-In: ${resolvedTitle}`,
        address: resolvedAddress,
        lat: pLat,
        lng: pLng,
        status: 'Punch-In Station'
      };
    }
  } else if (stops.length > 0 && stops[0].lat && stops[0].lng) {
    stops[0].title = stops[0].title || 'Punch-In Station';
    stops[0].status = 'Punch-In Station';
  }

  // 3. Identify exit / current coordinates
  const exitGps = employee.exitGpsLocation || employee.record?.exitGpsLocation || (employee.punchOut && employee.lat && employee.lng ? { lat: employee.lat, lng: employee.lng, landmarkName: employee.geofenceStatus } : null);
  const punchOutTime = employee.punchOut || employee.record?.punchOut || null;

  if (exitGps && exitGps.lat && exitGps.lng) {
    let eLat = Number(exitGps.lat);
    let eLng = Number(exitGps.lng);
    const eLandmark = resolveSangliLandmark(eLat, eLng);
    const lastStop = stops[stops.length - 1];
    const distToLast = lastStop ? calculateDistanceMeters(lastStop.lat, lastStop.lng, eLat, eLng) : 999;

    if (distToLast > 10 || stops.length === 1) {
      stops.push({
        stopNo: stops.length + 1,
        title: exitGps.landmarkName || eLandmark.landmarkName || 'Punch-Out Station',
        category: 'Punch-Out Location',
        address: exitGps.address || eLandmark.address || `${eLat.toFixed(4)}°N, ${eLng.toFixed(4)}°E`,
        time: punchOutTime || 'Shift End',
        lat: eLat,
        lng: eLng,
        status: 'Punch-Out Station',
        distanceKm: 0.0,
        stayMinutes: null,
        notes: 'Verified punch-out location'
      });
    }
  } else {
    // Current live / last known position — only add if employee is STILL punched in (no punchOut)
    const isPunchedOut = Boolean(employee.punchOut || employee.record?.punchOut);
    if (!isPunchedOut) {
      // Strictly isolate viewer device GPS: only use liveGps if target is the active device user
      const useDeviceGps = Boolean(employee.isCurrentUser && liveGps?.active && liveGps?.lat && liveGps?.lng);
      const rawLat = useDeviceGps ? liveGps.lat : (employee.lat || employee.lastKnownLocation?.lat || employee.record?.lastKnownLocation?.lat);
      const rawLng = useDeviceGps ? liveGps.lng : (employee.lng || employee.lastKnownLocation?.lng || employee.record?.lastKnownLocation?.lng);

      // Only append a live stop if we have a REAL coordinate (not null/undefined)
      if (rawLat !== null && rawLat !== undefined && rawLng !== null && rawLng !== undefined) {
        const cLat = Number(rawLat);
        const cLng = Number(rawLng);
        if (!isNaN(cLat) && !isNaN(cLng) && cLat !== 0 && cLng !== 0) {
          const landmark = resolveSangliLandmark(cLat, cLng);
          const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          if (stops.length === 0) {
            stops.push({
              stopNo: 1,
              title: landmark.landmarkName || 'Current Location',
              category: 'Live Position',
              address: landmark.address || `${cLat.toFixed(4)}°N, ${cLng.toFixed(4)}°E`,
              time: timeNow,
              lat: cLat,
              lng: cLng,
              status: 'Current Location',
              distanceKm: 0.0,
              stayMinutes: null,
              notes: 'Real-time GPS coordinate fix'
            });
          } else {
            const lastStop = stops[stops.length - 1];
            const distToLast = lastStop ? calculateDistanceMeters(lastStop.lat, lastStop.lng, cLat, cLng) : 999;

            // Only append continuous realistic live movement if employee has ACTUALLY travelled (>= 80m from punch-in anchor and last stop)
            // This prevents stationary employees from having jitter stops, while capturing real movements reliably
            const distToPunch = hasRealPunchIn ? calculateDistanceMeters(pLat, pLng, cLat, cLng) : 999;
            if (distToLast >= 80 && distToPunch >= 80 && distToLast <= 150000) {
              stops.push({
                stopNo: stops.length + 1,
                title: landmark.landmarkName || 'Live GPS Location',
                category: 'Current Location',
                address: landmark.address || `${cLat.toFixed(4)}°N, ${cLng.toFixed(4)}°E`,
                time: timeNow,
                lat: cLat,
                lng: cLng,
                status: 'Current Stop',
                distanceKm: 0.0,
                stayMinutes: null,
                notes: 'Real-time GNSS coordinate fix'
              });
            }
          }
        }
      }
    }
  }

  // Fallback: If stops is still empty AND employee has a real GPS coordinate, nothing to show.
  // Do NOT insert a fake station-based stop — this was causing the 202 KM Pune route bug.
  // Only insert a "No GPS" placeholder, not a fake geographic point.
  if (stops.length === 0) {
    // Return empty route — the admin panel will show "No location data" instead of a fake route
    return {
      employeeId: empId,
      employeeName: employee.name,
      role: employee.role,
      stops: [],
      polylineCoords: [],
      totalDistanceKm: 0.0,
      visitedStopsCount: 0,
      currentLocation: null,
      googleMapsFullRouteUrl: null,
    };
  }

  // 4. Filter any wild geographic outliers (> 120km away from real shift points)
  if (stops.length > 1) {
    stops = filterGeographicOutliers(stops, 120000);
  }

  // 5. Calculate accurate cumulative kilometer distances across all stops
  let cumulativeDist = 0.0;
  for (let i = 0; i < stops.length; i++) {
    stops[i].stopNo = i + 1;
    if (i === 0) {
      stops[i].distanceKm = 0.0;
      stops[i].legKm = 0.0;
    } else {
      const prev = stops[i - 1];
      const legDistMeters = calculateDistanceMeters(prev.lat, prev.lng, stops[i].lat, stops[i].lng);
      const legKm = Number((legDistMeters / 1000).toFixed(1));
      cumulativeDist += legDistMeters / 1000;
      stops[i].legKm = legKm;
      stops[i].distanceKm = Number(cumulativeDist.toFixed(1));
    }
  }

  const polylineCoords = stops.length >= 2 ? stops.map((s) => [Number(s.lat), Number(s.lng)]) : [];
  // Calculate authoritative trip distance over the raw attendance trail with dwell drift suppression
  const totalDistanceKm = (Array.isArray(attTrail) && attTrail.length > 1)
    ? calculateAccurateRouteDistanceKm(attTrail)
    : Number(cumulativeDist.toFixed(1));
  const visitedStopsCount = stops.filter((s) => s.status !== 'Current Stop' && s.status !== 'Current Location').length;

  return {
    employeeId: empId,
    employeeName: employee.name,
    role: employee.role,
    stops,
    polylineCoords,
    totalDistanceKm,
    total_distance: totalDistanceKm,
    visitedStopsCount,
    currentLocation: stops[stops.length - 1] || null,
    googleMapsFullRouteUrl: polylineCoords.length > 1
      ? `https://www.google.com/maps/dir/${polylineCoords.map(p => `${p[0]},${p[1]}`).join('/')}`
      : (stops.length > 0 ? `https://www.google.com/maps/search/?api=1&query=${stops[0].lat},${stops[0].lng}` : null)
  };
}

/**
 * Records a new coordinate breadcrumb for an employee
 */
export function recordEmployeeBreadcrumb(empId, lat, lng, optionalTitle = null) {
  if (!empId || !lat || !lng) return;
  const canonicalKey = cleanCanonicalId(empId);
  const rawKey = empId.toString().trim().toUpperCase();
  const allHistories = getAllRouteHistories();
  const existing = allHistories[canonicalKey] || allHistories[rawKey] || [];

  const last = existing[existing.length - 1];
  if (last) {
    const dist = calculateDistanceMeters(last.lat, last.lng, lat, lng);
    if (dist < 100) {
      // Too close to last reading, ignore jitter
      return;
    }
  }

  const landmark = resolveSangliLandmark(lat, lng);
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const prevKm = last ? last.distanceKm : 0;
  const addKm = last ? Number((calculateDistanceMeters(last.lat, last.lng, lat, lng) / 1000).toFixed(1)) : 0;

  const newStop = {
    stopNo: existing.length + 1,
    title: optionalTitle || landmark.landmarkName || 'Recorded Waypoint',
    category: existing.length === 0 ? 'Shift Start' : 'Transit Point',
    address: landmark.address || `${Number(lat).toFixed(4)}°N, ${Number(lng).toFixed(4)}°E`,
    time: timeNow,
    lat: Number(lat),
    lng: Number(lng),
    status: 'Visited',
    distanceKm: Number((prevKm + addKm).toFixed(1)),
    stayMinutes: null,
    notes: 'GPS telemetry verified'
  };

  allHistories[canonicalKey] = [...existing, newStop];
  if (rawKey !== canonicalKey) {
    allHistories[rawKey] = allHistories[canonicalKey];
  }
  saveAllRouteHistories(allHistories);
}

/**
 * Appends a verified visited location after punch-in for an employee
 */
export function addEmployeeVisitedStop(empId, stopData) {
  if (!empId || !stopData) return null;
  const canonicalKey = cleanCanonicalId(empId);
  const rawKey = empId.toString().trim().toUpperCase();
  const allHistories = getAllRouteHistories();
  const existing = allHistories[canonicalKey] || allHistories[rawKey] || [];

  const timeNow = stopData.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const lat = Number(stopData.lat);
  const lng = Number(stopData.lng);
  const landmark = resolveSangliLandmark(lat, lng);

  const last = existing[existing.length - 1];
  const prevKm = last ? (last.distanceKm || 0) : 0;
  const addKm = (last && lat && lng)
    ? Number((calculateDistanceMeters(last.lat, last.lng, lat, lng) / 1000).toFixed(1))
    : 3.5;

  const newStop = {
    stopNo: existing.length + 1,
    title: stopData.title || landmark.landmarkName || 'Visited Checkpoint',
    category: stopData.category || 'Site Visit',
    address: stopData.address || landmark.address || `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
    time: timeNow,
    stayMinutes: stopData.stayMinutes ? Number(stopData.stayMinutes) : 30,
    lat,
    lng,
    status: 'Visited Site',
    distanceKm: Number((prevKm + addKm).toFixed(1)),
    legKm: addKm,
    notes: stopData.notes || 'Verified site visit after punch-in'
  };

  allHistories[canonicalKey] = [...existing, newStop];
  if (rawKey !== canonicalKey) {
    allHistories[rawKey] = allHistories[canonicalKey];
  }
  saveAllRouteHistories(allHistories);
  return newStop;
}

/**
 * Removes a visited location for an employee
 */
export function removeEmployeeVisitedStop(empId, stopNo) {
  if (!empId || !stopNo) return;
  const key = empId.toUpperCase();
  const allHistories = getAllRouteHistories();
  if (allHistories[key]) {
    allHistories[key] = allHistories[key].filter((s) => s.stopNo !== stopNo);
    saveAllRouteHistories(allHistories);
  }
}
