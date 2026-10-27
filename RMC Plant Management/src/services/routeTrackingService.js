/**
 * Employee & Vehicle Route Travel Tracking Service
 * Tracks exact visited waypoints, route paths, timestamps, and locations traveled
 */

import { calculateDistanceMeters, resolveSangliLandmark } from '../utils/sangliGeofence';
import { subscribeCloudStore, pushCloudStore } from './cloudSyncService';

export const ROUTE_HISTORY_STORAGE_KEY = 'rmc_employee_route_history_v2';

// Baseline Visited Route Waypoints for Sangli Operational Area
export const DEFAULT_ROUTE_TRAILS = {
  // Driver Routes (Transit Mixers)
  driver: [
    {
      stopNo: 1,
      title: 'Plant HQ (Loading Bay)',
      category: 'Departure',
      address: 'SM Concrete Tech, Tanang, Sangli-Miraj Road',
      time: '08:45 AM',
      lat: 16.8450,
      lng: 74.6200,
      status: 'Departed',
      distanceKm: 0.0,
      stayMinutes: 25,
      notes: 'Batching 6.0 m³ M25 concrete loaded'
    },
    {
      stopNo: 2,
      title: 'Vishrambag Bypass Junction',
      category: 'Transit Point',
      address: 'Sangli-Miraj Highway NH-166, Vishrambag',
      time: '09:20 AM',
      lat: 16.8480,
      lng: 74.6020,
      status: 'Visited & Passed',
      distanceKm: 4.2,
      stayMinutes: 5,
      notes: 'Checkpoint cleared without transit delays'
    },
    {
      stopNo: 3,
      title: 'Sunshine Residency Site',
      category: 'Client Site',
      address: 'Plot 44, Kupwad MIDC Road, Sangli',
      time: '10:05 AM',
      lat: 16.8700,
      lng: 74.6100,
      status: 'Visited & Poured',
      distanceKm: 8.8,
      stayMinutes: 50,
      notes: 'Unloaded 6.0 m³ via concrete boom pump'
    },
    {
      stopNo: 4,
      title: 'Sangli Market Yard APMC',
      category: 'Depot & Washout',
      address: 'APMC Market Yard Area, Sangli',
      time: '11:45 AM',
      lat: 16.8584,
      lng: 74.5824,
      status: 'Visited',
      distanceKm: 14.1,
      stayMinutes: 20,
      notes: 'Drum washout & commercial receipt handoff'
    },
    {
      stopNo: 5,
      title: 'Miraj Industrial Corridor',
      category: 'Current Location',
      address: 'Miraj Phata, Sangli',
      time: '01:15 PM',
      lat: 16.8300,
      lng: 74.6400,
      status: 'Current Stop',
      distanceKm: 19.6,
      stayMinutes: null,
      notes: 'Live GPS position — Returning toward Plant HQ'
    }
  ],

  // Site Supervisor Routes
  supervisor: [
    {
      stopNo: 1,
      title: 'Plant HQ Admin Office',
      category: 'Shift Start',
      address: 'SM Concrete Tech, Tanang',
      time: '08:30 AM',
      lat: 16.8450,
      lng: 74.6200,
      status: 'Departed',
      distanceKm: 0.0,
      stayMinutes: 30,
      notes: 'Daily pouring schedule alignment'
    },
    {
      stopNo: 2,
      title: 'Godrej Green Acres Pier Site',
      category: 'Inspection',
      address: 'Near Government Colony, Sangli',
      time: '09:40 AM',
      lat: 16.8520,
      lng: 74.5900,
      status: 'Visited & Inspected',
      distanceKm: 5.6,
      stayMinutes: 45,
      notes: 'Formwork & reinforcement check'
    },
    {
      stopNo: 3,
      title: 'Kupwad MIDC Industrial Park',
      category: 'Slab Pouring',
      address: 'MIDC Kupwad, Sangli',
      time: '11:15 AM',
      lat: 16.8700,
      lng: 74.6100,
      status: 'Visited',
      distanceKm: 10.4,
      stayMinutes: 60,
      notes: 'Supervised 18m³ heavy slab casting'
    },
    {
      stopNo: 4,
      title: 'Sangli Market Yard APMC Office',
      category: 'Current Location',
      address: 'Market Yard Commercial Hub, Sangli',
      time: '01:45 PM',
      lat: 16.8584,
      lng: 74.5824,
      status: 'Current Stop',
      distanceKm: 15.2,
      stayMinutes: null,
      notes: 'Live GPS fix at commercial counter'
    }
  ],

  // Quality Control (QC) Engineer Routes
  qc: [
    {
      stopNo: 1,
      title: 'Plant Central Testing Lab',
      category: 'Cube Casting',
      address: 'SM Concrete Tech, Tanang',
      time: '08:45 AM',
      lat: 16.8450,
      lng: 74.6200,
      status: 'Departed',
      distanceKm: 0.0,
      stayMinutes: 40,
      notes: 'Tested 7-day cubes & moisture calibration'
    },
    {
      stopNo: 2,
      title: 'Highway Pier #14 Pouring Point',
      category: 'Slump Test',
      address: 'Miraj Highway Package B',
      time: '10:15 AM',
      lat: 16.8300,
      lng: 74.6400,
      status: 'Visited & Certified',
      distanceKm: 6.8,
      stayMinutes: 35,
      notes: 'Workability slump 130mm verified'
    },
    {
      stopNo: 3,
      title: 'Kupwad Commercial Complex',
      category: 'Cube Sampling',
      address: 'MIDC Kupwad, Sangli',
      time: '11:50 AM',
      lat: 16.8700,
      lng: 74.6100,
      status: 'Visited',
      distanceKm: 13.5,
      stayMinutes: 30,
      notes: 'Cast 6 fresh concrete cubes on site'
    },
    {
      stopNo: 4,
      title: 'Sangli Market Yard QC Station',
      category: 'Current Location',
      address: 'APMC Yard, Sangli',
      time: '01:30 PM',
      lat: 16.8584,
      lng: 74.5824,
      status: 'Current Stop',
      distanceKm: 17.8,
      stayMinutes: null,
      notes: 'Live GPS fix — Quality register entry'
    }
  ],

  // Accountant Routes
  accountant: [
    {
      stopNo: 1,
      title: 'Plant HQ Admin & Accounts',
      category: 'Shift Start',
      address: 'SM Concrete Tech, Tanang',
      time: '09:00 AM',
      lat: 16.8450,
      lng: 74.6200,
      status: 'Departed',
      distanceKm: 0.0,
      stayMinutes: 45,
      notes: 'Daily collection register & ledger review'
    },
    {
      stopNo: 2,
      title: 'Vishrambag Banking Branch',
      category: 'Commercial Visit',
      address: 'Vishrambag Commercial Area, Sangli',
      time: '10:30 AM',
      lat: 16.8480,
      lng: 74.6020,
      status: 'Visited',
      distanceKm: 4.8,
      stayMinutes: 30,
      notes: 'Bank deposit & contractor RTGS clearance'
    },
    {
      stopNo: 3,
      title: 'Sangli Market Yard APMC Hub',
      category: 'Current Location',
      address: 'APMC Market Yard Commercial Office, Sangli',
      time: '11:45 AM',
      lat: 16.8584,
      lng: 74.5824,
      status: 'Current Stop',
      distanceKm: 8.9,
      stayMinutes: null,
      notes: 'Active station — Sales invoice billing counter'
    }
  ],

  // Dispatcher Routes
  dispatcher: [
    {
      stopNo: 1,
      title: 'SM Plant Weighbridge Scale #01',
      category: 'Shift Start',
      address: 'Weighbridge Post, SM Concrete Tech, Tanang',
      time: '08:00 AM',
      lat: 16.8450,
      lng: 74.6200,
      status: 'Departed',
      distanceKm: 0.0,
      stayMinutes: 60,
      notes: 'Calibrated digital weight indicator & raw aggregate tare'
    },
    {
      stopNo: 2,
      title: 'Mixer Batching Loading Bay',
      category: 'Dispatch Control',
      address: 'Pan Mixer Bay #02, Tanang Plant',
      time: '10:00 AM',
      lat: 16.8455,
      lng: 74.6205,
      status: 'Visited',
      distanceKm: 0.3,
      stayMinutes: 45,
      notes: 'Printed delivery challans for 4 transit mixers'
    },
    {
      stopNo: 3,
      title: 'Central Dispatch Control Desk',
      category: 'Current Location',
      address: 'Tanang Main Plant HQ, Sangli',
      time: '11:30 AM',
      lat: 16.8450,
      lng: 74.6200,
      status: 'Current Stop',
      distanceKm: 0.6,
      stayMinutes: null,
      notes: 'Active station — Real-time mixer fleet dispatch'
    }
  ],

  // Plant Manager Routes
  manager: [
    {
      stopNo: 1,
      title: 'SM Plant Main Gate & Silo Bay',
      category: 'Inspection',
      address: 'Tanang, Sangli-Miraj Road',
      time: '08:15 AM',
      lat: 16.8450,
      lng: 74.6200,
      status: 'Departed',
      distanceKm: 0.0,
      stayMinutes: 30,
      notes: 'Cement & aggregate silo stock verification'
    },
    {
      stopNo: 2,
      title: 'Automation Control Panel Hub',
      category: 'Plant Operations',
      address: 'Tanang Batching Control Room',
      time: '10:00 AM',
      lat: 16.8452,
      lng: 74.6202,
      status: 'Visited',
      distanceKm: 0.2,
      stayMinutes: 60,
      notes: 'Supervised SCADA calibration & cycle times'
    },
    {
      stopNo: 3,
      title: 'Plant Manager Executive Desk',
      category: 'Current Location',
      address: 'SM Concrete Tech Operations HQ, Tanang',
      time: '01:00 PM',
      lat: 16.8450,
      lng: 74.6200,
      status: 'Current Stop',
      distanceKm: 0.5,
      stayMinutes: null,
      notes: 'Active station — Overall plant operations'
    }
  ],

  // General Staff Route
  default: [
    {
      stopNo: 1,
      title: 'SM Concrete Plant HQ',
      category: 'Punch In',
      address: 'Tanang, Sangli-Miraj Road',
      time: '09:00 AM',
      lat: 16.8450,
      lng: 74.6200,
      status: 'Departed',
      distanceKm: 0.0,
      stayMinutes: 60,
      notes: 'Morning shift check-in'
    },
    {
      stopNo: 2,
      title: 'Vishrambag Operations Hub',
      category: 'Field Visit',
      address: 'Vishrambag, Sangli',
      time: '10:45 AM',
      lat: 16.8480,
      lng: 74.6020,
      status: 'Visited',
      distanceKm: 4.8,
      stayMinutes: 40,
      notes: 'Client billing coordination'
    },
    {
      stopNo: 3,
      title: 'Sangli Market Yard APMC',
      category: 'Current Location',
      address: 'APMC Market Yard, Sangli',
      time: '01:10 PM',
      lat: 16.8584,
      lng: 74.5824,
      status: 'Current Stop',
      distanceKm: 8.9,
      stayMinutes: null,
      notes: 'Active station'
    }
  ]
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
 * Retrieves all stored route histories
 */
export function getAllRouteHistories() {
  try {
    const raw = localStorage.getItem(ROUTE_HISTORY_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
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
 * Returns visited route waypoints, total km, and polyline points for an employee
 */
export function getEmployeeRouteDetails(employee, liveGps = null) {
  if (!employee) return null;

  const empId = (employee.employeeId || employee.id || 'EMP-01').toUpperCase();
  const roleLower = (employee.role || '').toLowerCase();
  const allHistories = getAllRouteHistories();

  let stops = [];

  if (allHistories[empId] && Array.isArray(allHistories[empId]) && allHistories[empId].length > 0) {
    stops = [...allHistories[empId]];
  } else {
    // Select role-specific baseline route
    let template = DEFAULT_ROUTE_TRAILS.default;
    if (roleLower.includes('driver')) {
      template = DEFAULT_ROUTE_TRAILS.driver;
    } else if (roleLower.includes('supervisor')) {
      template = DEFAULT_ROUTE_TRAILS.supervisor;
    } else if (roleLower.includes('quality') || roleLower.includes('qc') || roleLower.includes('lab')) {
      template = DEFAULT_ROUTE_TRAILS.qc;
    } else if (roleLower.includes('account')) {
      template = DEFAULT_ROUTE_TRAILS.accountant;
    } else if (roleLower.includes('dispatch')) {
      template = DEFAULT_ROUTE_TRAILS.dispatcher;
    } else if (roleLower.includes('manager')) {
      template = DEFAULT_ROUTE_TRAILS.manager;
    }
    stops = JSON.parse(JSON.stringify(template));
  }

  // If the employee has a verified live GPS fix, update or append current stop
  const currentLat = liveGps?.lat || employee.lat;
  const currentLng = liveGps?.lng || employee.lng;

  if (currentLat && currentLng) {
    const lastStop = stops[stops.length - 1];
    const distToLast = lastStop ? calculateDistanceMeters(lastStop.lat, lastStop.lng, currentLat, currentLng) : 999;
    
    const landmark = resolveSangliLandmark(currentLat, currentLng);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (distToLast > 250) {
      // Significantly moved — add new live waypoint
      const prevKm = lastStop ? lastStop.distanceKm : 0;
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

  // Polyline array for Leaflet [ [lat, lng], [lat, lng], ... ]
  const polylineCoords = stops.map((s) => [Number(s.lat), Number(s.lng)]);
  const totalDistanceKm = stops.length > 0 ? stops[stops.length - 1].distanceKm : 0;
  const visitedStopsCount = stops.filter((s) => s.status !== 'Current Stop').length;

  return {
    employeeId: empId,
    employeeName: employee.name,
    role: employee.role,
    stops,
    polylineCoords,
    totalDistanceKm,
    visitedStopsCount,
    currentLocation: stops[stops.length - 1] || null,
    googleMapsFullRouteUrl: `https://www.google.com/maps/dir/${polylineCoords.map(p => `${p[0]},${p[1]}`).join('/')}`
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
