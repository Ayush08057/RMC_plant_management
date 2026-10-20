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
