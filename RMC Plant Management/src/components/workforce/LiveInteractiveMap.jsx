import React, { useState, useMemo } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { isAdminPerson } from '../../data/mockUsers';

// Sangli Plant HQ and Major Operational Anchors
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
  const [internalZoom, setInternalZoom] = useState(15);

  // Validate active target (skip system admin to avoid fake GPS coords)
  const validTarget = useMemo(() => {
    if (activeTarget && !isAdminPerson(activeTarget)) return activeTarget;
    const nonAdminPunchedIn = telemetryList.find((t) => !isAdminPerson(t) && t.hasGpsFix);
    return nonAdminPunchedIn || telemetryList.find((t) => !isAdminPerson(t)) || null;
  }, [activeTarget, telemetryList]);

  // Determine active coordinates
  const activeLat = selectedStop?.lat || validTarget?.lat || SANGLI_PLANT_HQ.lat;
  const activeLng = selectedStop?.lng || validTarget?.lng || SANGLI_PLANT_HQ.lng;

  // Construct High-Definition Google Maps Embed URL
  const mapEmbedUrl = useMemo(() => {
    // If a specific stop was clicked in the route timeline:
    if (selectedStop) {
      return `https://maps.google.com/maps?q=${selectedStop.lat},${selectedStop.lng}&z=16${mapSatellite ? '&t=k' : ''}&output=embed`;
    }

    // If Route mode is active and we have visited waypoints:
    if (mapRouteMode && activeRouteDetails && Array.isArray(activeRouteDetails.stops) && activeRouteDetails.stops.length > 1) {
      const startStop = activeRouteDetails.stops[0];
      const endStop = activeRouteDetails.stops[activeRouteDetails.stops.length - 1];
      return `https://maps.google.com/maps?saddr=${startStop.lat},${startStop.lng}&daddr=${endStop.lat},${endStop.lng}&z=${internalZoom}${mapSatellite ? '&t=k' : ''}&output=embed`;
    }

    // Default: Point of Interest / Live GPS fix of staff member
    return `https://maps.google.com/maps?q=${activeLat},${activeLng}&z=${internalZoom}${mapSatellite ? '&t=k' : ''}&output=embed`;
  }, [selectedStop, mapRouteMode, activeRouteDetails, activeLat, activeLng, internalZoom, mapSatellite]);

  const handleZoomIn = () => setInternalZoom((z) => Math.min(19, z + 1));
  const handleZoomOut = () => setInternalZoom((z) => Math.max(11, z - 1));

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-300 shadow-md bg-slate-900 transition-all duration-300 ${
      isFullWidth ? 'h-[620px]' : 'h-[460px] sm:h-[500px] xl:h-[520px]'
    }`}>
      {/* Real High-Definition Google Maps Iframe */}
      <iframe
        key={mapEmbedUrl}
        title="Live Interactive GPS Map"
        width="100%"
        height="100%"
        style={{ border: 0, width: '100%', height: '100%' }}
        loading="lazy"
        allowFullScreen
        src={mapEmbedUrl}
        className="w-full h-full"
      />

      {/* Top Floating Telemetry HUD */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-900 p-2.5 px-3 rounded-xl shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-xs">
            {validTarget ? (validTarget.name || 'ST').substring(0, 2).toUpperCase() : 'HQ'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-900 font-bold truncate text-xs">
                {selectedStop ? `Stop #${selectedStop.stopNo}: ${selectedStop.title}` : (validTarget?.name || 'SM Concrete Tech — Sangli Fleet Radar')}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold truncate hidden sm:inline">
                • {validTarget?.role || 'Plant Hub'}
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                {selectedStop ? selectedStop.status : (validTarget?.status || 'Active')}
              </span>
            </div>
            <div className="text-[10px] text-slate-600 font-mono font-medium flex items-center gap-1.5 truncate">
              <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="truncate">{selectedStop?.address || validTarget?.geofenceStatus || 'Sangli Operational Area'}</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">
                {Number(activeLat).toFixed(4)}°N, {Number(activeLng).toFixed(4)}°E
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls in HUD */}
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedStop && (
            <button
              type="button"
              onClick={() => onSelectStop(null)}
              className="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs cursor-pointer"
              title="Reset to Full Route"
            >
              <span>Full Route</span>
            </button>
          )}

          <a
            href={`https://www.google.com/maps?q=${activeLat},${activeLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-2xs cursor-pointer"
            title="Open in Google Maps App"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Floating Map Utility Bar */}
      <div className="absolute bottom-4 right-3 z-10 flex flex-col items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-300 shadow-xl">
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
          title={mapRouteMode ? 'Switch to Single Pin Mode' : 'Switch to Visited Route Navigation Path'}
        >
          <Route className="w-4 h-4" />
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
      <div className="absolute bottom-4 left-3 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-bold font-mono">Google Maps Live</span>
        <span className="text-slate-400 text-[10px] hidden sm:inline">
          {mapRouteMode ? '• Route Navigation Active' : '• GNSS Pin Active'}
        </span>
      </div>
    </div>
  );
}
