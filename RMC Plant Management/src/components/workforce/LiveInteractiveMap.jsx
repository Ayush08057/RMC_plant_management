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
  X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { isAdminPerson } from '../../data/mockUsers';

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

  // Draw Real Travel Route with High-Visibility, Clean Kilometer Pins
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !routeLayerGroupRef.current || !markersLayerGroupRef.current) return;

    const map = mapInstanceRef.current;
    const routeGroup = routeLayerGroupRef.current;
    const markersGroup = markersLayerGroupRef.current;

    routeGroup.clearLayers();
    markersGroup.clearLayers();

    if (stops.length > 0) {
      const latLngs = stops.map((s) => [Number(s.lat), Number(s.lng)]);
      let routePolyline = null;

      // 1. Draw Polyline Route Path only when at least 2 coordinate points exist
      if (stops.length > 1) {
        // Glow underlay
        L.polyline(latLngs, {
          color: '#0284c7',
          weight: 8,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeGroup);

        // Main route line
        routePolyline = L.polyline(latLngs, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeGroup);

        // 2. Draw Midpoint Distance Pill Badges on the Route Polyline
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
      }

      // 3. Draw High-Visibility, Non-Overlapping Waypoint Markers with Clean KM Badges
      stops.forEach((stop, index) => {
        const isStart = index === 0;
        const isEnd = index === stops.length - 1;
        const isSelected = selectedStop?.stopNo === stop.stopNo;
        const prevStop = index > 0 ? stops[index - 1] : null;
        const legKm = prevStop ? Number((stop.distanceKm - prevStop.distanceKm).toFixed(1)) : 0;

        let pinBg = isStart ? 'bg-emerald-600' : isEnd ? 'bg-amber-500' : 'bg-blue-600';
        let pinText = stops.length === 1 ? '📍' : isStart ? '1' : isEnd ? '📍' : String(stop.stopNo);
        let kmBadgeStyle = isStart
          ? 'bg-emerald-600 text-white border-2 border-white'
          : isEnd
            ? 'bg-amber-500 text-slate-950 font-black border-2 border-white'
            : 'bg-white text-blue-950 font-black border-2 border-blue-600';

        const icon = L.divIcon({
          className: 'bg-transparent border-0',
          html: `
            <div class="flex flex-col items-center cursor-pointer select-none transition-transform ${isSelected ? 'scale-125 z-50' : 'hover:scale-115'}" title="Stop #${stop.stopNo}: ${stop.title} (${stop.distanceKm} KM)">
              <!-- Pin Circle -->
              <div class="w-7 h-7 rounded-full ${pinBg} ${isSelected ? 'border-2 border-amber-300 ring-4 ring-amber-400/60 shadow-xl' : 'border-2 border-white shadow-md'} text-white font-black text-xs flex items-center justify-center">
                ${pinText}
              </div>
              
              <!-- High-Visibility Kilometer Tag -->
              <div class="mt-0.5 px-2 py-0.5 rounded-full ${kmBadgeStyle} text-[10px] font-mono shadow-lg whitespace-nowrap tracking-tight">
                ${stop.distanceKm} KM
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
            <div class="p-2 text-xs font-sans min-w-[240px]">
              <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-1 mb-1.5">
                <span class="font-bold text-slate-900 text-xs">
                  ${stops.length === 1 ? `📍 ${stop.title}` : isStart ? '🟢 1. Punch-In Location' : isEnd ? `📍 ${stop.stopNo}. Current / Punch-Out` : `Stop #${stop.stopNo}: ${stop.title}`}
                </span>
                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  isStart ? 'bg-emerald-100 text-emerald-800' : isEnd ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                }">${stop.status}</span>
              </div>
              <div class="space-y-1.5 text-slate-600 text-[11px]">
                <div class="bg-blue-50 p-2 rounded-lg border border-blue-200 flex items-center justify-between">
                  <span class="text-blue-900 font-medium">Distance from Start:</span>
                  <span class="font-mono text-base font-black text-blue-700">${stop.distanceKm} KM</span>
                </div>
                ${!isStart ? `
                  <div class="text-[10px] text-slate-500 font-mono flex items-center justify-between px-1">
                    <span>This Leg:</span>
                    <span class="font-bold text-slate-800">+${legKm} KM from previous stop</span>
                  </div>
                ` : ''}
                <div><strong class="text-slate-700">Time:</strong> ${stop.time} ${stop.stayMinutes ? `(Stay: ${stop.stayMinutes}m)` : ''}</div>
                <div><strong class="text-slate-700">Category:</strong> ${stop.category}</div>
                <div><strong class="text-slate-700">Address:</strong> ${stop.address}</div>
                ${stop.notes ? `<div class="italic text-slate-500 mt-1">"${stop.notes}"</div>` : ''}
              </div>
            </div>
          `)
          .addTo(markersGroup);

        if (isSelected) {
          marker.openPopup();
          map.panTo([Number(stop.lat), Number(stop.lng)], { animate: true, duration: 0.5 });
        }
      });

      // 4. Fit bounds smoothly on initial load or target switch
      if (!hasFittedRef.current || lastTargetIdRef.current !== validTarget?.id) {
        hasFittedRef.current = true;
        lastTargetIdRef.current = validTarget?.id;
        try {
          if (routePolyline && stops.length > 1) {
            map.fitBounds(routePolyline.getBounds(), { padding: [50, 50], maxZoom: 15 });
          } else {
            map.setView([Number(stops[0].lat), Number(stops[0].lng)], 15);
          }
        } catch {
          map.setView(latLngs[0], 14);
        }
      }

      const fitTimer = setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 100);

      return () => clearTimeout(fitTimer);
    } else if (validTarget?.lat && validTarget?.lng) {
      // Single Pinpoint for personnel
      const singleIcon = L.divIcon({
        className: 'bg-transparent border-0',
        html: `
          <div class="flex flex-col items-center cursor-pointer select-none">
            <div class="w-8 h-8 rounded-full bg-blue-700 border-2 border-white flex items-center justify-center text-white font-bold text-xs shadow-xl">
              ${validTarget.isDriver ? '🚛' : '👤'}
            </div>
            <div class="mt-0.5 px-2 py-0.5 rounded-full bg-white text-blue-950 font-black text-[10px] border-2 border-blue-600 shadow-md whitespace-nowrap">
              ${validTarget.name}
            </div>
          </div>
        `,
        iconSize: [120, 56],
        iconAnchor: [60, 54],
        popupAnchor: [0, -54],
      });

      L.marker([Number(validTarget.lat), Number(validTarget.lng)], { icon: singleIcon })
        .bindPopup(`
          <div class="p-2 text-xs font-sans min-w-[200px]">
            <div class="font-bold text-slate-900">${validTarget.name}</div>
            <div class="text-[11px] text-slate-500">${validTarget.role} • ${validTarget.geofenceStatus}</div>
            <div class="mt-1 font-mono text-[10px] text-emerald-700">${Number(validTarget.lat).toFixed(4)}°N, ${Number(validTarget.lng).toFixed(4)}°E</div>
          </div>
        `)
        .addTo(markersGroup);

      if (lastTargetIdRef.current !== validTarget.id) {
        lastTargetIdRef.current = validTarget.id;
        map.setView([Number(validTarget.lat), Number(validTarget.lng)], 15);
      }
    }
  }, [mapReady, validTarget?.id, stops, selectedStop?.stopNo, mapRouteMode]);

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
      {/* Top Telemetry Header Bar - High Visibility Kilometer & Odometer HUD */}
      <div className="bg-slate-900 border border-slate-800 text-white p-2.5 sm:p-3 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-blue-600 border-2 border-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-sm">
            {validTarget ? (validTarget.name || 'ST').substring(0, 2).toUpperCase() : 'HQ'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-bold truncate text-sm">
                {validTarget?.name || 'SM Concrete Fleet'}
              </span>
              <span className="text-xs text-slate-300 font-semibold truncate">
                • {validTarget?.role || 'Staff'}
              </span>
              {validTarget?.isDriver && validTarget?.activeTrip?.vehicleNo && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-700 shrink-0">
                  🚛 {validTarget.activeTrip.vehicleNo}
                </span>
              )}
            </div>

            {/* Traveled Route summary from Punch-In to Punch-Out */}
            <div className="text-[11px] text-slate-300 font-medium flex items-center gap-2 truncate mt-0.5 flex-wrap">
              {startStop && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span>🟢 In: {startStop.time}</span>
                  <span className="text-slate-400 font-normal">({startStop.title.substring(0, 16)})</span>
                </span>
              )}
              {endStop && (
                <>
                  <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <span>📍 End: {endStop.time}</span>
                    <span className="text-slate-400 font-normal">({endStop.title.substring(0, 16)})</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* High-Visibility Kilometer & Odometer Metrics */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="bg-blue-600 text-white px-3 py-1.5 rounded-xl border border-blue-400/60 shadow-sm flex items-center gap-2">
            <Route className="w-4 h-4 text-amber-300 shrink-0" />
            <div className="text-left">
              <div className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">Total Run Today</div>
              <div className="text-base sm:text-lg font-black font-mono text-white leading-tight">
                {totalKm} KM
              </div>
            </div>
          </div>

          <div className="bg-slate-800 text-slate-100 px-3 py-1.5 rounded-xl border border-slate-700 shadow-sm flex items-center gap-2">
            <div className="text-left">
              <div className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Odometer Reading</div>
              <div className="text-xs font-mono font-bold text-white leading-tight">
                {startOdometer.toLocaleString()} ➔ <span className="text-amber-300 font-black">{currentOdometer.toLocaleString()} KM</span>
              </div>
            </div>
          </div>

          {/* Action Controls in Header */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setInputApiKey(leafletApiKey);
                setShowKeyModal(true);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
              title="Configure Leaflet API Key & Clean Tile Layers"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">
                {tileProvider === 'carto' && leafletApiKey ? 'API Key Active' : 'Map Layers & Key'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleFitRoute}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1 shadow-2xs cursor-pointer transition-all"
              title="Fit Entire Travelled Route on Screen"
            >
              <Crosshair className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Fit Route</span>
            </button>

            {activeRouteDetails?.googleMapsFullRouteUrl && (
              <a
                href={activeRouteDetails.googleMapsFullRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-2xs cursor-pointer flex items-center gap-1 text-xs font-semibold transition-all"
                title="Open Full Visited Route in Google Maps"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Google Maps</span>
              </a>
            )}
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
            <span>Total Run: {totalKm} KM ({legsCount} Legs)</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-amber-700 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
            <span>Current ({totalKm} KM)</span>
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
