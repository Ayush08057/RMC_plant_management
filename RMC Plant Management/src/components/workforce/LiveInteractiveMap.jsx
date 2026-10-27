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
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { isAdminPerson } from '../../data/mockUsers';

// Sangli Plant HQ anchor
const SANGLI_PLANT_HQ = { lat: 16.8450, lng: 74.6200, name: 'SM Concrete Plant HQ, Tanang' };

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

  // Validate active target (strictly non-admin)
  const validTarget = activeTarget && !isAdminPerson(activeTarget) ? activeTarget : null;
  const stops = activeRouteDetails?.stops || [];
  const startStop = stops.length > 0 ? stops[0] : null;
  const endStop = stops.length > 0 ? stops[stops.length - 1] : null;
  const totalKm = activeRouteDetails?.totalDistanceKm || (stops.length > 1 ? stops[stops.length - 1].distanceKm : 0);

  // Initialize Leaflet Map once on mount
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
    });

    // Street tiles: CartoDB Voyager (clean, fast, professional roads)
    const streetUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    const tileLayer = L.tileLayer(mapSatellite ? satelliteUrl : streetUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Layer groups for clean vector and marker updates
    const routeGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    routeLayerGroupRef.current = routeGroup;
    markersLayerGroupRef.current = markersGroup;
    mapInstanceRef.current = map;
    setMapReady(true);

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      routeLayerGroupRef.current = null;
      markersLayerGroupRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Update Tile Layer when satellite mode toggles
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const streetUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    tileLayerRef.current.setUrl(mapSatellite ? satelliteUrl : streetUrl);
  }, [mapSatellite]);

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
    if (!mapInstanceRef.current || !routeLayerGroupRef.current || !markersLayerGroupRef.current) return;

    const map = mapInstanceRef.current;
    const routeGroup = routeLayerGroupRef.current;
    const markersGroup = markersLayerGroupRef.current;

    routeGroup.clearLayers();
    markersGroup.clearLayers();

    if (stops.length > 0) {
      const latLngs = stops.map((s) => [Number(s.lat), Number(s.lng)]);

      // 1. Draw Polyline Route Path (Exact Travel Track)
      // Glow underlay
      L.polyline(latLngs, {
        color: '#0284c7',
        weight: 8,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeGroup);

      // Main route line
      const routePolyline = L.polyline(latLngs, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeGroup);

      // 2. Draw High-Visibility, Non-Overlapping Waypoint Markers with Clean KM Badges
      stops.forEach((stop, index) => {
        const isStart = index === 0;
        const isEnd = index === stops.length - 1;
        const isSelected = selectedStop?.stopNo === stop.stopNo;
        const prevStop = index > 0 ? stops[index - 1] : null;
        const legKm = prevStop ? Number((stop.distanceKm - prevStop.distanceKm).toFixed(1)) : 0;

        let pinBg = isStart ? 'bg-emerald-600' : isEnd ? 'bg-amber-500' : 'bg-blue-600';
        let pinText = isStart ? '1' : isEnd ? '📍' : String(stop.stopNo);
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
                  ${isStart ? '🟢 1. Punch-In Location' : isEnd ? `📍 ${stop.stopNo}. Current / Punch-Out` : `Stop #${stop.stopNo}: ${stop.title}`}
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

      // 3. Fit bounds ONLY on target switch, NOT in render loop
      if (lastTargetIdRef.current !== validTarget?.id) {
        lastTargetIdRef.current = validTarget?.id;
        try {
          map.fitBounds(routePolyline.getBounds(), { padding: [50, 50], maxZoom: 15 });
        } catch {
          map.setView(latLngs[0], 14);
        }
      }
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
  }, [validTarget?.id, stops, selectedStop?.stopNo]);

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
        <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/95 backdrop-blur-md border border-slate-700 text-white px-3 py-2 rounded-xl shadow-xl flex items-center gap-2.5 text-xs flex-wrap">
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-300 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" />
            <span>1. Punch-In (0.0 km)</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-amber-300 font-black">
            <span className="w-3.5 h-1 bg-amber-400 rounded-full" />
            <span>Total Run: {totalKm} KM ({legsCount} Legs)</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm" />
            <span>Current ({totalKm} KM)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
