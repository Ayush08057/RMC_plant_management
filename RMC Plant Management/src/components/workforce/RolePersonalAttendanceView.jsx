import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Smartphone, 
  CheckCircle2 
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { OFFICIAL_ROLE_ACCOUNTS } from '../../data/mockUsers';
import MobilePunchWidget from './MobilePunchWidget';

export default function RolePersonalAttendanceView({
  defaultRole = 'Staff',
  defaultEmpId = 'EMP-001',
  defaultDepartment = 'Operations',
  canSwitchToTeamView = false,
  teamViewComponent = null,
  onPunched = () => {},
}) {
  const { user } = useAuth();
  const { employees } = useWorkforce();
  const [activeTabMode, setActiveTabMode] = useState('personal'); // 'personal' | 'team'
  const [toastMessage, setToastMessage] = useState(null);

  // Resolve target employee identity for this role portal
  const targetEmpId = useMemo(() => {
    return user?.employeeId || defaultEmpId || user?.id || 'EMP-001';
  }, [user, defaultEmpId]);

  const targetRole = useMemo(() => {
    return user?.role || defaultRole;
  }, [user, defaultRole]);

  const officialProfile = useMemo(() => {
    return (OFFICIAL_ROLE_ACCOUNTS || []).find(
      (a) => (a.employeeId && a.employeeId.toUpperCase() === targetEmpId.toUpperCase()) ||
             (a.role && a.role.toLowerCase() === targetRole.toLowerCase())
    ) || (employees || []).find(
      (e) => (e.employeeId && e.employeeId.toUpperCase() === targetEmpId.toUpperCase()) ||
             (e.id && e.id.toUpperCase() === targetEmpId.toUpperCase())
    ) || {
      name: user?.name || defaultRole,
      role: targetRole,
      employeeId: targetEmpId,
      department: user?.department || defaultDepartment,
      plantLocation: user?.plantLocation || 'Main Plant HQ',
    };
  }, [targetEmpId, targetRole, user, defaultRole, defaultDepartment, employees]);

  return (
    <div className="w-full flex-1 flex flex-col space-y-4 pb-6 min-w-0">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 bg-[#123B6D] text-white px-4 py-2.5 rounded-xl shadow-lg border border-[#1D5FA7] flex items-center gap-2 text-xs font-semibold animate-slide-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Supervisory Mode Toggle (when role has team authority, e.g. Plant Manager) */}
      {canSwitchToTeamView && teamViewComponent && (
        <div className="flex items-center justify-between bg-white border border-[#D4E4F7] p-2 rounded-2xl shadow-2xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTabMode('personal')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTabMode === 'personal'
                  ? 'bg-[#1D5FA7] text-white shadow-xs'
                  : 'bg-white hover:bg-[#EAF3FF] text-black border border-[#D4E4F7]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>My Attendance Punch</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTabMode('team')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTabMode === 'team'
                  ? 'bg-[#1D5FA7] text-white shadow-xs'
                  : 'bg-white hover:bg-[#EAF3FF] text-black border border-[#D4E4F7]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team & Workforce Register</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-700 flex items-center gap-1.5 pr-2">
            <span className="w-2 h-2 rounded-full bg-[#246BCE]" />
            <span>Active Staff: <strong className="text-black">{officialProfile.name}</strong> ({targetEmpId})</span>
          </div>
        </div>
      )}

      {/* Render Team View if chosen by Plant Manager */}
      {activeTabMode === 'team' && canSwitchToTeamView && teamViewComponent ? (
        <div className="w-full">{teamViewComponent}</div>
      ) : (
        /* Simple Real-time Mobile Punch Interface (matches Image 2) */
        <div className="w-full flex justify-center py-2">
          <MobilePunchWidget
            lockedEmployeeId={targetEmpId}
            roleLocked={true}
            onPunched={() => {
              setToastMessage(`Attendance for ${officialProfile.name} verified and recorded!`);
              onPunched();
              setTimeout(() => setToastMessage(null), 4000);
            }}
          />
        </div>
      )}
    </div>
  );
}
