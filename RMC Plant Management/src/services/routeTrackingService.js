/**
 * Employee & Vehicle Route Travel Tracking Service
 * Tracks exact visited waypoints, route paths, timestamps, and locations traveled
 */

import { calculateDistanceMeters, resolveSangliLandmark } from '../utils/sangliGeofence';
import { subscribeCloudStore, pushCloudStore } from './cloudSyncService';

export const ROUTE_HISTORY_STORAGE_KEY = 'rmc_employee_route_history_v2';

// Baseline Visited Route Waypoints (Empty by default: only real GPS breadcrumbs and verified stops are tracked)
export const DEFAULT_ROUTE_TRAILS = {
  driver: [],
  supervisor: [],
  qc: [],
  accountant: [],
  dispatcher: [],
  manager: [],
  default: []
};

/**
 * Returns the verified operational station in Sangli for an employee based on role/ID
 */
export function getAssignedEmployeeStation(emp) {
  if (!emp) {
    return {
      lat: 16.8450,
      lng: 74.6200,
      stationName: 'SM Concrete Plant HQ, Tanang',
      address: 'Tanang, Sangli-Miraj Road, Sangli',
      shortZone: 'SM Plant HQ',
      notes: 'Operational plant station',
    };
  }

  const roleLower = String(emp.role || '').toLowerCase();
  const idUpper = String(emp.employeeId || emp.id || '').toUpperCase();
  const nameLower = String(emp.name || '').toLowerCase();

  if (roleLower.includes('account') || idUpper.includes('ACC') || nameLower.includes('accountant')) {
    return {
      lat: 16.8584,
      lng: 74.5824,
      stationName: 'Sangli Market Yard (APMC Commercial Hub)',
      address: 'APMC Market Yard Area, Sangli',
      shortZone: 'Market Yard Hub',
      notes: 'Commercial accounts & sales billing desk',
    };
  }

  if (roleLower.includes('dispatch') || idUpper.includes('DIS') || nameLower.includes('dispatcher')) {
    return {
      lat: 16.8450,
      lng: 74.6200,
      stationName: 'SM Concrete Plant HQ (Weighbridge & Dispatch)',
      address: 'Tanang, Sangli-Miraj Road, Sangli',
      shortZone: 'Plant Dispatch Bay',
      notes: 'Batching control & delivery challan dispatch',
    };
  }

  if (roleLower.includes('supervisor') || idUpper.includes('SS') || nameLower.includes('supervisor')) {
    return {
      lat: 16.8520,
      lng: 74.5900,
      stationName: 'Godrej Green Acres Construction Site',
      address: 'Near Government Colony, Sangli',
      shortZone: 'Godrej Project Site',
      notes: 'On-site concrete pouring & supervision',
    };
  }

  if (roleLower.includes('quality') || roleLower.includes('qc') || idUpper.includes('QC') || nameLower.includes('quality')) {
    return {
      lat: 16.8300,
      lng: 74.6400,
      stationName: 'Miraj Highway Package B Quality Lab',
      address: 'Miraj Industrial Corridor, Sangli',
      shortZone: 'Highway QC Lab',
      notes: 'Slump test & compressive cube strength testing',
    };
  }

  if (roleLower.includes('driver') || idUpper.includes('DRV') || nameLower.includes('driver')) {
    return {
      lat: 16.8480,
      lng: 74.6020,
      stationName: 'Sangli-Miraj Highway NH-166 (Transit Mixer)',
      address: 'Transit Mixer Corridor, Sangli',
      shortZone: 'Highway Transit',
      notes: 'Transit mixer delivering concrete to site',
    };
  }

  if (roleLower.includes('manager') || idUpper.includes('PM') || nameLower.includes('manager')) {
    return {
      lat: 16.8450,
      lng: 74.6200,
      stationName: 'SM Concrete Plant HQ Central Control Room',
      address: 'Tanang, Sangli-Miraj Road, Sangli',
      shortZone: 'Plant Control Room',
      notes: 'Operational administration & batching oversight',
    };
  }

  return {
    lat: 16.8450,
    lng: 74.6200,
    stationName: 'SM Concrete Plant HQ, Tanang',
    address: 'Tanang, Sangli-Miraj Road, Sangli',
    shortZone: 'SM Plant HQ',
    notes: 'Operational plant station',
  };
}

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
        const list = parsed[k];
        if (Array.isArray(list)) {
          const filtered = list.filter((s) => 
            s && 
            s.notes !== 'Formwork & reinforcement check' &&
            s.notes !== 'Batching 6.0 m³ M25 concrete loaded' &&
            s.title !== 'Plant HQ (Loading Bay)' &&
            s.title !== 'Godrej Green Acres Pier Site'
          );
          if (filtered.length !== list.length) {
            hasLegacyMocks = true;
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

/**
 * Deletes all recorded route history for a given employee
 */
export function deleteEmployeeRouteHistory(empId) {
  if (!empId) return;
  const key = empId.toUpperCase();
  const allHistories = getAllRouteHistories();
  if (allHistories[key]) {
    delete allHistories[key];
    saveAllRouteHistories(allHistories);
  }
}

/**
 * Returns visited route waypoints, total km, and polyline points for an employee
 * Strictly real GPS data only — zero simulated dummy routes!
 */
export function getEmployeeRouteDetails(employee, liveGps = null) {
  if (!employee) return null;

  const empId = (employee.employeeId || employee.id || 'EMP-01').toUpperCase();
  const allHistories = getAllRouteHistories();

  let stops = [];

  // 1. If employee has recorded routeTrail in attendance record
  const attTrail = employee.routeTrail || employee.record?.routeTrail || [];
  if (Array.isArray(attTrail) && attTrail.length > 0) {
    stops = attTrail.map((s, idx) => ({ ...s, stopNo: idx + 1 }));
  } else if (allHistories[empId] && Array.isArray(allHistories[empId]) && allHistories[empId].length > 0) {
    stops = [...allHistories[empId]];
  }

  // 2. Identify punch-in coordinates
  const punchInGps = employee.gpsLocation || employee.record?.gpsLocation || null;
  const punchInTime = employee.punchIn || employee.record?.punchIn || 'Shift Start';

  if (punchInGps && punchInGps.lat && punchInGps.lng) {
    const pLat = Number(punchInGps.lat);
    const pLng = Number(punchInGps.lng);
    const landmark = resolveSangliLandmark(pLat, pLng);

    if (stops.length === 0) {
      stops.push({
        stopNo: 1,
        title: punchInGps.landmarkName || landmark.landmarkName || 'Punch-In Station',
        category: 'Punch-In Location',
        address: punchInGps.address || landmark.address || `${pLat.toFixed(4)}°N, ${pLng.toFixed(4)}°E`,
        time: punchInTime,
        lat: pLat,
        lng: pLng,
        status: 'Punch-In Station',
        distanceKm: 0.0,
        stayMinutes: null,
        notes: 'Verified biometric punch-in'
      });
    } else {
      // Ensure stop 1 matches punch-in location
      const firstStop = stops[0];
      const dist = calculateDistanceMeters(firstStop.lat, firstStop.lng, pLat, pLng);
      if (dist > 150) {
        stops.unshift({
          stopNo: 1,
          title: punchInGps.landmarkName || landmark.landmarkName || 'Punch-In Station',
          category: 'Punch-In Location',
          address: punchInGps.address || landmark.address || `${pLat.toFixed(4)}°N, ${pLng.toFixed(4)}°E`,
          time: punchInTime,
          lat: pLat,
          lng: pLng,
          status: 'Punch-In Station',
          distanceKm: 0.0,
          stayMinutes: null,
          notes: 'Verified biometric punch-in'
        });
      }
    }
  }

  // 3. Identify exit / current coordinates
  const exitGps = employee.exitGpsLocation || employee.record?.exitGpsLocation || null;
  const punchOutTime = employee.punchOut || employee.record?.punchOut || null;

  if (exitGps && exitGps.lat && exitGps.lng) {
    const eLat = Number(exitGps.lat);
    const eLng = Number(exitGps.lng);
    const eLandmark = resolveSangliLandmark(eLat, eLng);
    const lastStop = stops[stops.length - 1];
    const distToLast = lastStop ? calculateDistanceMeters(lastStop.lat, lastStop.lng, eLat, eLng) : 999;

    if (distToLast > 50 || stops.length === 1) {
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
    // Current live / last known position
    const currentLat = liveGps?.lat || employee.lastKnownLocation?.lat || employee.record?.lastKnownLocation?.lat || employee.lat;
    const currentLng = liveGps?.lng || employee.lastKnownLocation?.lng || employee.record?.lastKnownLocation?.lng || employee.lng;

    if (currentLat && currentLng) {
      const cLat = Number(currentLat);
      const cLng = Number(currentLng);
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

        if (distToLast > 80) {
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

  // 4. Calculate accurate cumulative kilometer distances across all stops
  let cumulativeDist = 0.0;
  for (let i = 0; i < stops.length; i++) {
    stops[i].stopNo = i + 1;
    if (i === 0) {
      stops[i].distanceKm = 0.0;
    } else {
      const prev = stops[i - 1];
      const legDistMeters = calculateDistanceMeters(prev.lat, prev.lng, stops[i].lat, stops[i].lng);
      cumulativeDist += legDistMeters / 1000;
      stops[i].distanceKm = Number(cumulativeDist.toFixed(1));
    }
  }

  const polylineCoords = stops.length >= 2 ? stops.map((s) => [Number(s.lat), Number(s.lng)]) : [];
  const totalDistanceKm = Number(cumulativeDist.toFixed(1));
  const visitedStopsCount = stops.filter((s) => s.status !== 'Current Stop' && s.status !== 'Current Location').length;

  return {
    employeeId: empId,
    employeeName: employee.name,
    role: employee.role,
    stops,
    polylineCoords,
    totalDistanceKm,
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
  const key = empId.toUpperCase();
  const allHistories = getAllRouteHistories();
  const existing = allHistories[key] || [];

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

  allHistories[key] = [...existing, newStop];
  saveAllRouteHistories(allHistories);
}
