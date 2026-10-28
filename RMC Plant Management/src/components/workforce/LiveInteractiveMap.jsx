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
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const routeLayerGroupRef = useRef(null);
  const markersLayerGroupRef = useRef(null);
  const lastTargetIdRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

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
  const [roadSnapEnabled, setRoadSnapEnabled] = useState(true);
  const [snappedRouteState, setSnappedRouteState] = useState(null);
  const [snappedLiveGps, setSnappedLiveGps] = useState(null);
  const hasFittedRef = useRef(false);

  // Validate active target (strictly non-admin)
  const validTarget = activeTarget && !isAdminPerson(activeTarget) ? activeTarget : null;
  const stops = activeRouteDetails?.stops || [];
  const startStop = stops.length > 0 ? stops[0] : null;
  const endStop = stops.length > 0 ? stops[stops.length - 1] : null;
  const totalKm = activeRouteDetails?.totalDistanceKm || (stops.length > 1 ? stops[stops.length - 1].distanceKm : 0);

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

  // Invalidate map size on full width toggle
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timer = setTimeout(() => {
      mapInstanceRef.current.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [isFullWidth]);

  // Asynchronously resolve road-snapped geometry for stops and live beacon
  useEffect(() => {
    let isCancelled = false;

    if (roadSnapEnabled && stops.length > 1) {
      fetchRoadSnappedRoute(stops)
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

    if (roadSnapEnabled && validTarget?.lat && validTarget?.lng) {
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
  }, [roadSnapEnabled, stops, validTarget?.id, validTarget?.lat, validTarget?.lng]);

  // Draw Real Travel Route and Dedicated Live Employee GPS Markers
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !routeLayerGroupRef.current || !markersLayerGroupRef.current) return;

    const map = mapInstanceRef.current;
    const routeGroup = routeLayerGroupRef.current;
    const markersGroup = markersLayerGroupRef.current;

    routeGroup.clearLayers();
    markersGroup.clearLayers();

    const targetLat = validTarget?.lat ? Number(validTarget.lat) : null;
    const targetLng = validTarget?.lng ? Number(validTarget.lng) : null;

    // 1. Draw Route Trail (only when selected target has multiple visited stops and route mode is on)
    if (mapRouteMode && stops.length > 1) {
      const rawLatLngs = stops.map((s) => [Number(s.lat), Number(s.lng)]);
      // Use road-snapped high-fidelity coordinates if available and enabled, otherwise fallback to straight-line waypoints
      const isRoadSnapped = Boolean(roadSnapEnabled && snappedRouteState && snappedRouteState.snapped && snappedRouteState.coords.length > 1);
      const activePolylineCoords = isRoadSnapped ? snappedRouteState.coords : rawLatLngs;

      // Glow underlay along true road geometry
      L.polyline(activePolylineCoords, {
        color: isRoadSnapped ? '#0284c7' : '#0284c7',
        weight: isRoadSnapped ? 9 : 8,
        opacity: isRoadSnapped ? 0.45 : 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeGroup);

      // Main route line along real street network
      L.polyline(activePolylineCoords, {
        color: isRoadSnapped ? '#1d4ed8' : '#2563eb',
        weight: isRoadSnapped ? 5.5 : 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeGroup);

      // If road snap is active, render subtle dashed guide to raw waypoints for full transparency
      if (isRoadSnapped && rawLatLngs.length > 1) {
        L.polyline(rawLatLngs, {
          color: '#38bdf8',
          weight: 1.5,
          opacity: 0.4,
          dashArray: '4, 8',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeGroup);
      }

      // Draw Midpoint Distance Pill Badges on Route Legs
      for (let i = 0; i < stops.length - 1; i++) {
        const s1 = stops[i];
        const s2 = stops[i + 1];
        const legKm = Number((s2.distanceKm - s1.distanceKm).toFixed(1));
        const midLat = (Number(s1.lat) + Number(s2.lat)) / 2;
        const midLng = (Number(s1.lng) + Number(s2.lng)) / 2;

        const distancePillIcon = L.divIcon({
          className: 'bg-transparent border-0',
          html: `
            <div class="flex items-center justify-center cursor-pointer select-none group" title="Leg ${i + 1}: ${s1.title} ➔ ${s2.title} (+${legKm} km)">
              <div class="px-2.5 py-0.5 rounded-full bg-white hover:bg-blue-50 text-blue-900 hover:text-blue-700 font-black text-[10px] font-mono border-2 border-blue-600 shadow-md flex items-center gap-1 transition-all transform hover:scale-110 whitespace-nowrap">
                <span class="text-[10px]">🛣️</span>
                <span class="font-extrabold text-blue-900">+${legKm} km</span>
              </div>
            </div>
          `,
          iconSize: [92, 26],
          iconAnchor: [46, 13],
        });

        L.marker([midLat, midLng], { icon: distancePillIcon })
          .on('click', () => {
            onSelectStop(s2);
          })
          .addTo(routeGroup);
      }

      // Draw Intermediate Waypoint Markers (Stops before the current/final location)
      stops.slice(0, -1).forEach((stop, index) => {
        const isStart = index === 0;
        const isSelected = selectedStop?.stopNo === stop.stopNo;
        const prevStop = index > 0 ? stops[index - 1] : null;
        const legKm = prevStop ? Number((stop.distanceKm - prevStop.distanceKm).toFixed(1)) : 0;

        const icon = L.divIcon({
          className: 'bg-transparent border-0',
          html: `
            <div class="flex flex-col items-center cursor-pointer select-none transition-transform ${isSelected ? 'scale-125 z-40' : 'hover:scale-115'}" title="Stop #${stop.stopNo}: ${stop.title} (${stop.distanceKm} KM)">
              <div class="w-7 h-7 rounded-full ${isStart ? 'bg-emerald-600' : 'bg-amber-500'} ${isSelected ? 'border-2 border-blue-600 ring-4 ring-blue-400/60 shadow-xl' : 'border-2 border-white shadow-md'} text-white font-black text-xs flex items-center justify-center">
                ${isStart ? '1' : String(stop.stopNo)}
              </div>
              <div class="mt-0.5 px-2 py-0.5 rounded-full ${isStart ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950 font-black border border-white'} text-[10px] font-mono shadow-md whitespace-nowrap tracking-tight">
                ${isStart ? 'Punch-In' : `+${legKm} KM`}
              </div>
            </div>
          `,
          iconSize: [70, 52],
          iconAnchor: [35, 48],
          popupAnchor: [0, -48],
        });

        const marker = L.marker([Number(stop.lat), Number(stop.lng)], { icon })
          .on('click', () => {
            onSelectStop(stop);
          })
          .bindPopup(`
            <div class="p-2.5 text-xs font-sans min-w-[250px]">
              <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-2">
                <span class="font-extrabold text-slate-900 text-xs">
                  ${isStart ? '🟢 1. Punch-In Location' : `📍 Stop #${stop.stopNo}: ${stop.title}`}
                </span>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${isStart ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'}">${stop.status || 'Visited'}</span>
              </div>
              <div class="space-y-1.5 text-slate-600 text-[11px]">
                <div class="bg-blue-50 p-2 rounded-lg border border-blue-200 flex items-center justify-between">
                  <span class="text-blue-900 font-medium">Distance from Start:</span>
                  <span class="font-mono text-base font-black text-blue-700">${stop.distanceKm} KM</span>
                </div>
                ${!isStart ? `
                  <div class="text-[10px] text-slate-500 font-mono flex items-center justify-between px-1">
                    <span>This Leg:</span>
                    <span class="font-bold text-slate-800">+${legKm} KM from previous</span>
                  </div>
                ` : ''}
                <div><strong class="text-slate-800">Time:</strong> ${stop.time} ${stop.stayMinutes ? `(${stop.stayMinutes}m stay/halt)` : ''}</div>
                <div><strong class="text-slate-800">Category:</strong> ${stop.category || 'Site Visit'}</div>
                <div><strong class="text-slate-800">Address:</strong> ${stop.address}</div>
                ${stop.notes ? `<div class="italic text-slate-600 mt-1 bg-slate-50 p-1.5 rounded border border-slate-200">"${stop.notes}"</div>` : ''}
              </div>
            </div>
          `)
          .addTo(markersGroup);

        if (isSelected) {
          marker.openPopup();
          map.panTo([Number(stop.lat), Number(stop.lng)], { animate: true, duration: 0.5 });
        }
      });
    }

    // 2. Draw Prominent, Dedicated LIVE BEACON MARKER for the SELECTED EMPLOYEE
    if (validTarget && targetLat !== null && targetLng !== null && !isNaN(targetLat) && !isNaN(targetLng)) {
      const isOnline = validTarget.status === 'Punched In';
      const isDriver = Boolean(validTarget.isDriver);
      const isDis = String(validTarget.employeeId || validTarget.id || '').toUpperCase().includes('DIS') ||
                    String(validTarget.role || '').toLowerCase().includes('dispatch');

      // Use road-snapped live coordinate if snap is enabled and available
      const isLiveSnapped = Boolean(roadSnapEnabled && snappedLiveGps && snappedLiveGps.snapped);
      const displayLat = isLiveSnapped ? Number(snappedLiveGps.lat) : targetLat;
      const displayLng = isLiveSnapped ? Number(snappedLiveGps.lng) : targetLng;

      // If snapped to road with a small offset, draw anchor link between raw GPS pin and snapped road point
      if (isLiveSnapped && snappedLiveGps.offsetMeters > 3) {
        L.polyline([[targetLat, targetLng], [displayLat, displayLng]], {
          color: '#06b6d4',
          weight: 2,
          dashArray: '3, 4',
          opacity: 0.85
        }).addTo(routeGroup);

        L.circleMarker([targetLat, targetLng], {
          radius: 4,
          color: '#0891b2',
          fillColor: '#67e8f9',
          fillOpacity: 0.9,
          weight: 1.5
        }).bindTooltip('Raw GNSS Device Fix (pre-snap)', { direction: 'top' }).addTo(routeGroup);
      }

      const selectedBeaconIcon = L.divIcon({
        className: 'bg-transparent border-0',
        html: `
          <div class="flex flex-col items-center cursor-pointer select-none group z-50">
            <!-- Pulsing Radar Beacon Halo -->
            <div class="relative flex items-center justify-center">
              <span class="absolute w-14 h-14 rounded-full ${isOnline ? 'bg-emerald-400/40 animate-ping' : 'bg-blue-400/40 animate-ping'}"></span>
              <span class="absolute w-10 h-10 rounded-full ${isOnline ? 'bg-emerald-500/25 ring-4 ring-emerald-400/50' : 'bg-blue-500/25 ring-4 ring-blue-400/50'}"></span>
              <div class="w-10 h-10 rounded-full ${isDriver ? 'bg-cyan-600' : isDis ? 'bg-purple-600' : isOnline ? 'bg-emerald-600' : 'bg-blue-700'} border-3 border-white shadow-2xl flex items-center justify-center text-white font-black text-sm z-10">
                ${isDriver ? '🚛' : isDis ? '📡' : '👤'}
              </div>
              <span class="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${isOnline ? 'bg-emerald-400 border-2 border-white ring-2 ring-emerald-500 animate-pulse' : 'bg-slate-400 border-2 border-white'} z-20"></span>
            </div>

            <!-- Prominent Floating Name Banner -->
            <div class="mt-1 px-3 py-1 rounded-xl bg-slate-900 text-white font-black text-xs border-2 border-white shadow-2xl flex items-center gap-1.5 whitespace-nowrap">
              <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
              <span>${validTarget.name}</span>
              <span class="px-1.5 py-0.2 rounded-md bg-blue-600 text-[10px] font-mono">${validTarget.employeeId || validTarget.id}</span>
              ${isLiveSnapped ? '<span class="px-1 py-0.2 rounded bg-cyan-700 text-[9px] font-mono text-cyan-100 font-bold" title="Snapped to drivable road corridor">🛣️ Road Snap</span>' : ''}
            </div>

            <!-- Geofence & Location Landmark Sub-badge -->
            <div class="mt-0.5 px-2 py-0.5 rounded-full bg-white text-blue-950 font-black text-[10px] border-2 border-blue-600 shadow-lg whitespace-nowrap">
              📍 ${validTarget.geofenceStatus || validTarget.stationName || 'Live Station'}
            </div>
          </div>
        `,
        iconSize: [190, 92],
        iconAnchor: [95, 52],
        popupAnchor: [0, -52],
      });

      const selectedMarker = L.marker([displayLat, displayLng], { icon: selectedBeaconIcon, zIndexOffset: 1000 })
        .bindPopup(`
          <div class="p-3 text-xs font-sans min-w-[260px]">
            <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 mb-2">
              <div>
                <div class="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <span>${validTarget.name}</span>
                  <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800">${validTarget.employeeId || validTarget.id}</span>
                </div>
                <div class="text-[11px] text-slate-500 font-semibold mt-0.5">${validTarget.role} • ${validTarget.department || 'Operations'}</div>
              </div>
              <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                isOnline ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-700 border border-slate-300'
              }">${validTarget.status}</span>
            </div>

            <div class="space-y-2 text-[11px] text-slate-600">
              <div class="bg-blue-50/90 border border-blue-200 p-2.5 rounded-xl">
                <div class="text-[9px] font-black text-blue-900 uppercase tracking-wider">Current Live Station</div>
                <div class="font-extrabold text-slate-900 text-xs mt-0.5">${validTarget.geofenceStatus || validTarget.stationName || 'Operational Zone'}</div>
                <div class="text-[10px] text-slate-500 mt-0.5">${validTarget.stationAddress || ''}</div>
              </div>

              <div class="flex items-center justify-between font-mono text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span class="text-slate-500 font-semibold">Live GPS Coordinates:</span>
                <span class="font-black text-blue-700">${displayLat.toFixed(4)}°N, ${displayLng.toFixed(4)}°E</span>
              </div>

              ${isLiveSnapped ? `
                <div class="flex items-center justify-between text-[10px] font-mono bg-cyan-50 p-1.5 rounded-lg border border-cyan-200 text-cyan-900">
                  <span class="flex items-center gap-1 font-bold"><span>🛣️</span> Road Snap Status:</span>
                  <span class="font-black text-cyan-800">Aligned to Road (offset: ${snappedLiveGps.offsetMeters}m)</span>
                </div>
              ` : ''}

              ${validTarget.punchIn ? `
                <div class="flex items-center justify-between text-[11px] px-1">
                  <span class="text-slate-600">Clocked In At:</span>
                  <span class="font-extrabold text-emerald-700 font-mono">${validTarget.punchIn}</span>
                </div>
              ` : ''}

              ${validTarget.workingHours ? `
                <div class="flex items-center justify-between text-[11px] px-1">
                  <span class="text-slate-600">Active Working Duration:</span>
                  <span class="font-extrabold text-slate-900 font-mono">${validTarget.elapsedDisplay || `${validTarget.workingHours} hrs`}</span>
                </div>
              ` : ''}
            </div>

            <div class="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between">
              <span class="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Active GNSS Fix</span>
              </span>
              <a
                href="https://www.google.com/maps/search/?api=1&query=${displayLat},${displayLng}"
                target="_blank"
                rel="noopener noreferrer"
                class="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] shadow-2xs transition-all inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Google Maps ↗</span>
              </a>
            </div>
          </div>
        `)
        .addTo(markersGroup);

      // Smoothly pan or fly to target whenever target changes OR its coordinates update
      const targetCoordKey = `${validTarget.id}_${displayLat.toFixed(5)}_${displayLng.toFixed(5)}`;
      if (!hasFittedRef.current) {
        hasFittedRef.current = true;
        lastTargetIdRef.current = targetCoordKey;
        map.setView([displayLat, displayLng], 15);
        selectedMarker.openPopup();
      } else if (lastTargetIdRef.current !== targetCoordKey) {
        lastTargetIdRef.current = targetCoordKey;
        map.flyTo([displayLat, displayLng], 15, { animate: true, duration: 0.8 });
        selectedMarker.openPopup();
      }
    }

  }, [mapReady, validTarget?.id, validTarget?.lat, validTarget?.lng, stops, selectedStop?.stopNo, mapRouteMode, roadSnapEnabled, snappedRouteState, snappedLiveGps]);

  const startOdometer = validTarget?.activeTrip?.startOdometer || 14250.0;
  const currentOdometer = Number((startOdometer + totalKm).toFixed(1));
  const legsCount = stops.length > 1 ? stops.length - 1 : 0;

  // Fit view to full route bounds
  const handleFitRoute = () => {
    if (!mapInstanceRef.current || stops.length === 0) return;
    try {
      const bounds = L.latLngBounds(stops.map((s) => [Number(s.lat), Number(s.lng)]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } catch {
      mapInstanceRef.current.setView([Number(stops[0].lat), Number(stops[0].lng)], 14);
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
      {/* Individual Staff Tracking Selector Bar */}
      {telemetryList && telemetryList.length > 0 && (
        <div className="bg-white border border-slate-200/90 p-2 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider shrink-0 flex items-center gap-1.5 px-1">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Dedicated Map:</span>
            </span>
            {telemetryList.filter(t => !isAdminPerson(t)).map((emp) => {
              const isSelected = validTarget?.id === emp.id;
              const isOnline = emp.status === 'Punched In';
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => onSelectTarget && onSelectTarget(emp)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer shrink-0 shadow-2xs ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400'
                      : isOnline
                        ? 'bg-white hover:bg-emerald-50 text-slate-800 border border-emerald-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                  title={`Switch to isolated map for ${emp.name} (${emp.role})`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                  }`} />
                  <span>{emp.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {emp.employeeId || emp.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Telemetry Header Bar - High Visibility Command Center HUD */}
      <div className="bg-slate-900 border border-slate-800 text-white p-3 sm:p-4 rounded-2xl shadow-xl flex flex-col gap-3">

        {/* Row 1: Profile & Target Info + Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 border-2 border-emerald-400 flex items-center justify-center font-black text-sm shrink-0 text-white shadow-md shadow-blue-900/40">
              {validTarget ? (validTarget.name || 'ST').substring(0, 2).toUpperCase() : 'HQ'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {validTarget?.name && validTarget?.role && validTarget.name.toLowerCase() !== validTarget.role.toLowerCase() ? (
                  <>
                    <span className="text-white font-black text-sm sm:text-base tracking-tight">
                      {validTarget.name}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">
                      • {validTarget.role}
                    </span>
                  </>
                ) : (
                  <span className="text-white font-black text-sm sm:text-base tracking-tight">
                    {validTarget?.name || validTarget?.role || 'Operational Staff'}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-950 text-sky-300 border border-blue-800/80 shrink-0">
                  {validTarget?.employeeId || validTarget?.id}
                </span>
                {validTarget?.isDriver && validTarget?.activeTrip?.vehicleNo && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-700 shrink-0">
                    🚛 {validTarget.activeTrip.vehicleNo}
                  </span>
                )}
              </div>

              {/* Live Station & GPS Location Telemetry Header */}
              <div className="text-[11px] text-slate-300 font-medium flex items-center gap-2 truncate mt-0.5 flex-wrap">
                {validTarget && (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span>📍 Live: {validTarget.geofenceStatus || validTarget.stationName}</span>
                    <span className="text-cyan-300 font-mono text-[10px]">
                      ({Number(validTarget.lat).toFixed(4)}°N, {Number(validTarget.lng).toFixed(4)}°E)
                    </span>
                  </span>
                )}
                {validTarget?.punchIn && (
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <span>• Clocked In: {validTarget.punchIn}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons - Spacious, cleanly styled & never clipped */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            {/* Road Snap Toggle Switch */}
            <button
              type="button"
              onClick={() => setRoadSnapEnabled((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                roadSnapEnabled 
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400/50 shadow-cyan-900/30' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={roadSnapEnabled ? 'Road Snap is active: GPS aligned to real road network' : 'Click to enable real road snapping'}
            >
              <GitCommit className={`w-3.5 h-3.5 ${roadSnapEnabled ? 'text-cyan-200 animate-pulse' : 'text-slate-400'}`} />
              <span>{roadSnapEnabled ? '🛣️ Road Snap: ON' : 'Road Snap: OFF'}</span>
            </button>

            <button
              type="button"
              onClick={handleFitRoute}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/40 flex items-center gap-1.5 shadow-md shadow-blue-900/30 cursor-pointer active:scale-95 transition-all"
              title="Fit Entire Traveled Route on Screen"
            >
              <Crosshair className="w-3.5 h-3.5 text-white" />
              <span>Fit Route</span>
            </button>

            {activeRouteDetails?.googleMapsFullRouteUrl && (
              <a
                href={activeRouteDetails.googleMapsFullRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 shadow-sm cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-all"
                title="Open Full Visited Route in Google Maps"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Maps</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                setInputApiKey(leafletApiKey);
                setShowKeyModal(true);
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
              title="Configure Map Tiles & Satellite Layers"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Layers</span>
            </button>
          </div>
        </div>

        {/* Row 2: Metrics Strip - Context-Aware (Odometer ONLY for Drivers!) */}
        <div className="pt-2.5 border-t border-slate-800/80 flex items-center gap-2 flex-wrap text-xs">
          {/* Total Run Today */}
          <div className="bg-gradient-to-r from-blue-900/70 to-blue-950/70 text-white px-3 py-1.5 rounded-xl border border-blue-700/50 shadow-xs flex items-center gap-2">
            <Route className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-left">
              <div className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">Total Run Today</div>
              <div className="text-sm sm:text-base font-black font-mono text-white leading-tight">
                {totalKm} KM
              </div>
            </div>
          </div>

          {/* Odometer Reading: EXCLUSIVELY FOR DRIVERS */}
          {validTarget?.isDriver ? (
            <div className="bg-slate-800/90 text-slate-100 px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-xs flex items-center gap-2">
              <Truck className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="text-left">
                <div className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Vehicle Odometer</div>
                <div className="text-xs font-mono font-bold text-white leading-tight">
                  {startOdometer.toLocaleString()} ➔ <span className="text-amber-300 font-black">{currentOdometer.toLocaleString()} KM</span>
                </div>
              </div>
            </div>
          ) : (
            /* Field Locations Visited for Non-Drivers (Site Supervisor, Dispatcher, Manager, QC, etc.) */
            <div className="bg-slate-800/90 text-slate-100 px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-xs flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left">
                <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Field Locations</div>
                <div className="text-xs font-mono font-bold text-white leading-tight">
                  {stops.length > 1 ? `${stops.length} Stops Logged` : 'Active Field Base'}
                </div>
              </div>
            </div>
          )}

          {/* Duty Status Badge */}
          <div className="bg-slate-800/60 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-xs flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Shift Status: <strong className="text-white">{validTarget?.status || 'Active On Duty'}</strong></span>
          </div>

          {/* GNSS Accuracy */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-400 ml-auto">
            <span>GNSS Precision: ±{validTarget?.accuracy || 15}m</span>
          </div>
        </div>
      </div>

      {/* Simple, Proper Leg-by-Leg Kilometer Journey Strip */}
      {stops.length > 1 && (
        <div className="bg-white border border-slate-200 p-2 rounded-xl shadow-xs flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400 shrink-0 pl-1">
            Route Legs:
          </div>
          {stops.map((stop, idx) => {
            const isStart = idx === 0;
            const isEnd = idx === stops.length - 1;
            const isSelected = selectedStop?.stopNo === stop.stopNo;
            const nextStop = idx < stops.length - 1 ? stops[idx + 1] : null;
            const nextLegKm = nextStop ? Number((nextStop.distanceKm - stop.distanceKm).toFixed(1)) : 0;

            return (
              <React.Fragment key={stop.stopNo}>
                <button
                  type="button"
                  onClick={() => onSelectStop(stop)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isSelected 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                      : isStart
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : isEnd
                          ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={`Stop #${stop.stopNo}: ${stop.title}`}
                >
                  <span className="truncate max-w-[130px]">
                    {isStart ? '🟢 1. Punch-In' : isEnd ? `📍 ${stop.stopNo}. Current` : `${stop.stopNo}. ${stop.title}`}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-black font-mono ${
                    isSelected ? 'bg-white text-blue-900' : 'bg-slate-200 text-slate-800'
                  }`}>
                    {stop.distanceKm} KM
                  </span>
                </button>

                {!isEnd && (
                  <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-blue-600 shrink-0 px-0.5">
                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                      +{nextLegKm} km
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Map Canvas Frame */}
      <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-300 shadow-md bg-slate-900 transition-all duration-300 ${
        isFullWidth ? 'h-[580px]' : 'h-[440px] sm:h-[480px] xl:h-[500px]'
      }`}>
        {/* Leaflet Map DOM Canvas */}
        <div ref={mapContainerRef} className="w-full h-full z-0" style={{ minHeight: '100%' }} />

        {/* Floating Utility Controls on Bottom-Right */}
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
            onClick={() => {
              setInputApiKey(leafletApiKey);
              setShowKeyModal(true);
            }}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors relative"
            title="Configure Leaflet API Key & Clean Tile Layers"
          >
            <Key className="w-4 h-4 text-amber-600" />
            {leafletApiKey && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
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
            onClick={onToggleFullWidth}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            title={isFullWidth ? 'Standard View' : 'Full Width View'}
          >
            {isFullWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Floating Route Legend on Bottom-Left with Leg & Kilometer Details */}
        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md border border-slate-300 text-slate-800 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2.5 text-xs flex-wrap">
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-700 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span>1. Punch-In (0.0 km)</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-blue-900 font-black">
            <span className="w-3.5 h-1.5 bg-blue-600 rounded-full" />
            <span>{totalKm > 0 ? `Total Run: ${totalKm} KM (${legsCount} Legs)` : 'Total Run: 0 KM (Stationary)'}</span>
          </span>
          {roadSnapEnabled && (
            <>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-cyan-800 font-bold bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                <span>🛣️ Road-Snapped</span>
              </span>
            </>
          )}
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-amber-700 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
            <span>Current: {totalKm > 0 ? `${totalKm} KM` : 'At Base'}</span>
          </span>
        </div>
      </div>

      {/* Leaflet API Key & Clean Map Tile Provider Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
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
