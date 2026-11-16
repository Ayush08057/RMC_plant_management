import React from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  Clock, 
  Receipt, 
  Users, 
  Truck, 
  Navigation, 
  ClipboardList, 
  FlaskConical, 
  Layers 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { ROLES } from '../../data/mockUsers';

/**
 * Returns role-specific main steady usage buttons for mobile Android application view
 */
function getRoleBottomNavItems(role) {
  switch (role) {
    case ROLES.ADMIN:
    case ROLES.OWNER_DIRECTOR:
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'live-tracking', label: 'Live GPS', icon: MapPin },
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'billing', label: 'Billing', icon: Receipt },
        { id: 'employees', label: 'Employees', icon: Users },
      ];

    case ROLES.PLANT_MANAGER:
    case ROLES.PLANT_INCHARGE:
    case ROLES.OPERATOR:
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'batching-sheets', label: 'Batching', icon: ClipboardList },
        { id: 'delivery-challans', label: 'Challans', icon: Truck },
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'employees', label: 'Crew', icon: Users },
      ];

    case ROLES.ACCOUNTANT:
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'billing', label: 'Billing', icon: Receipt },
        { id: 'material-inward', label: 'Purchases', icon: Layers },
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'payroll', label: 'Payroll', icon: Users },
      ];

    case ROLES.DRIVER:
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'driver-trips', label: 'My Trips', icon: Navigation },
        { id: 'live-tracking', label: 'Live GPS', icon: MapPin },
        { id: 'vehicle-management', label: 'Vehicle', icon: Truck },
        { id: 'attendance', label: 'Attendance', icon: Clock },
      ];

    case ROLES.SITE_SUPERVISOR:
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'delivery-challans', label: 'Challans', icon: Truck },
        { id: 'driver-trips', label: 'Trips', icon: Navigation },
        { id: 'daily-work', label: 'Daily Work', icon: ClipboardList },
        { id: 'attendance', label: 'Attendance', icon: Clock },
      ];

    case ROLES.QC_ENGINEER:
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'qc-cubes', label: 'QC Cubes', icon: FlaskConical },
        { id: 'mix-design', label: 'Mix Design', icon: Layers },
        { id: 'reports', label: 'Reports', icon: ClipboardList },
        { id: 'attendance', label: 'Attendance', icon: Clock },
      ];

    case ROLES.DISPATCHER:
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'delivery-challans', label: 'Challans', icon: Truck },
        { id: 'driver-trips', label: 'Trips', icon: Navigation },
        { id: 'live-tracking', label: 'Live GPS', icon: MapPin },
        { id: 'attendance', label: 'Attendance', icon: Clock },
      ];

    default:
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'live-tracking', label: 'Live GPS', icon: MapPin },
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'billing', label: 'Billing', icon: Receipt },
        { id: 'employees', label: 'Employees', icon: Users },
      ];
  }
}

/**
 * Enterprise Mobile Bottom Navigation Bar for Android Application
 * Displays primary dashboard workflow buttons fixed at the bottom with thumb-friendly targets
 */
export default function MobileBottomNav({
  activeTab = 'dashboard',
  onSelectTab = () => {},
  user = null,
}) {
  const { t } = useLanguage();
  const primaryItems = getRoleBottomNavItems(user?.role);

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] px-2 pt-1 pb-safe safe-area-pb"
    >
      <div className="flex items-center justify-around h-14 max-w-md mx-auto">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all select-none cursor-pointer active:scale-95 ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={t(item.label)}
            >
              <div className={`relative p-1 rounded-xl transition-colors ${
                isActive ? 'bg-blue-50' : 'bg-transparent'
              }`}>
                <Icon className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-110 text-blue-600 stroke-[2.5]' : 'stroke-[1.8]'
                }`} />
                {isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-600 ring-2 ring-white animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] tracking-tight truncate max-w-full mt-0.5 ${
                isActive ? 'font-bold text-blue-700' : 'font-medium text-slate-500'
              }`}>
                {t(item.label)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
