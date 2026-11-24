import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, 
  MapPin, 
  Truck, 
  ExternalLink, 
  Layers, 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Route, 
  Crosshair,
  Clock,
  ArrowRight,
  Key,
  Check,
  Settings,
  ShieldCheck,
  AlertCircle,
  X,
  User,
  GitCommit
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { isAdminPerson } from '../../data/mockUsers';
import { fetchRoadSnappedRoute, snapCoordinateToRoad } from '../../services/roadSnapService';

// Sangli Plant HQ anchor
const SANGLI_PLANT_HQ = { lat: 16.8450, lng: 74.6200, name: 'SM Concrete Plant HQ, Tanang' };

export const LEAFLET_STORAGE_KEY = 'rmc_leaflet_api_key';
export const LEAFLET_PROVIDER_KEY = 'rmc_leaflet_tile_provider';

/**
 * Generates clean tile configuration for Leaflet
 * Primary Default: Google Maps Standard Street & Hybrid Satellite (100% Free, NO API Key needed, Zero Watermarks)
 * Secondary Default: Esri World Street & World Imagery (Zero Watermarks)
 * Optional: Custom Leaflet / Carto API Key if provided
 */
export function getTileConfig(isSatellite, apiKey = '', provider = 'google') {
  const trimmedKey = (apiKey || '').trim();

  // If user selected CartoDB and provided a key, append api_key query param to avoid watermark
  if (provider === 'carto' && trimmedKey.length > 0) {
    return {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${encodeURIComponent(trimmedKey)}`,
      options: {
        maxZoom: 20,
        subdomains: 'abcd',
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
      }
    };
  }

  // Satellite view (High-Resolution Google Hybrid with roads & local labels)
  if (isSatellite || provider === 'satellite') {
    return {
      url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      options: {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Satellite'
      }
    };
  }

  // If user selected Esri World Street (clean corporate road map, zero watermark)
  if (provider === 'esri_street') {
    return {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      options: {
        maxZoom: 19,
        subdomains: ['server'],
        attribution: '&copy; Esri World Street'
      }
    };
  }

  // Primary Default: Google Maps Standard Street (100% Free, Zero Watermarks, Clean Sangli/Miraj Road Geometry)
  return {
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    options: {
      maxZoom: 20,
      subdomains: ['0', '1', '2', '3'],
      attribution: '&copy; Google Maps'
    }
  };
}


/**
 * Calculates forward bearing angle (0 - 360 degrees, 0 = North, 90 = East, 180 = South, 270 = West)
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}

/**
 * Returns compass cardinal direction string (N, NE, E, SE, S, SW, W, NW)
 */
function getCardinalDirection(bearing) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Finds the local heading of a polyline at a given coordinate
 */
function getRouteBearingAtPoint(coords, targetLat, targetLng) {
  if (!coords || coords.length < 2) return 0;

  let closestIdx = 0;
  let minDistanceSq = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const dLat = coords[i][0] - targetLat;
    const dLng = coords[i][1] - targetLng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      closestIdx = i;
    }
  }

  // Look ahead along coords for next distinct coordinate (at least ~3-5m away)
  for (let i = closestIdx + 1; i < coords.length; i++) {
    const nextLat = coords[i][0];
    const nextLng = coords[i][1];
    const dLat = Math.abs(nextLat - targetLat);
    const dLng = Math.abs(nextLng - targetLng);
    if (dLat > 0.00003 || dLng > 0.00003) {
      return calculateBearing(targetLat, targetLng, nextLat, nextLng);
    }
  }

  // If at the end, look backwards
  for (let i = closestIdx - 1; i >= 0; i--) {
    const prevLat = coords[i][0];
    const prevLng = coords[i][1];
    const dLat = Math.abs(targetLat - prevLat);
    const dLng = Math.abs(targetLng - prevLng);
    if (dLat > 0.00003 || dLng > 0.00003) {
      return calculateBearing(prevLat, prevLng, targetLat, targetLng);
    }
  }

  return 0;
}


/**
 * Calculates geodesic distance in meters between two lat/lng coordinates
 */
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function LiveInteractiveMap({
  telemetryList = [],
  activeTarget = null,
  activeRouteDetails = null,
  selectedStop = null,
  onSelectStop = () => {},
  realDeviceGps = null,
  onSelectTarget = () => {},
  mapSatellite = false,
  onToggleSatellite = () => {},
  mapRouteMode = true,
  onToggleRouteMode = () => {},
  isFullWidth = false,
  onToggleFullWidth = () => {},
}) {
  const { t } = useLanguage();
    const mapContainerRef = useRef(null);
  const mapFrameRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const routeLayerGroupRef = useRef(null);
  const markersLayerGroupRef = useRef(null);
  const lastTargetIdRef = useRef(null);
  const liveMarkerRef = useRef(null);
  const liveMarkerTargetIdRef = useRef(null);
  const wasConcludedRef = useRef(false);
  const drawnPolylineCoordsRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Leaflet API Key & Clean Tile Provider State Management
  const [leafletApiKey, setLeafletApiKey] = useState(() => {
    try {
      return localStorage.getItem(LEAFLET_STORAGE_KEY) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LEAFLET_API_KEY) || '';
    } catch {
      return '';
    }
  });

  const [tileProvider, setTileProvider] = useState(() => {
    try {
      const saved = localStorage.getItem(LEAFLET_PROVIDER_KEY);
      if (saved && saved !== 'osm') return saved;
      return 'google';
    } catch {
      return 'google';
    }
  });

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputApiKey, setInputApiKey] = useState(leafletApiKey);
  const [keySavedToast, setKeySavedToast] = useState(false);
  // Default false so true hardware GPS path renders cleanly without artificial OSRM street loops
  const [roadSnapEnabled, setRoadSnapEnabled] = useState(true);
  const lastFetchedStopsKeyRef = useRef('');
  const requestSeqRef = useRef(0);
  const [snappedRouteState, setSnappedRouteState] = useState(null);
  const [snappedLiveGps, setSnappedLiveGps] = useState(null);
  const hasFittedRef = useRef(false);

  // Validate active target (strictly non-admin)
  const validTarget = activeTarget && !isAdminPerson(activeTarget) ? activeTarget : null;
  const isShiftConcluded = Boolean(
    validTarget?.status === 'Shift Ended' ||
    validTarget?.status === 'Completed' ||
    validTarget?.punchOut ||
    validTarget?.record?.punchOut
  );
  const stops = activeRouteDetails?.stops || [];
  const startStop = stops.length > 0 ? stops[0] : null;
  const endStop = stops.length > 0 ? stops[stops.length - 1] : null;
  const totalKm = activeRouteDetails?.totalDistanceKm || (stops.length > 1 ? stops[stops.length - 1].distanceKm : 0);

  const targetLat = validTarget?.lat != null ? Number(validTarget.lat) : null;
  const targetLng = validTarget?.lng != null ? Number(validTarget.lng) : null;
  const currentTargetId = String(validTarget?.id || validTarget?.employeeId || '');

  const punchInSource = validTarget?.gpsLocation || validTarget?.record?.gpsLocation || startStop;
  const punchInLat = punchInSource?.lat != null ? Number(punchInSource.lat) : null;
  const punchInLng = punchInSource?.lng != null ? Number(punchInSource.lng) : null;
  const hasPunchIn = Number.isFinite(punchInLat) && Number.isFinite(punchInLng) && punchInLat !== 0 && punchInLng !== 0;

  const punchOutSource = validTarget?.exitGpsLocation || validTarget?.record?.exitGpsLocation || endStop;
  const punchOutLat = punchOutSource?.lat != null ? Number(punchOutSource.lat) : targetLat;
  const punchOutLng = punchOutSource?.lng != null ? Number(punchOutSource.lng) : targetLng;
  const hasPunchOut = isShiftConcluded && Number.isFinite(punchOutLat) && Number.isFinite(punchOutLng) && punchOutLat !== 0 && punchOutLng !== 0;

  const isLiveSnapped = Boolean(!isShiftConcluded && roadSnapEnabled && snappedLiveGps && snappedLiveGps.snapped);
  const displayLat = isLiveSnapped ? Number(snappedLiveGps.lat) : targetLat;
  const displayLng = isLiveSnapped ? Number(snappedLiveGps.lng) : targetLng;
  const hasLiveCoords = !hasPunchOut && validTarget && Number.isFinite(displayLat) && Number.isFinite(displayLng) && displayLat !== 0 && displayLng !== 0;

  const userInteractedRef = useRef(false);

  // Save Leaflet API Key or Provider Setting
  const handleSaveApiKey = (newKey, newProvider = tileProvider) => {
    const trimmed = (newKey || '').trim();
    setLeafletApiKey(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem(LEAFLET_STORAGE_KEY, trimmed);
      } else {
        localStorage.removeItem(LEAFLET_STORAGE_KEY);
      }
      localStorage.setItem(LEAFLET_PROVIDER_KEY, newProvider);
    } catch (e) {
      console.warn('Failed saving leaflet key to localStorage:', e);
    }
    setTileProvider(newProvider);
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 2500);
  };

  // Initialize Leaflet Map once on mount with clean watermark-free tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Safety: reset _leaflet_id if component was re-mounted in React StrictMode
    if (mapContainerRef.current._leaflet_id) {
      mapContainerRef.current._leaflet_id = null;
    }

    const initialLat = validTarget?.lat || SANGLI_PLANT_HQ.lat;
    const initialLng = validTarget?.lng || SANGLI_PLANT_HQ.lng;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    map.on('dragstart', () => {
      userInteractedRef.current = true;
    });
    map.on('zoomstart', () => {
      userInteractedRef.current = true;
    });

    // Clean Tile Layer Configuration (Google Maps / Esri - 100% Free, NO WATERMARKS)
    const config = getTileConfig(mapSatellite, leafletApiKey, tileProvider);
    const tileLayer = L.tileLayer(config.url, config.options).addTo(map);

    tileLayer.on('tileerror', () => {
      // Automatic fallback to Esri World Street if tile fails
      if (tileLayerRef.current) {
        tileLayerRef.current.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}');
      }
    });

    tileLayerRef.current = tileLayer;

    // Layer groups for clean vector and marker updates
    const routeGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    routeLayerGroupRef.current = routeGroup;
    markersLayerGroupRef.current = markersGroup;
    mapInstanceRef.current = map;
    setMapReady(true);

    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      routeLayerGroupRef.current = null;
      markersLayerGroupRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Update Tile Layer when satellite, API key, or provider toggles
  useEffect(() => {
    if (!tileLayerRef.current || !mapInstanceRef.current) return;
    const config = getTileConfig(mapSatellite, leafletApiKey, tileProvider);
    tileLayerRef.current.setUrl(config.url);
  }, [mapSatellite, leafletApiKey, tileProvider]);

    // Fullscreen management: seamless HTML5 Fullscreen API with graceful fixed CSS fallback
  const toggleFullscreen = () => {
    const el = mapFrameRef.current;
    if (!isFullscreen) {
      if (el) {
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
          el.msRequestFullscreen();
        }
      }
      setIsFullscreen(true);
    } else {
      if (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      ) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
      setIsFullscreen(false);
    }
    if (typeof onToggleFullWidth === 'function') {
      try {
        onToggleFullWidth();
      } catch (err) {
        console.warn('onToggleFullWidth error', err);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        ) {
          if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Invalidate map size on full width or fullscreen toggle
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timers = [
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 50),
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150),
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300),
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 500)
    ];
    return () => timers.forEach(clearTimeout);
  }, [isFullWidth, isFullscreen]);

  // Asynchronously resolve road-snapped geometry along real roads for BOTH live tracking and concluded shifts
  useEffect(() => {
    let isCancelled = false;

    // Collect all real points for the current employee's shift to resolve exact road geometry
    const pointsToSnap = [];
    if (hasPunchIn) {
      pointsToSnap.push({ lat: punchInLat, lng: punchInLng });
    }
    (stops || []).forEach((s) => {
      const sLat = Number(s?.lat);
      const sLng = Number(s?.lng);
      if (Number.isFinite(sLat) && Number.isFinite(sLng) && sLat !== 0 && sLng !== 0) {
        const prev = pointsToSnap[pointsToSnap.length - 1];
        if (!prev || Math.abs(prev.lat - sLat) > 0.0001 || Math.abs(prev.lng - sLng) > 0.0001) {
          pointsToSnap.push({ lat: sLat, lng: sLng });
        }
      }
    });
    if (hasPunchOut) {
      const prev = pointsToSnap[pointsToSnap.length - 1];
      if (!prev || Math.abs(prev.lat - punchOutLat) > 0.0001 || Math.abs(prev.lng - punchOutLng) > 0.0001) {
        pointsToSnap.push({ lat: punchOutLat, lng: punchOutLng });
      }
    } else if (hasLiveCoords) {
      const prev = pointsToSnap[pointsToSnap.length - 1];
      if (!prev || Math.abs(prev.lat - displayLat) > 0.0001 || Math.abs(prev.lng - displayLng) > 0.0001) {
        pointsToSnap.push({ lat: displayLat, lng: displayLng });
      }
    }

    if (roadSnapEnabled && pointsToSnap.length > 1) {
      fetchRoadSnappedRoute(pointsToSnap)
        .then((res) => {
          if (!isCancelled && res) {
            setSnappedRouteState(res);
          }
        })
        .catch(() => {
          if (!isCancelled) setSnappedRouteState(null);
        });
    } else {
      setSnappedRouteState(null);
    }

    if (roadSnapEnabled && !isShiftConcluded && validTarget?.lat && validTarget?.lng) {
      snapCoordinateToRoad(validTarget.lat, validTarget.lng)
        .then((res) => {
          if (!isCancelled && res) {
            setSnappedLiveGps(res);
          }
        })
        .catch(() => {
          if (!isCancelled) setSnappedLiveGps(null);
        });
    } else {
      setSnappedLiveGps(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [
    roadSnapEnabled,
    isShiftConcluded,
    hasPunchIn,
    punchInLat,
    punchInLng,
    hasPunchOut,
    punchOutLat,
    punchOutLng,
    hasLiveCoords,
    displayLat,
    displayLng,
    stops,
    validTarget?.id,
    validTarget?.lat,
    validTarget?.lng
  ]);

  // Draw clean map markers & route with smooth persistent live-pin updates (zero flicker):
  // - Before Punch-Out: ONLY clean Punch-In anchor + pulsing teardrop Employee Live Pointer
  // - After Punch-Out: Clean travelled route polyline + Punch-In anchor + Punch-Out anchor
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !routeLayerGroupRef.current || !markersLayerGroupRef.current) return;

    const map = mapInstanceRef.current;
    const routeGroup = routeLayerGroupRef.current;
    const markersGroup = markersLayerGroupRef.current;

    // Target and display coordinates are lifted to component level

    const targetPhoto = validTarget?.selfieUrl || validTarget?.record?.selfieUrl || validTarget?.photoUrl || punchInSource?.selfieUrl;
    const buildLivePopupHtml = (latVal, lngVal, isOnline) => `
      <div class="p-3 text-xs font-sans min-w-[245px]">
        <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 mb-2">
          <div class="flex items-center gap-2.5 min-w-0">
            ${targetPhoto ? `
              <img src="${targetPhoto}" alt="${validTarget.name}" class="w-10 h-10 rounded-xl object-cover border-2 border-emerald-400 shrink-0 shadow-2xs" />
            ` : ''}
            <div class="min-w-0">
              <div class="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 truncate">
                <span class="truncate">${validTarget.name}</span>
              <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800">${validTarget.employeeId || validTarget.id}</span>
            </div>
            <div class="text-[11px] text-slate-500 font-semibold mt-0.5">${validTarget.role}</div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
            isOnline ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-700 border border-slate-300'
          }">${isOnline ? 'Live' : (validTarget.status || 'Active')}</span>
        </div>
        <div class="space-y-1.5 text-[11px] text-slate-600">
          <div class="bg-slate-50 border border-slate-200 p-2 rounded-lg">
            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Current Location</div>
            <div class="font-bold text-slate-900 text-xs mt-0.5">${validTarget.geofenceStatus || validTarget.stationName || 'Live Position'}</div>
          </div>
          <div class="flex items-center justify-between font-mono text-[10px] bg-blue-50/70 p-2 rounded-lg border border-blue-100">
            <span class="text-slate-600 font-semibold">GPS Fix (±${Math.round(validTarget.accuracy || 15)}m):</span>
            <span class="font-black text-blue-700">${latVal.toFixed(5)}°N, ${lngVal.toFixed(5)}°E</span>
          </div>
          ${validTarget.punchIn ? `
            <div class="flex items-center justify-between text-[11px] px-1">
              <span class="text-slate-500">Punch-In Time:</span>
              <span class="font-bold text-emerald-700 font-mono">${validTarget.punchIn}</span>
            </div>
          ` : ''}
        </div>
        <div class="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between">
          <span class="text-[10px] text-emerald-700 font-bold flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Real-Time Hardware GPS</span>
          </span>
          <a
            href="https://www.google.com/maps/search/?api=1&query=${latVal},${lngVal}"
            target="_blank"
            rel="noopener noreferrer"
            class="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] inline-flex items-center gap-1"
          >
            <span>Google Maps ↗</span>
          </a>
        </div>
      </div>
    `;

    // Smoothly slide existing live pin in-place without destroying/recreating markers if target & mode are unchanged
    if (
      hasLiveCoords &&
      liveMarkerRef.current &&
      liveMarkerTargetIdRef.current === currentTargetId &&
      markersGroup.hasLayer(liveMarkerRef.current)
    ) {
      const isOnline = validTarget.status === 'Punched In' || validTarget.status === 'Tracking' || Boolean(validTarget.punchIn && !validTarget.punchOut);
      liveMarkerRef.current.setLatLng([displayLat, displayLng]);
      liveMarkerRef.current.setPopupContent(buildLivePopupHtml(displayLat, displayLng, isOnline));

      if (!userInteractedRef.current && !map.getBounds().contains([displayLat, displayLng])) {
        map.panTo([displayLat, displayLng], { animate: true, duration: 0.6 });
      }
    }

    routeGroup.clearLayers();
    markersGroup.clearLayers();
    liveMarkerRef.current = null;
    liveMarkerTargetIdRef.current = null;

    if (lastTargetIdRef.current !== currentTargetId || !isShiftConcluded) {
      if (lastTargetIdRef.current !== currentTargetId) {
        userInteractedRef.current = false;
        hasFittedRef.current = false;
        wasConcludedRef.current = false;
      } else if (!isShiftConcluded) {
        wasConcludedRef.current = false;
      }
    }

    // Build complete ordered path across Punch-In -> all intermediate GPS stops -> Punch-Out or Live GPS
    const rawLatLngs = [];
    const appendPointIfDistinct = (ptLat, ptLng) => {
      if (!Number.isFinite(ptLat) || !Number.isFinite(ptLng) || ptLat === 0 || ptLng === 0) return;
      const prev = rawLatLngs[rawLatLngs.length - 1];
      if (!prev || Math.abs(prev[0] - ptLat) > 0.00001 || Math.abs(prev[1] - ptLng) > 0.00001) {
        rawLatLngs.push([ptLat, ptLng]);
      }
    };
    if (hasPunchIn) appendPointIfDistinct(punchInLat, punchInLng);
    stops.forEach((s) => appendPointIfDistinct(Number(s?.lat), Number(s?.lng)));
    if (hasPunchOut) {
      appendPointIfDistinct(punchOutLat, punchOutLng);
    } else if (hasLiveCoords) {
      appendPointIfDistinct(displayLat, displayLng);
    }

    // 1. Draw the complete travelled route line along real roads
    const shouldDrawTrail = rawLatLngs.length > 1;
    let drawnPolylineCoords = rawLatLngs;
    if (shouldDrawTrail) {
      const isRoadSnapped = Boolean(roadSnapEnabled && snappedRouteState && snappedRouteState.snapped && snappedRouteState.coords.length > 1);
      
      // If road snapping is enabled, but road snapped data hasn't arrived yet and points are far apart (> 2km),
      // wait for snapped road coords to avoid drawing an ugly straight diagonal line across the landscape
      const isDistantSparse = rawLatLngs.length === 2 && getDistanceMeters(rawLatLngs[0][0], rawLatLngs[0][1], rawLatLngs[1][0], rawLatLngs[1][1]) > 2000;

      if (isRoadSnapped || !isDistantSparse) {
        const activePolylineCoords = isRoadSnapped ? snappedRouteState.coords : rawLatLngs;
        drawnPolylineCoords = activePolylineCoords;
        drawnPolylineCoordsRef.current = activePolylineCoords;

        if (activePolylineCoords.length > 1) {
          L.polyline(activePolylineCoords, {
            color: '#1e40af',
            weight: 7,
            opacity: 0.28,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(routeGroup);

          const routePoly = L.polyline(activePolylineCoords, {
            color: '#2563eb',
            weight: 4.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(routeGroup);

          const displayDistanceKm = (isRoadSnapped && snappedRouteState.distanceKm > 0)
            ? snappedRouteState.distanceKm
            : (totalKm > 0 ? totalKm : 0);

          routePoly.bindTooltip(`
            <div class="p-1 font-sans text-xs">
              <span class="font-bold text-slate-800">🛣️ Travelled Route:</span>
              <span class="font-extrabold text-blue-700 ml-1">${displayDistanceKm > 0 ? `${displayDistanceKm} KM` : `${rawLatLngs.length} Points`}</span>
            </div>
          `, { sticky: true });
        }
      }
    } else {
      drawnPolylineCoordsRef.current = rawLatLngs;
    }

        // 2. Intermediate GPS Waypoints with Clean Green Directed Arrow Marks (no circle, uncluttered)
    const intermediateStops = stops.filter((s) => {
      if (!s) return false;
      const sLat = Number(s.lat);
      const sLng = Number(s.lng);
      if (!Number.isFinite(sLat) || !Number.isFinite(sLng) || sLat === 0 || sLng === 0) return false;
      if (hasPunchIn && getDistanceMeters(sLat, sLng, punchInLat, punchInLng) < 150) return false;
      if (hasPunchOut && getDistanceMeters(sLat, sLng, punchOutLat, punchOutLng) < 150) return false;
      if (hasLiveCoords && getDistanceMeters(sLat, sLng, displayLat, displayLng) < 150) return false;
      return true;
    });

    // Intelligent spacing to prevent clustering: at least 350m-600m apart depending on trip length
    const minSpacingMeters = totalKm > 10 ? 600 : totalKm > 3 ? 350 : 200;
    const waypointsToRender = [];
    let lastArrowPoint = null;

    if (intermediateStops.length > 0) {
      for (const s of intermediateStops) {
        const sLat = Number(s.lat);
        const sLng = Number(s.lng);
        if (!lastArrowPoint || getDistanceMeters(lastArrowPoint[0], lastArrowPoint[1], sLat, sLng) >= minSpacingMeters) {
          waypointsToRender.push(s);
          lastArrowPoint = [sLat, sLng];
        }
      }
    }

    // Evenly place or supplement directed green arrows along the drawn road polyline
    if (drawnPolylineCoords.length >= 6) {
      const totalPoints = drawnPolylineCoords.length;
      const step = Math.max(1, Math.floor(totalPoints / 12));
      for (let i = step; i < totalPoints - 1; i += step) {
        const pt = drawnPolylineCoords[i];
        if (!lastArrowPoint || getDistanceMeters(lastArrowPoint[0], lastArrowPoint[1], pt[0], pt[1]) >= minSpacingMeters) {
          waypointsToRender.push({
            lat: pt[0],
            lng: pt[1],
            title: 'Route Direction',
            time: '--'
          });
          lastArrowPoint = [pt[0], pt[1]];
        }
      }
    }

    waypointsToRender.forEach((wp) => {
      const wLat = Number(wp.lat);
      const wLng = Number(wp.lng);
      const wpTitle = wp.title || wp.landmarkName || 'Route Waypoint';
      const wpAddress = wp.address || `${wLat.toFixed(5)}°N, ${wLng.toFixed(5)}°E`;
      const wpTime = wp.time || (wp.timestamp ? new Date(wp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--');
      const wpDist = wp.distanceKm != null ? `${wp.distanceKm} KM` : (wp.legKm ? `+${wp.legKm} km` : '');

      const bearing = Number.isFinite(wp.heading) && wp.heading >= 0
        ? wp.heading
        : getRouteBearingAtPoint(drawnPolylineCoords, wLat, wLng);
      const roundedBearing = Math.round(bearing || 0);
      const cardinal = getCardinalDirection(roundedBearing);

      // Clean Green Directed Arrow - NO CIRCLE around it, sits directly on route line
      const waypointIcon = L.divIcon({
        className: 'bg-transparent border-0',
        html: `
          <div class="cursor-pointer select-none group flex items-center justify-center" title="${wpTitle} • Heading ${roundedBearing}° ${cardinal}">
            <svg viewBox="0 0 24 24" class="w-5 h-5 group-hover:scale-135 transition-transform pointer-events-none" style="transform: rotate(${roundedBearing}deg); transform-origin: 50% 50%; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45));">
              <path d="M12 2L3.5 21l8.5-4.5 8.5 4.5z" fill="#10b981" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
            </svg>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11],
      });

      L.marker([wLat, wLng], { icon: waypointIcon, zIndexOffset: 300 })
        .bindPopup(`
          <div class="p-2.5 text-xs font-sans min-w-[220px]">
            <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-2">
              <span class="font-extrabold text-emerald-900 flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" style="transform: rotate(${roundedBearing}deg); transform-origin: 50% 50%;">
                  <path d="M12 2L3.5 21l8.5-4.5 8.5 4.5z" fill="#10b981" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
                </svg>
                <span>Route Direction • ${roundedBearing}° ${cardinal}</span>
              </span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">${wpTime}</span>
            </div>
            <div class="space-y-1.5 text-[11px] text-slate-600">
              <div class="font-bold text-slate-900">${wpTitle}</div>
              <div>${wpAddress}</div>
              <div class="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 font-mono text-[10px]">
                <span class="text-slate-500 font-semibold">Coordinates:</span>
                <span class="font-bold text-slate-800">${wLat.toFixed(5)}°N, ${wLng.toFixed(5)}°E</span>
              </div>
              ${wpDist ? `
                <div class="flex items-center justify-between text-[11px] px-0.5">
                  <span class="text-slate-500">Distance Travelled:</span>
                  <span class="font-bold font-mono text-emerald-700">${wpDist}</span>
                </div>
              ` : ''}
              <div class="pt-1 flex justify-end">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=${wLat},${wLng}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] inline-flex items-center gap-1"
                >
                  <span>Google Maps ↗</span>
                </a>
              </div>
            </div>
          </div>
        `)
        .addTo(markersGroup);
    });

    // 2. Clean Emerald Punch-In Anchor + subtle 25m zone halo
    if (hasPunchIn) {
      const punchInLabel = punchInSource?.landmarkName || punchInSource?.title || startStop?.title || 'Punch-In Station';
      const punchInAddress = punchInSource?.address || startStop?.address || `${punchInLat.toFixed(5)}°N, ${punchInLng.toFixed(5)}°E`;
      const punchInTime = validTarget?.punchIn || startStop?.time || '--';

      L.circle([punchInLat, punchInLng], {
        radius: 25,
        color: '#059669',
        weight: 1.5,
        opacity: 0.45,
        fillColor: '#10b981',
        fillOpacity: 0.10,
      }).addTo(routeGroup);

      const punchInIcon = L.divIcon({
        className: 'bg-transparent border-0',
        html: `
          <div class="flex flex-col items-center cursor-pointer select-none" title="Punch-In: ${punchInLabel}">
            <div class="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 border-[2.5px] border-white shadow-lg flex items-center justify-center">
              <span class="w-2 h-2 rounded-full bg-white"></span>
            </div>
            <div class="mt-1 px-2.5 py-0.5 rounded-full bg-emerald-700 text-white font-black text-[10px] font-mono border border-emerald-200 shadow-md whitespace-nowrap tracking-tight">
              IN${punchInTime && punchInTime !== '--' ? ` • ${punchInTime}` : ''}
            </div>
          </div>
        `,
        iconSize: [110, 44],
        iconAnchor: [55, 12],
        popupAnchor: [0, -12],
      });

      L.marker([punchInLat, punchInLng], { icon: punchInIcon, zIndexOffset: 500 })
        .bindPopup(`
          <div class="p-2.5 text-xs font-sans min-w-[230px]">
            <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-2">
              <span class="font-extrabold text-emerald-800">🟢 Punch-In Anchor</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">${punchInTime}</span>
            </div>
            ${targetPhoto ? `
              <div class="flex items-center gap-2 mb-2 p-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <img src="${targetPhoto}" alt="Punch-In Selfie" class="w-9 h-9 rounded-lg object-cover border border-emerald-400 shrink-0 shadow-2xs" />
                <div class="min-w-0">
                  <div class="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">✓ Punch-In Selfie</div>
                  <div class="font-bold text-slate-900 text-xs truncate">${validTarget?.name || 'Staff'}</div>
                </div>
              </div>
            ` : ''}
            <div class="space-y-1 text-[11px] text-slate-600">
              <div class="font-bold text-slate-900">${punchInLabel}</div>
              <div>${punchInAddress}</div>
              <div class="font-mono text-[10px] text-slate-500 pt-1">${punchInLat.toFixed(5)}°N, ${punchInLng.toFixed(5)}°E</div>
            </div>
          </div>
        `)
        .addTo(markersGroup);
    }

    // 3. Draw End Marker: Punch-Out pin (if concluded) OR Smooth Pulsing Live Location Pointer (if on duty)
    if (hasPunchOut) {
      const punchOutLabel = punchOutSource?.landmarkName || punchOutSource?.title || endStop?.title || 'Punch-Out Station';
      const punchOutAddress = punchOutSource?.address || endStop?.address || `${punchOutLat.toFixed(5)}°N, ${punchOutLng.toFixed(5)}°E`;
      const punchOutTime = validTarget?.punchOut || endStop?.time || '--';

      const punchOutIcon = L.divIcon({
        className: 'bg-transparent border-0',
        html: `
          <div class="flex flex-col items-center cursor-pointer select-none" title="Punch-Out: ${punchOutLabel}">
            <div class="px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-black text-[10px] font-mono border border-rose-300 shadow-lg whitespace-nowrap mb-1">
              OUT${punchOutTime && punchOutTime !== '--' ? ` • ${punchOutTime}` : ''} • ${totalKm} km
            </div>
            <div class="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-rose-700 border-[2.5px] border-white shadow-xl flex items-center justify-center text-[11px] text-white font-black">
              🏁
            </div>
            <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-rose-700 -mt-0.5"></div>
          </div>
        `,
        iconSize: [160, 58],
        iconAnchor: [80, 56],
        popupAnchor: [0, -56],
      });

      L.marker([punchOutLat, punchOutLng], { icon: punchOutIcon, zIndexOffset: 900 })
        .bindPopup(`
          <div class="p-2.5 text-xs font-sans min-w-[240px]">
            <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-2">
              <span class="font-extrabold text-rose-800">🏁 Punch-Out Point</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800">${punchOutTime}</span>
            </div>
            <div class="space-y-1.5 text-[11px] text-slate-600">
              <div class="font-bold text-slate-900">${punchOutLabel}</div>
              <div>${punchOutAddress}</div>
              <div class="bg-blue-50 p-2 rounded-lg border border-blue-200 flex items-center justify-between">
                <span class="text-blue-900 font-semibold">Total Travelled:</span>
                <span class="font-mono font-black text-blue-700">${totalKm} KM</span>
              </div>
              <div class="pt-1 flex justify-end">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=${punchOutLat},${punchOutLng}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] inline-flex items-center gap-1"
                >
                  <span>Google Maps ↗</span>
                </a>
              </div>
            </div>
          </div>
        `)
        .addTo(markersGroup);

      if (!hasFittedRef.current || lastTargetIdRef.current !== currentTargetId || !wasConcludedRef.current) {
        hasFittedRef.current = true;
        lastTargetIdRef.current = currentTargetId;
        wasConcludedRef.current = true;
        const fitPoints = drawnPolylineCoords.length > 1
          ? drawnPolylineCoords
          : (hasPunchIn ? [[punchInLat, punchInLng], [punchOutLat, punchOutLng]] : [[punchOutLat, punchOutLng]]);
        if (fitPoints.length > 1) {
          try {
            const bounds = L.latLngBounds(fitPoints);
            map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16 });
          } catch {
            map.setView([punchOutLat, punchOutLng], 15);
          }
        } else {
          map.setView([punchOutLat, punchOutLng], 15);
        }
      }
    } else if (hasLiveCoords) {
      const isOnline = validTarget.status === 'Punched In' || validTarget.status === 'Tracking' || Boolean(validTarget.punchIn && !validTarget.punchOut);
      const isDriver = Boolean(validTarget.isDriver);
      const isDis = String(validTarget.employeeId || validTarget.id || '').toUpperCase().includes('DIS') ||
                    String(validTarget.role || '').toLowerCase().includes('dispatch');

      const gradientClass = isDriver
        ? 'from-cyan-500 to-blue-700'
        : isDis
          ? 'from-violet-500 to-purple-700'
          : isOnline
            ? 'from-blue-500 to-indigo-700'
            : 'from-slate-500 to-slate-700';

      const needleColor = isDriver
        ? 'border-t-blue-700'
        : isDis
          ? 'border-t-purple-700'
          : isOnline
            ? 'border-t-indigo-700'
            : 'border-t-slate-700';

      const selectedBeaconIcon = L.divIcon({
        className: 'bg-transparent border-0',
        html: `
          <div class="flex flex-col items-center cursor-pointer select-none group">
            <div class="px-2.5 py-1 rounded-full bg-slate-900/95 text-white font-bold text-[11px] border border-slate-600/80 shadow-xl flex items-center gap-1.5 whitespace-nowrap mb-1.5">
              <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
              <span>${validTarget.name}</span>
              <span class="px-1.5 py-0.2 rounded-full bg-blue-600 text-[9px] font-mono font-black">${validTarget.employeeId || validTarget.id}</span>
            </div>
            <div class="relative flex flex-col items-center">
              <span class="absolute -inset-1.5 rounded-full ${isOnline ? 'bg-blue-400/35 animate-ping' : 'bg-slate-400/30'} pointer-events-none"></span>
              <div class="w-10 h-10 rounded-full bg-gradient-to-br ${gradientClass} border-[3px] border-white shadow-2xl flex items-center justify-center text-white text-base z-10">
                ${isDriver ? '🚛' : isDis ? '📡' : '👤'}
              </div>
              <div class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[9px] border-l-transparent border-r-transparent ${needleColor} -mt-0.5 z-10 drop-shadow"></div>
            </div>
          </div>
        `,
        iconSize: [200, 82],
        iconAnchor: [100, 78],
        popupAnchor: [0, -76],
      });

      const marker = L.marker([displayLat, displayLng], { icon: selectedBeaconIcon, zIndexOffset: 1000 })
        .bindPopup(buildLivePopupHtml(displayLat, displayLng, isOnline))
        .addTo(markersGroup);

      liveMarkerRef.current = marker;
      liveMarkerTargetIdRef.current = currentTargetId;

      if (!userInteractedRef.current && (!hasFittedRef.current || lastTargetIdRef.current !== currentTargetId)) {
        hasFittedRef.current = true;
        lastTargetIdRef.current = currentTargetId;
        const fitPoints = drawnPolylineCoords.length > 1
          ? drawnPolylineCoords
          : (hasPunchIn ? [[punchInLat, punchInLng], [displayLat, displayLng]] : [[displayLat, displayLng]]);
        if (fitPoints.length > 1) {
          try {
            const bounds = L.latLngBounds(fitPoints);
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
          } catch {
            map.setView([displayLat, displayLng], 15);
          }
        } else {
          map.setView([displayLat, displayLng], 16);
        }
      }
    }

  }, [mapReady, isShiftConcluded, validTarget?.id, validTarget?.lat, validTarget?.lng, validTarget?.punchIn, validTarget?.punchOut, validTarget?.accuracy, validTarget?.geofenceStatus, stops, mapRouteMode, roadSnapEnabled, snappedRouteState, snappedLiveGps, totalKm]);

  const startOdometer = validTarget?.activeTrip?.startOdometer || 14250.0;
  const currentOdometer = Number((startOdometer + totalKm).toFixed(1));
  const legsCount = stops.length > 1 ? stops.length - 1 : 0;

  // Fit full route (including all waypoints, Punch-In & Punch-Out or Live GPS)
  const handleFitRoute = () => {
    userInteractedRef.current = false;
    if (!mapInstanceRef.current) return;
    const fitPts = [];
    if (drawnPolylineCoordsRef.current && drawnPolylineCoordsRef.current.length > 1) {
      fitPts.push(...drawnPolylineCoordsRef.current);
    } else {
      if (validTarget?.gpsLocation?.lat && validTarget?.gpsLocation?.lng) {
        fitPts.push([Number(validTarget.gpsLocation.lat), Number(validTarget.gpsLocation.lng)]);
      }
      stops.forEach((s) => {
        if (Number.isFinite(Number(s?.lat)) && Number.isFinite(Number(s?.lng))) {
          fitPts.push([Number(s.lat), Number(s.lng)]);
        }
      });
      if (validTarget?.exitGpsLocation?.lat && validTarget?.exitGpsLocation?.lng) {
        fitPts.push([Number(validTarget.exitGpsLocation.lat), Number(validTarget.exitGpsLocation.lng)]);
      } else if (validTarget?.lat != null && validTarget?.lng != null) {
        fitPts.push([Number(validTarget.lat), Number(validTarget.lng)]);
      }
    }
    if (fitPts.length > 1) {
      try {
        const bounds = L.latLngBounds(fitPts);
        mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
        return;
      } catch (e) {
        console.warn('fitBounds error', e);
      }
    }
    if (validTarget?.lat != null && validTarget?.lng != null) {
      mapInstanceRef.current.setView([Number(validTarget.lat), Number(validTarget.lng)], 15);
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div className="w-full space-y-2">
      {/* Clean, Simple Map Header Bar */}
      <div className="bg-slate-900 border border-slate-800 text-white px-3.5 py-2.5 rounded-2xl shadow-md flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Active Staff Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 border border-blue-400 flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-xs">
            {validTarget ? (validTarget.name || 'ST').substring(0, 2).toUpperCase() : 'HQ'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-extrabold text-sm tracking-tight truncate">
                {validTarget?.name || 'Staff Member'}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                • {validTarget?.role || 'Operations'}
              </span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-blue-950 text-sky-300 border border-blue-800/80">
                {validTarget?.employeeId || validTarget?.id}
              </span>
              <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                validTarget?.status === 'Punched In' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-400'
              }`}>
                {validTarget?.status || 'Active'}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-medium flex items-center gap-2 truncate mt-0.5">
              <span className="text-emerald-400 flex items-center gap-1 font-semibold truncate">
                <span>📍 {validTarget?.geofenceStatus || validTarget?.stationName || 'Location Verified'}</span>
              </span>
              {validTarget?.punchIn && (
                <span className="text-slate-400 text-[10px]">
                  • In: {validTarget.punchIn}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Clean Key Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setRoadSnapEnabled((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
              roadSnapEnabled 
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400/50 shadow-xs' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Toggle road-following route (OSRM real road geometry)"
          >
            <GitCommit className={`w-3.5 h-3.5 ${roadSnapEnabled ? 'text-cyan-200' : 'text-slate-400'}`} />
            <span>{roadSnapEnabled ? 'Road Route: ON' : 'GPS Path'}</span>
          </button>

          <button
            type="button"
            onClick={handleFitRoute}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/40 flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
            title="Fit complete route and view all coordinates"
          >
            <Crosshair className="w-3.5 h-3.5 text-white" />
            <span>Fit Route</span>
          </button>

          {activeRouteDetails?.googleMapsFullRouteUrl && (
            <a
              href={activeRouteDetails.googleMapsFullRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-all"
              title="Open Location in Google Maps"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Google Maps</span>
            </a>
          )}
        </div>
      </div>

      {/* Map Canvas Frame - Seamless Fullscreen & Inline */}
      <div
        ref={mapFrameRef}
        className={`w-full overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-0 z-[999999] w-screen h-screen rounded-none border-0 shadow-2xl bg-slate-900 m-0 p-0'
            : isFullWidth
            ? 'relative rounded-2xl border border-slate-300 shadow-md bg-slate-900 h-[580px]'
            : 'relative rounded-2xl border border-slate-300 shadow-md bg-slate-900 h-[440px] sm:h-[480px] xl:h-[500px]'
        }`}
        style={isFullscreen ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 999999 } : undefined}
      >
        {/* Leaflet Map DOM Canvas */}
        <div ref={mapContainerRef} className="w-full h-full z-0" style={{ minHeight: '100%', height: '100%', width: '100%' }} />

        {/* Fullscreen Floating Header Bar */}
        {isFullscreen && (
          <div className="absolute top-4 left-4 z-[400] flex items-center gap-3 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 px-4 py-2.5 rounded-2xl shadow-2xl text-white max-w-[calc(100vw-32px)]">
            <div className="w-8 h-8 rounded-xl bg-blue-600 border border-blue-400 flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-xs">
              {validTarget ? (validTarget.name || 'ST').substring(0, 2).toUpperCase() : 'HQ'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm tracking-tight truncate">
                  {validTarget?.name || 'Staff Member'}
                </span>
                <span className="text-xs text-slate-300 font-medium truncate">
                  • {validTarget?.role || 'Operations'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-900/80 text-sky-300 border border-blue-700/80">
                  {validTarget?.employeeId || validTarget?.id}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  validTarget?.status === 'Punched In' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-400'
                }`}>
                  {validTarget?.status || 'Active'}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 flex items-center gap-2 truncate mt-0.5 font-mono">
                <span className="text-emerald-400">📍 {validTarget?.geofenceStatus || validTarget?.stationName || 'Location Verified'}</span>
                {totalKm > 0 && <span className="text-cyan-300 font-bold">• {totalKm} KM Traveled</span>}
              </div>
            </div>
            <div className="h-6 w-px bg-slate-700 mx-1 shrink-0" />
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 shadow-md text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
              title="Exit Full Screen (Esc)"
            >
              <Minimize2 className="w-4 h-4 text-slate-200" />
              <span className="hidden sm:inline">Exit Full Screen</span>
            </button>
          </div>
        )}

        {/* Floating Utility Controls on Bottom-Right (Key icon removed as requested) */}
        <div className="absolute bottom-3 right-3 z-[400] flex flex-col items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-300 shadow-xl">
          <button
            type="button"
            onClick={onToggleSatellite}
            className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mapSatellite ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title={mapSatellite ? 'Switch to Street Map' : 'Switch to Satellite View'}
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleFitRoute}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            title="Fit Full Route"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          <div className="w-full h-px bg-slate-200 my-0.5" />

          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="w-full h-px bg-slate-200 my-0.5" />

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-2 rounded-lg cursor-pointer transition-colors ${
              isFullscreen ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Totally Full Screen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Floating Route Legend on Bottom-Left */}
        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md border border-slate-300 text-slate-800 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2.5 text-xs flex-wrap">
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-700 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span>Punch-In</span>
          </span>
          <span className="text-slate-300">•</span>
          {isShiftConcluded ? (
            <>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-rose-700 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-xs" />
                <span>Punch-Out</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-blue-900 font-black">
                <span className="w-3.5 h-1.5 bg-blue-600 rounded-full" />
                <span>Total Travelled: {totalKm} KM</span>
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-blue-800 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-xs animate-pulse" />
                <span>Live Location</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-blue-900 font-black">
                <span className="w-3.5 h-1.5 bg-blue-600 rounded-full" />
                <span>Travelled: {totalKm > 0 ? `${totalKm} KM` : 'Active'}</span>
              </span>
            </>
          )}
          {stops.length > 2 && (
            <>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-indigo-700 font-bold">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-600 bg-white shadow-xs" />
                <span>Waypoints ({stops.length - 2})</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Leaflet API Key & Clean Map Tile Provider Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Leaflet Map & API Key Settings</h3>
                  <p className="text-[11px] text-slate-400">Configure clean, watermark-free map tiles or provide custom API Key</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 text-xs text-slate-700">
              {/* Status Banner */}
              <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                tileProvider === 'carto' && !leafletApiKey
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}>
                <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${
                  tileProvider === 'carto' && !leafletApiKey ? 'text-amber-600' : 'text-emerald-600'
                }`} />
                <div className="text-[11px] leading-relaxed">
                  <strong className="block font-bold">
                    {tileProvider === 'carto' && !leafletApiKey
                      ? 'Watermark Warning: Carto requires an API Key.'
                      : 'Clean Map Active: Zero Watermarks'}
                  </strong>
                  <span>
                    {tileProvider === 'carto' && !leafletApiKey
                      ? 'Carto now prints "API KEY REQUIRED" without a key. Select OpenStreetMap or Esri below for 100% clean tiles with zero watermarks.'
                      : 'Serving clean, high-performance raster map tiles without any watermark across Sangli, Miraj, and Maharashtra.'}
                  </span>
                </div>
              </div>

              {/* Provider Selection */}
              <div>
                <label className="block font-bold text-slate-900 mb-2">Select Map Tile Provider:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTileProvider('google');
                      handleSaveApiKey(inputApiKey, 'google');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      tileProvider === 'google' && !mapSatellite
                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 text-blue-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>🗺️ Google Maps (Street)</span>
                      {tileProvider === 'google' && !mapSatellite && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Recommended • Highest detail Sangli/Miraj roads • Zero watermark</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTileProvider('satellite');
                      if (!mapSatellite) onToggleSatellite();
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      mapSatellite || tileProvider === 'satellite'
                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 text-blue-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>🛰️ Google Satellite Hybrid</span>
                      {(mapSatellite || tileProvider === 'satellite') && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Ultra-crisp aerial satellite with street overlays • Zero watermark</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTileProvider('esri_street');
                      handleSaveApiKey(inputApiKey, 'esri_street');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      tileProvider === 'esri_street'
                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 text-blue-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>🏢 Esri World Street</span>
                      {tileProvider === 'esri_street' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Corporate road network • Zero watermark</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTileProvider('carto');
                      handleSaveApiKey(inputApiKey, 'carto');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      tileProvider === 'carto'
                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 text-blue-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>🔑 CartoDB Voyager</span>
                      {tileProvider === 'carto' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Requires valid API Key entered below</p>
                  </button>
                </div>
              </div>

              {/* API Key Input Field */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <label className="block font-bold text-slate-900">
                  Custom Leaflet / Carto / Mapbox API Key:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputApiKey}
                    onChange={(e) => setInputApiKey(e.target.value)}
                    placeholder="Enter API Key (e.g. pk.eyJ1... or carto_api_key_...)"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  {inputApiKey && (
                    <button
                      type="button"
                      onClick={() => setInputApiKey('')}
                      className="px-2.5 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 text-xs font-semibold cursor-pointer"
                      title="Clear key"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  Note: Providing a key saves it to local configuration and passes it directly to the tile server. If empty, OpenStreetMap is used automatically.
                </p>
              </div>

              {keySavedToast && (
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-center text-xs flex items-center justify-center gap-1.5 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>Map tile configuration & API Key saved successfully!</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setInputApiKey('');
                  handleSaveApiKey('', 'google');
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs cursor-pointer"
              >
                Reset to Google Maps (Clean)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveApiKey(inputApiKey, inputApiKey.trim() ? 'carto' : tileProvider);
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
