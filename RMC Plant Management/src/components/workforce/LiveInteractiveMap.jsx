import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, 
  MapPin, 
  Truck, 
  Building2, 
  HardHat, 
  ExternalLink, 
  Layers, 
  Compass, 
  ZoomIn, 
  ZoomOut,
  Maximize2,
  Minimize2,
  Phone,
  Clock
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

// Sangli Plant HQ and Major Operational Anchors
const SANGLI_PLANT_HQ = { lat: 16.8450, lng: 74.6200 };
const SANGLI_MARKET_YARD = { lat: 16.8584, lng: 74.5824 };
const SANGLI_SITE_PROJECT = { lat: 16.8520, lng: 74.5900 };

export default function LiveInteractiveMap({
  telemetryList = [],
  activeTarget = null,
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
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center map around Sangli operational belt
    const initialLat = activeTarget?.lat || realDeviceGps?.lat || SANGLI_PLANT_HQ.lat;
    const initialLng = activeTarget?.lng || realDeviceGps?.lng || SANGLI_PLANT_HQ.lng;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // Tile Layer: OpenStreetMap or Esri Satellite
    const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    const tileLayer = L.tileLayer(mapSatellite ? satelliteUrl : streetUrl, {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Layer groups for markers & route lines
    const markersGroup = L.layerGroup().addTo(map);
    const routeGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    routeLayerRef.current = routeGroup;
    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when satellite mode toggles
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    tileLayerRef.current.setUrl(mapSatellite ? satelliteUrl : streetUrl);
  }, [mapSatellite]);

  // Update Markers & Routes whenever telemetry or activeTarget changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !routeLayerRef.current) return;

    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const routeGroup = routeLayerRef.current;

    markersGroup.clearLayers();
    routeGroup.clearLayers();

    // 1. Plot Plant HQ Permanent Anchor Marker
    const plantHqIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="flex flex-col items-center group cursor-pointer">
          <div class="px-2 py-0.5 rounded-md bg-amber-500 text-white font-extrabold text-[10px] shadow-md border border-white whitespace-nowrap mb-1">
            🏭 Main Plant HQ
          </div>
          <div class="w-8 h-8 rounded-full bg-amber-600 border-2 border-white flex items-center justify-center text-white shadow-lg animate-bounce">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <div class="w-2 h-2 rounded-full bg-amber-600 shadow-sm mt-0.5"></div>
        </div>
      `,
      iconSize: [120, 60],
      iconAnchor: [60, 58],
    });

    const plantMarker = L.marker([SANGLI_PLANT_HQ.lat, SANGLI_PLANT_HQ.lng], { icon: plantHqIcon })
      .bindPopup(`
        <div class="p-2 text-xs font-sans">
          <div class="font-bold text-amber-700 text-sm mb-1">SM Concrete Tech — Plant HQ</div>
          <div class="text-slate-600 mb-1">Tanang, Sangli-Miraj Road, Sangli</div>
          <div class="text-[11px] text-slate-500 font-mono">16.8450°N, 74.6200°E</div>
          <div class="mt-2 text-emerald-700 font-bold">● Batching Control & Weighbridge Active</div>
        </div>
      `)
      .addTo(markersGroup);

    // 2. Plot Sangli Market Yard APMC Marker
    const apmcIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="flex flex-col items-center group cursor-pointer">
          <div class="px-2 py-0.5 rounded-md bg-blue-600 text-white font-extrabold text-[10px] shadow-md border border-white whitespace-nowrap mb-1">
            📍 Sangli Market Yard
          </div>
          <div class="w-8 h-8 rounded-full bg-blue-700 border-2 border-white flex items-center justify-center text-white shadow-lg">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
        </div>
      `,
      iconSize: [140, 60],
      iconAnchor: [70, 58],
    });

    L.marker([SANGLI_MARKET_YARD.lat, SANGLI_MARKET_YARD.lng], { icon: apmcIcon })
      .bindPopup(`
        <div class="p-2 text-xs font-sans">
          <div class="font-bold text-blue-700 text-sm mb-1">Sangli Market Yard (APMC)</div>
          <div class="text-slate-600 mb-1">Accounts, Finance & Commercial Operations</div>
          <div class="text-[11px] text-slate-500 font-mono">16.8584°N, 74.5824°E</div>
        </div>
      `)
      .addTo(markersGroup);

    // 3. Draw Route Polyline if route mode is active
    if (mapRouteMode) {
      const routePoints = [
        [SANGLI_PLANT_HQ.lat, SANGLI_PLANT_HQ.lng],
        [16.8490, 74.6080],
        [SANGLI_SITE_PROJECT.lat, SANGLI_SITE_PROJECT.lng],
        [SANGLI_MARKET_YARD.lat, SANGLI_MARKET_YARD.lng]
      ];

      L.polyline(routePoints, {
        color: '#06b6d4',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
      }).addTo(routeGroup);
    }

    // 4. Plot Telemetry Staff & Vehicles
    telemetryList.forEach((staff) => {
      // Determine coordinates: real GPS fix or default stationed hub
      let lat = staff.lat;
      let lng = staff.lng;

      const isDriver = (staff.role || '').toLowerCase().includes('driver');
      const isAccountant = (staff.role || '').toLowerCase().includes('account');
      const isSupervisor = (staff.role || '').toLowerCase().includes('supervisor');

      if (!lat || !lng) {
        if (isAccountant) {
          lat = SANGLI_MARKET_YARD.lat;
          lng = SANGLI_MARKET_YARD.lng;
        } else if (isDriver) {
          lat = 16.8490;
          lng = 74.6080;
        } else if (isSupervisor) {
          lat = SANGLI_SITE_PROJECT.lat;
          lng = SANGLI_SITE_PROJECT.lng;
        } else {
          lat = SANGLI_PLANT_HQ.lat;
          lng = SANGLI_PLANT_HQ.lng;
        }
      }

      const isPunchedIn = staff.status === 'Punched In';
      const isSelected = activeTarget?.id === staff.id;

      let badgeColor = isDriver ? 'bg-cyan-600' : isAccountant ? 'bg-indigo-600' : 'bg-emerald-600';
      let iconColor = isDriver ? 'bg-cyan-700' : isAccountant ? 'bg-indigo-700' : 'bg-emerald-700';

      const staffMarkerIcon = L.divIcon({
        className: 'custom-staff-marker',
        html: `
          <div class="flex flex-col items-center group cursor-pointer transition-transform ${isSelected ? 'scale-110 z-50' : 'hover:scale-105'}">
            <div class="px-2 py-0.5 rounded-md ${badgeColor} text-white font-black text-[10px] shadow-lg border border-white whitespace-nowrap mb-0.5 flex items-center gap-1">
              ${isDriver ? '🚚 ' + (staff.activeTrip?.vehicleNo || 'MH-10-CR-1212') : staff.name}
            </div>
            <div class="w-8 h-8 rounded-full ${iconColor} border-2 ${isSelected ? 'border-amber-400 ring-4 ring-amber-400/40' : 'border-white'} flex items-center justify-center text-white font-bold text-xs shadow-xl">
              ${isDriver ? '🚛' : isAccountant ? '📊' : isSupervisor ? '👷' : '👤'}
            </div>
            <div class="w-2.5 h-2.5 rounded-full ${isPunchedIn ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'} mt-0.5"></div>
          </div>
        `,
        iconSize: [140, 60],
        iconAnchor: [70, 58],
      });

      const marker = L.marker([lat, lng], { icon: staffMarkerIcon })
        .on('click', () => {
          onSelectTarget(staff);
        })
        .bindPopup(`
          <div class="p-2.5 text-xs font-sans min-w-[200px]">
            <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-2">
              <span class="font-bold text-slate-900 text-sm">${staff.name}</span>
              <span class="px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                isPunchedIn ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
              }">${staff.status}</span>
            </div>
            <div class="space-y-1 text-slate-600">
              <div><strong class="text-slate-800">Role:</strong> ${staff.role}</div>
              <div><strong class="text-slate-800">Location:</strong> ${staff.geofenceStatus || 'Sangli Operational Area'}</div>
              <div><strong class="text-slate-800">Coordinates:</strong> <span class="font-mono text-emerald-700 font-bold">${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</span></div>
              ${isDriver && staff.activeTrip ? `
                <div class="mt-2 pt-2 border-t border-slate-100 text-[11px]">
                  <div><strong class="text-cyan-700">Vehicle:</strong> ${staff.activeTrip.vehicleNo}</div>
                  <div><strong class="text-cyan-700">Destination:</strong> ${staff.activeTrip.siteName}</div>
                  <div><strong class="text-cyan-700">Route:</strong> ${staff.activeTrip.routeLabel}</div>
                </div>
              ` : ''}
            </div>
            <div class="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
              <a 
                href="https://www.google.com/maps?q=${lat},${lng}" 
                target="_blank" 
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
              >
                <span>Google Maps</span>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
              </a>
            </div>
          </div>
        `)
        .addTo(markersGroup);

      // If this is the active selected target, open popup and pan to it
      if (isSelected && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 0.8 });
        marker.openPopup();
      }
    });

  }, [telemetryList, activeTarget, mapRouteMode, onSelectTarget]);

  // Center on active target when focus changes
  const handleCenterOnActive = () => {
    if (!mapInstanceRef.current) return;
    const lat = activeTarget?.lat || realDeviceGps?.lat || SANGLI_PLANT_HQ.lat;
    const lng = activeTarget?.lng || realDeviceGps?.lng || SANGLI_PLANT_HQ.lng;
    mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 0.8 });
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-950 transition-all duration-300 ${
      isFullWidth ? 'h-[620px]' : 'h-[480px] sm:h-[520px] xl:h-[550px]'
    }`}>
      {/* Leaflet Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Telemetry HUD */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-400 bg-white/95 backdrop-blur-md border border-slate-300 text-slate-900 p-2.5 px-3 rounded-xl shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-xs">
            {activeTarget ? (activeTarget.name || 'ST').substring(0, 2).toUpperCase() : 'HQ'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-900 font-bold truncate text-xs">
                {activeTarget?.name || 'SM Concrete Tech — Sangli Radar'}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold truncate hidden sm:inline">
                • {activeTarget?.role || 'Plant Hub'}
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                {activeTarget?.status || 'Active Roster'}
              </span>
            </div>
            <div className="text-[10px] text-slate-600 font-mono font-medium flex items-center gap-1.5 truncate">
              <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="truncate">{activeTarget?.geofenceStatus || 'Sangli Operational Grid'}</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">
                {(activeTarget?.lat || SANGLI_PLANT_HQ.lat).toFixed(4)}°N, {(activeTarget?.lng || SANGLI_PLANT_HQ.lng).toFixed(4)}°E
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls in HUD */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCenterOnActive}
            className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1 shadow-2xs cursor-pointer"
            title="Center Map"
          >
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Center</span>
          </button>

          <a
            href={`https://www.google.com/maps?q=${activeTarget?.lat || SANGLI_PLANT_HQ.lat},${activeTarget?.lng || SANGLI_PLANT_HQ.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-2xs cursor-pointer"
            title="Open in Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Floating Map Utility Bar (Satellite Toggle, Route Toggle, Zoom Controls, Fullscreen) */}
      <div className="absolute bottom-4 right-3 z-400 flex flex-col items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-300 shadow-xl">
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
          onClick={onToggleRouteMode}
          className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mapRouteMode ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Toggle Fleet Delivery Routes"
        >
          <Navigation className="w-4 h-4" />
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

      {/* Floating Status Indicator on Bottom-Left */}
      <div className="absolute bottom-4 left-3 z-400 bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-bold font-mono">Live GNSS Active</span>
        <span className="text-slate-400 text-[10px] hidden sm:inline">• High-Precision Sangli Cluster</span>
      </div>
    </div>
  );
}
