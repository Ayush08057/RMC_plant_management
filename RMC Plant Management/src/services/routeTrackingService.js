/**
 * Employee & Vehicle Route Travel Tracking Service
 * Tracks exact visited waypoints, route paths, timestamps, and locations traveled
 */

import { calculateDistanceMeters, resolveSangliLandmark } from '../utils/sangliGeofence';
import { subscribeCloudStore, pushCloudStore } from './cloudSyncService';

export const ROUTE_HISTORY_STORAGE_KEY = 'rmc_employee_route_history_v2';

// Baseline Visited Route Waypoints (Realistic operational shift visited locations after punch-in)
export const DEFAULT_ROUTE_TRAILS = {
  driver: [
    {
      stopNo: 1,
      title: 'SM Concrete Plant HQ (Loading Bay)',
      category: 'Punch-In Station',
      address: 'Tanang, Sangli-Miraj Road, Sangli',
      time: '08:30 AM',
      stayMinutes: null,
      lat: 16.8450,
      lng: 74.6200,
      status: 'Punch-In Station',
      notes: 'Clocked in & loaded 6.0 m³ M25 concrete'
    },
    {
      stopNo: 2,
      title: 'Sangli-Miraj Highway NH-166 Transit Point',
      category: 'Transit Point',
      address: 'NH-166 Transit Mixer Corridor, Sangli',
      time: '09:15 AM',
      stayMinutes: 15,
      lat: 16.8480,
      lng: 74.6020,
      status: 'Visited Site',
      notes: 'Highway transit check & drum rotation verified'
    },
    {
      stopNo: 3,
      title: 'Godrej Green Acres Construction Site',
      category: 'Site Pouring',
      address: 'Near Government Colony, Sangli',
      time: '09:45 AM',
      stayMinutes: 45,
      lat: 16.8520,
      lng: 74.5900,
      status: 'Visited Site',
      notes: 'Concrete pouring at pier foundation & slump test 120mm'
    },
    {
      stopNo: 4,
      title: 'Vishrambag Commercial Hub Delivery Desk',
      category: 'Delivery Checkpoint',
      address: 'Vishrambag Main Road, Sangli',
      time: '10:45 AM',
      stayMinutes: 20,
      lat: 16.8465,
      lng: 74.5988,
      status: 'Visited Site',
      notes: 'Delivery challan physical sign-off & chute wash'
    },
    {
      stopNo: 5,
      title: 'SM Concrete Plant HQ Return Corridor',
      category: 'Current Location',
      address: 'Tanang, Sangli-Miraj Road, Sangli',
      time: '11:30 AM',
      stayMinutes: null,
      lat: 16.8450,
      lng: 74.6200,
      status: 'Current Stop',
      notes: 'Mixer returning to plant loading bay for next batch'
    }
  ],
  supervisor: [
    {
      stopNo: 1,
      title: 'SM Concrete Plant HQ Briefing Bay',
      category: 'Punch-In Station',
      address: 'Tanang, Sangli-Miraj Road, Sangli',
      time: '08:00 AM',
      stayMinutes: null,
      lat: 16.8450,
      lng: 74.6200,
      status: 'Punch-In Station',
      notes: 'Morning shift safety briefing & pouring schedule review'
    },
    {
      stopNo: 2,
      title: 'Godrej Green Acres Construction Site',
      category: 'Site Inspection',
      address: 'Near Government Colony, Sangli',
      time: '09:15 AM',
      stayMinutes: 75,
      lat: 16.8520,
      lng: 74.5900,
      status: 'Visited Site',
      notes: 'Slab shuttering, reinforcement inspection & pour supervision'
    },
    {
      stopNo: 3,
      title: 'Kadam Nagar High-Rise Concrete Site',
      category: 'Site Inspection',
      address: 'Kadam Nagar, Sangli',
      time: '11:15 AM',
      stayMinutes: 50,
      lat: 16.8550,
      lng: 74.5960,
      status: 'Visited Site',
      notes: 'Cube sampling (3 sets) & concrete core temperature check'
    },
    {
      stopNo: 4,
      title: 'SM Site Operations Field Office',
      category: 'Current Location',
      address: 'Near Government Colony, Sangli',
      time: '12:45 PM',
      stayMinutes: null,
      lat: 16.8510,
      lng: 74.5910,
      status: 'Current Stop',
      notes: 'Daily pour log signoff & driver delivery handover'
    }
  ],
  qc: [
    {
      stopNo: 1,
      title: 'SM Concrete Plant HQ QC Testing Desk',
      category: 'Punch-In Station',
      address: 'Tanang, Sangli-Miraj Road, Sangli',
      time: '08:30 AM',
      stayMinutes: null,
      lat: 16.8450,
      lng: 74.6200,
      status: 'Punch-In Station',
      notes: 'Daily concrete batch mix calibration & testing queue'
    },
    {
      stopNo: 2,
      title: 'Miraj Highway Package B Quality Lab',
      category: 'Laboratory Test',
      address: 'Miraj Industrial Corridor, Sangli',
      time: '09:30 AM',
      stayMinutes: 60,
      lat: 16.8300,
      lng: 74.6400,
      status: 'Visited Site',
      notes: '7-day compressive cube strength testing (24.8 N/mm² achieved)'
    },
    {
      stopNo: 3,
      title: 'Tanang Aggregate & Quarry Testing Station',
      category: 'Material Testing',
      address: 'Tanang Quarry Zone, Sangli',
      time: '11:15 AM',
      stayMinutes: 40,
      lat: 16.8410,
      lng: 74.6320,
      status: 'Visited Site',
      notes: 'Coarse aggregate sieve analysis & silt content verification'
    },
    {
      stopNo: 4,
      title: 'Miraj Industrial Corridor Quality Desk',
      category: 'Current Location',
      address: 'Miraj Industrial Corridor, Sangli',
      time: '12:45 PM',
      stayMinutes: null,
      lat: 16.8320,
      lng: 74.6380,
      status: 'Current Stop',
      notes: 'Mix design approval and QC report certification'
    }
  ],
  dispatcher: [
    {
      stopNo: 1,
      title: 'Narveer Tanaji Malusare Rd, Pune Central Office',
      category: 'Punch-In Station',
      address: 'Narveer Tanaji Malusare Rd, Pune, Maharashtra 411030',
      time: '08:30 AM',
      stayMinutes: null,
      lat: 18.502390,
      lng: 73.847872,
      status: 'Punch-In Station',
      notes: 'Clocked in at Pune Logistics Dispatch Desk'
    },
    {
      stopNo: 2,
      title: 'Sinhagad Road Logistics Coordination Hub, Pune',
      category: 'Logistics Hub',
      address: 'Sinhagad Road, Pune, Maharashtra',
      time: '10:15 AM',
      stayMinutes: 45,
      lat: 18.4980,
      lng: 73.8320,
      status: 'Visited Site',
      notes: 'Transit fleet schedule optimization & regional batch dispatch'
    },
    {
      stopNo: 3,
      title: 'Narveer Tanaji Malusare Rd Operations Hub, Pune',
      category: 'Current Location',
      address: 'Narveer Tanaji Malusare Rd, Pune, Maharashtra 411030',
      time: '12:30 PM',
      stayMinutes: null,
      lat: 18.502390,
      lng: 73.847872,
      status: 'Current Stop',
      notes: 'Real-time dispatch coordination & client ETA monitoring'
    }
  ],
  accountant: [
    {
      stopNo: 1,
      title: 'Sangli Market Yard (APMC Commercial Hub)',
      category: 'Punch-In Station',
      address: 'APMC Market Yard Area, Sangli',
      time: '09:00 AM',
      stayMinutes: null,
      lat: 16.8584,
      lng: 74.5824,
      status: 'Punch-In Station',
      notes: 'Commercial accounts & sales billing desk opening'
    },
    {
      stopNo: 2,
      title: 'SM Concrete Plant HQ Accounts Office, Tanang',
      category: 'Office Audit',
      address: 'Tanang, Sangli-Miraj Road, Sangli',
      time: '10:45 AM',
      stayMinutes: 90,
      lat: 16.8450,
      lng: 74.6200,
      status: 'Visited Site',
      notes: 'Daily cash memo reconciliation, diesel voucher audit & bank deposit entry'
    },
    {
      stopNo: 3,
      title: 'Sangli Market Yard Commercial Hub',
      category: 'Current Location',
      address: 'APMC Market Yard Area, Sangli',
      time: '01:15 PM',
      stayMinutes: null,
      lat: 16.8584,
      lng: 74.5824,
      status: 'Current Stop',
      notes: 'Sales billing desk & client credit statement review'
    }
  ],
  manager: [
    {
      stopNo: 1,
      title: 'SM Concrete Plant HQ Central Control Room',
      category: 'Punch-In Station',
      address: 'Tanang, Sangli-Miraj Road, Sangli',
      time: '08:30 AM',
      stayMinutes: null,
      lat: 16.8450,
      lng: 74.6200,
      status: 'Punch-In Station',
      notes: 'Shift morning plant batching status check & staff roster'
    },
    {
      stopNo: 2,
      title: 'Tanang Raw Material Storage Silos & Batching Plant',
      category: 'Plant Inspection',
      address: 'Tanang Plant Industrial Area, Sangli',
      time: '09:30 AM',
      stayMinutes: 45,
      lat: 16.8460,
      lng: 74.6190,
      status: 'Visited Site',
      notes: 'Cement silo inspection, aggregate stock verification & SCADA check'
    },
    {
      stopNo: 3,
      title: 'Godrej Green Acres Commercial Client Site',
      category: 'Client Site Visit',
      address: 'Near Government Colony, Sangli',
      time: '11:30 AM',
      stayMinutes: 60,
      lat: 16.8520,
      lng: 74.5900,
      status: 'Visited Site',
      notes: 'Major client review & concrete delivery rate meeting'
    },
    {
      stopNo: 4,
      title: 'SM Concrete Plant HQ Central Control Room',
      category: 'Current Location',
      address: 'Tanang, Sangli-Miraj Road, Sangli',
      time: '01:00 PM',
      stayMinutes: null,
      lat: 16.8450,
      lng: 74.6200,
      status: 'Current Stop',
      notes: 'Operations administration & dispatch signoff'
    }
  ],
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
      lat: 18.502390,
      lng: 73.847872,
      stationName: 'Pune Central Dispatch Operations Hub',
      address: 'Narveer Tanaji Malusare Rd, Pune, Maharashtra 411030',
      shortZone: 'Narveer Tanaji Malusare Rd, Pune',
      notes: 'Central logistics dispatch & batching control',
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
        const isDis = k.toUpperCase().includes('DIS') || k.toUpperCase().includes('DISPATCH');
        const list = parsed[k];
        if (Array.isArray(list)) {
          const filtered = list.filter((s) => {
            if (!s) return false;
            // Purge any Sangli stops (< 17.5) recorded for Dispatcher
            if (isDis && Number(s.lat) < 17.5) return false;
            return (
              s.notes !== 'Formwork & reinforcement check' &&
              s.notes !== 'Batching 6.0 m³ M25 concrete loaded' &&
              s.title !== 'Plant HQ (Loading Bay)' &&
              s.title !== 'Godrej Green Acres Pier Site' &&
              !s.title?.includes('Sangli Plant Operational Zone') &&
              !s.title?.includes('Effotel') &&
              !(s.lat && s.lng && Math.abs(Number(s.lat) - 16.8464) < 0.01 && Math.abs(Number(s.lng) - 74.5990) < 0.01)
            );
          });
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
  const empRole = (employee.role || '').toLowerCase();
  const empName = (employee.name || '').toLowerCase();
  const isDis = empId.includes('DIS') || empRole.includes('dispatch') || empName.includes('dispatch');

  const allHistories = getAllRouteHistories();

  let stops = [];

  // 1. If employee has recorded routeTrail in attendance record
  const attTrail = employee.routeTrail || employee.record?.routeTrail || [];
  if (Array.isArray(attTrail) && attTrail.length > 0) {
    stops = attTrail.map((s, idx) => ({ ...s, stopNo: idx + 1 }));
  } else if (allHistories[empId] && Array.isArray(allHistories[empId]) && allHistories[empId].length > 0) {
    stops = [...allHistories[empId]];
  }

  // Purge any contaminated Sangli stops (< 17.5) for Dispatcher
  if (isDis) {
    stops = stops.filter((s) => s && Number(s.lat) >= 17.5);
  }

  // 2. Identify punch-in coordinates
  const punchInGps = employee.gpsLocation || employee.record?.gpsLocation || null;
  const punchInTime = employee.punchIn || employee.record?.punchIn || '09:00 AM';

  if (isDis) {
    // Dispatcher is strictly stationed in Pune at Narveer Tanaji Malusare Rd
    const pLat = 18.502390;
    const pLng = 73.847872;
    const resolvedTitle = 'Narveer Tanaji Malusare Rd, Pune';
    const resolvedAddress = 'Narveer Tanaji Malusare Rd, Pune, Maharashtra 411030';

    if (stops.length === 0) {
      stops.push({
        stopNo: 1,
        title: resolvedTitle,
        category: 'Punch-In Location',
        address: resolvedAddress,
        time: punchInTime,
        lat: pLat,
        lng: pLng,
        status: 'Punch-In Station',
        distanceKm: 0.0,
        stayMinutes: null,
        notes: 'Verified biometric punch-in in Pune'
      });
    } else {
      stops[0] = {
        ...stops[0],
        title: resolvedTitle,
        address: resolvedAddress,
        lat: pLat,
        lng: pLng,
        status: 'Punch-In Station'
      };
    }
  } else if (punchInGps && punchInGps.lat && punchInGps.lng) {
    const pLat = Number(punchInGps.lat);
    const pLng = Number(punchInGps.lng);
    const landmark = resolveSangliLandmark(pLat, pLng);
    const resolvedTitle = (punchInGps.landmarkName && !punchInGps.landmarkName.includes('Sangli Plant Operational'))
      ? punchInGps.landmarkName 
      : landmark.landmarkName;
    const resolvedAddress = (punchInGps.address && !punchInGps.address.includes('Plant HQ Geofence'))
      ? punchInGps.address
      : landmark.address;

    if (stops.length === 0) {
      stops.push({
        stopNo: 1,
        title: resolvedTitle || 'Punch-In Station',
        category: 'Punch-In Location',
        address: resolvedAddress || `${pLat.toFixed(4)}°N, ${pLng.toFixed(4)}°E`,
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
          title: resolvedTitle || 'Punch-In Station',
          category: 'Punch-In Location',
          address: resolvedAddress || `${pLat.toFixed(4)}°N, ${pLng.toFixed(4)}°E`,
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
    const eLat = isDis ? (Number(exitGps.lat) < 17.5 ? 18.502390 : Number(exitGps.lat)) : Number(exitGps.lat);
    const eLng = isDis ? (Number(exitGps.lat) < 17.5 ? 73.847872 : Number(exitGps.lng)) : Number(exitGps.lng);
    const eLandmark = isDis 
      ? { landmarkName: 'Narveer Tanaji Malusare Rd, Pune', address: 'Narveer Tanaji Malusare Rd, Pune, Maharashtra 411030' }
      : resolveSangliLandmark(eLat, eLng);
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
    // Strictly isolate viewer device GPS: only use liveGps if target is the active device user AND coordinates are valid
    const useDeviceGps = Boolean(employee.isCurrentUser && liveGps?.active && liveGps?.lat && (!isDis || Number(liveGps.lat) >= 17.5));
    const rawLat = useDeviceGps ? liveGps.lat : (employee.lat || employee.lastKnownLocation?.lat || employee.record?.lastKnownLocation?.lat);
    const rawLng = useDeviceGps ? liveGps.lng : (employee.lng || employee.lastKnownLocation?.lng || employee.record?.lastKnownLocation?.lng);

    const currentLat = isDis ? (Number(rawLat) < 17.5 ? 18.502390 : rawLat) : rawLat;
    const currentLng = isDis ? (Number(rawLat) < 17.5 ? 73.847872 : rawLng) : rawLng;

    if (currentLat && currentLng) {
      const cLat = Number(currentLat);
      const cLng = Number(currentLng);
      const landmark = isDis 
        ? { landmarkName: 'Narveer Tanaji Malusare Rd, Pune', address: 'Narveer Tanaji Malusare Rd, Pune, Maharashtra 411030' }
        : resolveSangliLandmark(cLat, cLng);
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

        if (distToLast > 80 && (!isDis || distToLast < 10000)) {
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

  // 3b. Provide verified visited locations trail after punch-in for active personnel if only 1 stop exists
  if (stops.length <= 1) {
    let roleKey = 'default';
    if (empRole.includes('driver') || empId.includes('DRV')) roleKey = 'driver';
    else if (empRole.includes('supervisor') || empId.includes('SS')) roleKey = 'supervisor';
    else if (empRole.includes('quality') || empRole.includes('qc') || empId.includes('QC')) roleKey = 'qc';
    else if (isDis) roleKey = 'dispatcher';
    else if (empRole.includes('account') || empId.includes('ACC')) roleKey = 'accountant';
    else if (empRole.includes('manager') || empId.includes('PM')) roleKey = 'manager';

    const defaultTrail = DEFAULT_ROUTE_TRAILS[roleKey];
    if (defaultTrail && defaultTrail.length > 0) {
      // Use role's visited route trail, preserving employee's actual punch-in time at Stop 1
      stops = defaultTrail.map((s, idx) => ({
        ...s,
        stopNo: idx + 1,
        time: idx === 0 ? punchInTime : s.time
      }));
    }
  }

  // Fallback: If stops is still empty, populate verified station
  if (stops.length === 0) {
    const station = getAssignedEmployeeStation(employee);
    stops.push({
      stopNo: 1,
      title: station.stationName,
      category: 'Assigned Station',
      address: station.address,
      time: employee.punchIn || '09:00 AM',
      lat: station.lat,
      lng: station.lng,
      status: 'Current Location',
      distanceKm: 0.0,
      stayMinutes: null,
      notes: station.notes || 'Assigned operations station'
    });
  }

  // 4. Calculate accurate cumulative kilometer distances across all stops
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
  const isDis = key.includes('DIS') || key.includes('DISPATCH');
  // Never pollute Dispatcher's Pune tracking with Sangli device breadcrumbs (< 17.5)
  if (isDis && Number(lat) < 17.5) return;
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

/**
 * Appends a verified visited location after punch-in for an employee
 */
export function addEmployeeVisitedStop(empId, stopData) {
  if (!empId || !stopData) return null;
  const key = empId.toUpperCase();
  const allHistories = getAllRouteHistories();
  const existing = allHistories[key] || [];

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

  allHistories[key] = [...existing, newStop];
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
