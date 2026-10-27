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

  // Strictly use real recorded breadcrumb history
  if (allHistories[empId] && Array.isArray(allHistories[empId]) && allHistories[empId].length > 0) {
    stops = [...allHistories[empId]];
  }

  // If the employee has a verified live GPS fix, update or append current stop
  const currentLat = liveGps?.lat || employee.lat;
  const currentLng = liveGps?.lng || employee.lng;

  if (currentLat && currentLng) {
    const landmark = resolveSangliLandmark(currentLat, currentLng);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (stops.length === 0) {
      // Clean single live location pinpoint with 0.0 km
      stops.push({
        stopNo: 1,
        title: landmark.landmarkName || 'Current Location',
        category: 'Live Position',
        address: landmark.address || `${Number(currentLat).toFixed(4)}°N, ${Number(currentLng).toFixed(4)}°E`,
        time: timeNow,
        lat: Number(currentLat),
        lng: Number(currentLng),
        status: 'Current Location',
        distanceKm: 0.0,
        stayMinutes: null,
        notes: 'Real-time GPS coordinate fix'
      });
    } else {
      const lastStop = stops[stops.length - 1];
      const distToLast = lastStop ? calculateDistanceMeters(lastStop.lat, lastStop.lng, currentLat, currentLng) : 999;

      if (distToLast > 250) {
        // Significantly moved — add new live waypoint
        const prevKm = lastStop ? (lastStop.distanceKm || 0) : 0;
        const addKm = Number((distToLast / 1000).toFixed(1));
        stops.push({
          stopNo: stops.length + 1,
          title: landmark.landmarkName || 'Live GPS Location',
          category: 'Current Location',
          address: landmark.address || `${Number(currentLat).toFixed(4)}°N, ${Number(currentLng).toFixed(4)}°E`,
          time: timeNow,
          lat: Number(currentLat),
          lng: Number(currentLng),
          status: 'Current Stop',
          distanceKm: Number((prevKm + addKm).toFixed(1)),
          stayMinutes: null,
          notes: 'Real-time GNSS coordinate fix'
        });
      } else if (lastStop) {
        // Update coordinates of current stop to highest precision
        lastStop.lat = Number(currentLat);
        lastStop.lng = Number(currentLng);
        lastStop.title = landmark.landmarkName || lastStop.title;
        lastStop.address = landmark.address || lastStop.address;
      }
    }
  }

  // Polyline array for Leaflet [ [lat, lng], [lat, lng], ... ]
  // Polyline is strictly formed only when at least 2 distinct coordinate points exist
  const polylineCoords = stops.length >= 2 ? stops.map((s) => [Number(s.lat), Number(s.lng)]) : [];
  const totalDistanceKm = stops.length > 0 ? (stops[stops.length - 1].distanceKm || 0.0) : 0.0;
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
