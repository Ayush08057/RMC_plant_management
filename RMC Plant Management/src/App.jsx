import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkforceProvider } from './context/WorkforceContext';
import { LanguageProvider } from './context/LanguageContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';
import { sanitizeStoreItems } from './services/cloudSyncService';
import { getLocalIstDateStr } from './utils/shiftUtils';

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

      // Scrub legacy mock route coordinates
      const routesRaw = localStorage.getItem('rmc_employee_route_histories_v1') || localStorage.getItem('rmc_employee_route_history_v2');
      if (routesRaw && (routesRaw.includes('Sangli Plant Operational') || routesRaw.includes('Effotel') || routesRaw.includes('Dandekar'))) {
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
                !s.title?.includes('Dandekar')
              );
            }
          });
          localStorage.setItem('rmc_employee_route_history_v2', JSON.stringify(cleanedRoutes));
        } catch {}
      }

      // Day-to-Day Attendance Isolation: Close any unclosed past-day records without injecting fake GPS coordinates
      const todayStr = getLocalIstDateStr();
      const sanitizeAttendanceList = (list) => {
        if (!Array.isArray(list)) return [];
        return list.map((a) => {
          if (!a) return a;
          const aDate = a.date || (a.createdAt ? a.createdAt.split('T')[0] : '');
          const isPastDate = aDate && aDate < todayStr;
          const updated = { ...a };

          // If from past date and was left open (punchIn without punchOut), close it for that past date
          if (isPastDate && updated.punchIn && !updated.punchOut) {
            updated.punchOut = '06:00 PM';
            updated.workingHours = 9.0;
            updated.status = 'Present';
            updated.completionStatus = 'Full Day';
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
