import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkforceProvider } from './context/WorkforceContext';
import { LanguageProvider } from './context/LanguageContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';
import { sanitizeStoreItems } from './services/cloudSyncService';

export default function App() {
  // Purge any residual mock/dummy operational items across all local storage stores on boot
  useEffect(() => {
    try {
      const keysToScrub = [
        'rmc_driver_trips_v2',
        'rmc_material_inward_v2',
        'rmc_batching_sheets_v2',
        'rmc_delivery_challans_v2',
        'rmc_diesel_management_v2',
        'rmc_weighbridge_v2',
        'rmc_plant_vehicles_v2',
        'rmc_billing_records_v1',
        'rmc_billing_records_v2',
        'rmc_billing_records_v3',
        'rmc_plant_purchases_v1',
        'rmc_plant_purchases_v2',
        'rmc_billing_otp_audit_v1',
        'rmc_billing_otp_audit_v2',
        'rmc_employee_route_history_v2',
        'rmc_employee_route_histories_v1',
        'rmc_qc_cube_tests_v1',
        'rmc_store_inventory_v1',
        'rmc_store_logs_v1',
      ];
      keysToScrub.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const clean = sanitizeStoreItems(parsed);
              if (clean.length !== parsed.length) {
                localStorage.setItem(key, JSON.stringify(clean));
              }
            }
          } catch {}
        }
      });

      // Scrub legacy mock route coordinates (16.8464, 74.5990)
      const routesRaw = localStorage.getItem('rmc_employee_route_histories_v1') || localStorage.getItem('rmc_employee_route_history_v2');
      if (routesRaw && (routesRaw.includes('Sangli Plant Operational') || routesRaw.includes('16.8464') || routesRaw.includes('Effotel') || routesRaw.includes('Dandekar'))) {
        try {
          const routesParsed = JSON.parse(routesRaw);
          const cleanedRoutes = {};
          Object.keys(routesParsed).forEach((k) => {
            const list = routesParsed[k];
            if (Array.isArray(list)) {
              cleanedRoutes[k] = list.filter((s) => 
                s &&
                !s.title?.includes('Sangli Plant Operational') &&
                !s.title?.includes('Effotel') &&
                !s.title?.includes('Dandekar') &&
                !(s.lat && s.lng && Math.abs(Number(s.lat) - 16.8464) < 0.01)
              );
            }
          });
          localStorage.setItem('rmc_employee_route_history_v2', JSON.stringify(cleanedRoutes));
        } catch {}
      }

      // Day-to-Day Attendance Isolation: Close any unclosed past-day records and sanitize Supervisor location
      const todayStr = new Date().toISOString().split('T')[0];
      const sanitizeAttendanceList = (list) => {
        if (!Array.isArray(list)) return [];
        return list.map((a) => {
          if (!a) return a;
          const aDate = a.date || (a.createdAt ? a.createdAt.split('T')[0] : '');
          const isPastDate = aDate && aDate < todayStr;
          let updated = { ...a };

          // If from past date and was left open (punchIn without punchOut), close it for that past date
          if (isPastDate && updated.punchIn && !updated.punchOut) {
            updated.punchOut = '06:00 PM';
            updated.workingHours = 9.0;
            updated.status = 'Present';
            updated.completionStatus = 'Full Day';
          }

          // Sanitize Site Supervisor location to Sangli Godrej Green Acres
          const aId = (updated.employeeId || updated.id || '').toUpperCase();
          if (aId === 'SS-001' || aId.includes('SS') || (updated.role && updated.role.toLowerCase().includes('supervisor'))) {
            if (updated.geofenceStatus?.toLowerCase().includes('dandekar') || updated.geofenceStatus?.toLowerCase().includes('pune') || Number(updated.gpsLocation?.lat) >= 17.5) {
              updated.geofenceStatus = 'Godrej Green Acres Site, Sangli';
              updated.landmarkName = 'Godrej Green Acres Construction Site, Sangli';
              updated.address = 'Near Government Colony, Sangli, Maharashtra 416416';
              updated.gpsLocation = {
                lat: 16.852000,
                lng: 74.590000,
                accuracy: 15,
                timestamp: updated.gpsLocation?.timestamp || new Date().toISOString(),
                address: 'Near Government Colony, Sangli, Maharashtra 416416',
                landmarkName: 'Godrej Green Acres Construction Site, Sangli',
              };
              updated.lastKnownLocation = { ...updated.gpsLocation };
            }
          }

          // Sanitize QC Engineer location to Sangli Quality Lab if contaminated by Kolhapur ISP or out-of-range fix
          if (aId === 'QC-001' || aId.includes('QC') || (updated.role && (updated.role.toLowerCase().includes('qc') || updated.role.toLowerCase().includes('quality')))) {
            const qLat = Number(updated.gpsLocation?.lat);
            const qLng = Number(updated.gpsLocation?.lng);
            const isKolhapur = Math.abs(qLat - 16.6941) < 0.05 && Math.abs(qLng - 74.2366) < 0.05;
            if (isKolhapur || qLat >= 17.5 || qLat < 16.5 || !updated.gpsLocation?.lat) {
              updated.geofenceStatus = 'Miraj Highway Package B Quality Lab, Sangli';
              updated.landmarkName = 'Miraj Highway Package B Quality Lab, Sangli';
              updated.address = 'Miraj Industrial Corridor, Sangli, Maharashtra 416410';
              updated.gpsLocation = {
                lat: 16.8300,
                lng: 74.6400,
                accuracy: 15,
                timestamp: updated.gpsLocation?.timestamp || new Date().toISOString(),
                address: 'Miraj Industrial Corridor, Sangli, Maharashtra 416410',
                landmarkName: 'Miraj Highway Package B Quality Lab, Sangli',
              };
              updated.lastKnownLocation = { ...updated.gpsLocation };
              if (Array.isArray(updated.routeTrail)) {
                updated.routeTrail = updated.routeTrail.filter(s => {
                  if (!s || !s.lat) return false;
                  return !(Math.abs(Number(s.lat) - 16.6941) < 0.05 && Math.abs(Number(s.lng) - 74.2366) < 0.05);
                });
                if (updated.routeTrail.length === 0 && updated.punchIn) {
                  updated.routeTrail = [{
                    stopNo: 1,
                    title: 'Punch-In: Miraj Highway Package B Quality Lab, Sangli',
                    category: 'Punch-In Location',
                    address: 'Miraj Industrial Corridor, Sangli, Maharashtra 416410',
                    time: updated.punchIn,
                    lat: 16.8300,
                    lng: 74.6400,
                    status: 'Punch-In Station',
                    distanceKm: 0.0,
                    notes: 'Verified biometric punch-in in Sangli Quality Lab'
                  }];
                }
              }
            }
          }
          return updated;
        });
      };

      const attKeys = ['rmc_attendance_v1', 'rmc_workforce_data_v1', 'rmc_workforce_data_v1_company_01', 'rmc_workforce_data_v1_company_default'];
      attKeys.forEach((key) => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              localStorage.setItem(key, JSON.stringify(sanitizeAttendanceList(parsed)));
            } else if (parsed && Array.isArray(parsed.attendance)) {
              parsed.attendance = sanitizeAttendanceList(parsed.attendance);
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          }
        } catch {}
      });
    } catch {}
  }, []);
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <WorkforceProvider>
            <LanguageProvider>
              {/* Clean Enterprise Foundation Surface */}
              <div className="relative z-10 h-screen max-h-screen w-full max-w-full overflow-hidden flex flex-col bg-slate-50 text-slate-900">
                <AppRoutes />
              </div>
            </LanguageProvider>
          </WorkforceProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
