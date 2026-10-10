import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  Clock, 
  ShieldCheck, 
  IndianRupee, 
  Calendar, 
  Camera, 
  MapPin, 
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Lock
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import Toast from '../dashboard/Toast';
import Modal from '../dashboard/Modal';

export default function HrSettingsView() {
  const { hrSettings, updateHrSettings } = useWorkforce();
  const [form, setForm] = useState({ ...hrSettings });
  const [activeModal, setActiveModal] = useState(null); // 'shift' | 'security' | 'payroll' | null
  const [toastMessage, setToastMessage] = useState(null);

  const handleSaveModal = (e) => {
    if (e) e.preventDefault();
    updateHrSettings({
      ...form,
      standardWorkingHours: Number(form.standardWorkingHours),
      otMultiplier: Number(form.otMultiplier),
      monthlyWorkingDays: Number(form.monthlyWorkingDays),
      lateGraceMinutes: Number(form.lateGraceMinutes),
      geofenceRadiusMeters: Number(form.geofenceRadiusMeters),
    });
    setActiveModal(null);
    setToastMessage('Workforce policy configuration updated successfully.');
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pt-2">
      {/* 3 Bright Pastel Light Blue 🩵 Configuration Cards with Optimal Horizontal Spacing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Shift & Attendance */}
        <div 
          onClick={() => setActiveModal('shift')}
          className="group relative p-5 rounded-2xl bg-gradient-to-br from-sky-100 via-sky-50 to-cyan-100/90 border-2 border-sky-300 hover:border-sky-400 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between space-y-3.5 hover:-translate-y-0.5"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-sky-200/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500 text-white font-black shrink-0 group-hover:scale-105 transition-transform shadow-xs shadow-sky-400/40">
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider group-hover:text-sky-700 transition-colors">
                    Shift Duty
                  </h3>
                  <p className="text-[10px] text-slate-600 font-medium">Roster thresholds</p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-sky-900 bg-sky-200/90 px-2.5 py-0.5 rounded-full border border-sky-300">
                ACTIVE
              </span>
            </div>

            {/* Metrics Pills */}
            <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
              <div className="p-2 rounded-xl bg-white/90 border border-sky-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 font-mono block">Hours</span>
                <span className="text-xs font-mono font-black text-sky-700">{form.standardWorkingHours}h</span>
              </div>
              <div className="p-2 rounded-xl bg-white/90 border border-sky-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 font-mono block">Grace</span>
                <span className="text-xs font-mono font-black text-sky-700">{form.lateGraceMinutes}m</span>
              </div>
              <div className="p-2 rounded-xl bg-white/90 border border-sky-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 font-mono block">Days</span>
                <span className="text-xs font-mono font-black text-sky-700">{form.monthlyWorkingDays}d</span>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-sky-200/80 flex items-center justify-between text-[11px] font-black text-sky-700 group-hover:text-sky-900">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.5]" />
              Configure Shift Rules
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Biometric & Geofence Security */}
        <div 
          onClick={() => setActiveModal('security')}
          className="group relative p-5 rounded-2xl bg-gradient-to-br from-sky-100 via-sky-50 to-cyan-100/90 border-2 border-sky-300 hover:border-sky-400 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between space-y-3.5 hover:-translate-y-0.5"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-sky-200/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500 text-white font-black shrink-0 group-hover:scale-105 transition-transform shadow-xs shadow-sky-400/40">
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider group-hover:text-sky-700 transition-colors">
                    Geofence & Security
                  </h3>
                  <p className="text-[10px] text-slate-600 font-medium">GPS radii & selfie locks</p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-sky-900 bg-sky-200/90 px-2.5 py-0.5 rounded-full border border-sky-300">
                SECURITY
              </span>
            </div>

            {/* Metrics Pills */}
            <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
              <div className="p-2 rounded-xl bg-white/90 border border-sky-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 font-mono block">Geofence</span>
                <span className="text-xs font-mono font-black text-sky-700">{form.geofenceRadiusMeters}m</span>
              </div>
              <div className="p-2 rounded-xl bg-white/90 border border-sky-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 font-mono block">Selfie</span>
                <span className={`text-[10px] font-mono font-bold ${form.requireSelfieOnMobilePunch ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {form.requireSelfieOnMobilePunch ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/90 border border-sky-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 font-mono block">GPS</span>
                <span className={`text-[10px] font-mono font-bold ${form.requireGpsOnMobilePunch ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {form.requireGpsOnMobilePunch ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-sky-200/80 flex items-center justify-between text-[11px] font-black text-sky-700 group-hover:text-sky-900">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
              Configure Security Locks
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Overtime & Payroll Formula */}
        <div 
          onClick={() => setActiveModal('payroll')}
          className="group relative p-5 rounded-2xl bg-gradient-to-br from-sky-100 via-sky-50 to-cyan-100/90 border-2 border-sky-300 hover:border-sky-400 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between space-y-3.5 hover:-translate-y-0.5"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-sky-200/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500 text-white font-black shrink-0 group-hover:scale-105 transition-transform shadow-xs shadow-sky-400/40">
                  <IndianRupee className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider group-hover:text-sky-700 transition-colors">
                    Payroll Formula
                  </h3>
                  <p className="text-[10px] text-slate-600 font-medium">Wage & OT multipliers</p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-sky-900 bg-sky-200/90 px-2.5 py-0.5 rounded-full border border-sky-300">
                FORMULA
              </span>
            </div>

            {/* Metrics Pills */}
            <div className="grid grid-cols-2 gap-2 text-center pt-0.5">
              <div className="p-2 rounded-xl bg-white/90 border border-sky-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 font-mono block">OT Rate</span>
                <span className="text-xs font-mono font-black text-sky-700">{form.otMultiplier}x</span>
              </div>
              <div className="p-2 rounded-xl bg-white/90 border border-sky-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 font-mono block">Probation</span>
                <span className="text-xs font-mono font-black text-sky-700">{form.probationPeriodMonths} Mo</span>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-sky-200/80 flex items-center justify-between text-[11px] font-black text-sky-700 group-hover:text-sky-900">
            <span className="flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 stroke-[2.5]" />
              Configure Payroll Formula
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* ================= MODAL FORM 1: Shift Duty & Attendance ================= */}
      <Modal
        isOpen={activeModal === 'shift'}
        onClose={() => setActiveModal(null)}
        title="Shift Duty & Attendance Parameters"
        subtitle="Configure plant working hours, late arrival grace windows, and monthly roster divisors."
        icon={Clock}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveModal} className="space-y-4 pt-2">
          {/* Standard Daily Working Hours */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
              <span>Standard Daily Working Hours</span>
              <span className="text-[10px] text-slate-500 font-mono">hrs / shift</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                value={form.standardWorkingHours}
                onChange={(e) => setForm({ ...form, standardWorkingHours: e.target.value })}
                className="w-full pl-3.5 pr-14 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:border-sky-500 focus:bg-white outline-none shadow-inner"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono font-bold pointer-events-none">
                Hours
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Duty hours before overtime computation commences.
            </p>
          </div>

          {/* Arrival Grace Period */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
              <span>Arrival Grace Period</span>
              <span className="text-[10px] text-slate-500 font-mono">minutes</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={form.lateGraceMinutes}
                onChange={(e) => setForm({ ...form, lateGraceMinutes: e.target.value })}
                className="w-full pl-3.5 pr-14 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:border-sky-500 focus:bg-white outline-none shadow-inner"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono font-bold pointer-events-none">
                Mins
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Tolerated arrival window before being flagged as late.
            </p>
          </div>

          {/* Standard Monthly Working Days */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
              <span>Standard Monthly Working Days</span>
              <span className="text-[10px] text-slate-500 font-mono">days / mo</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={form.monthlyWorkingDays}
                onChange={(e) => setForm({ ...form, monthlyWorkingDays: e.target.value })}
                className="w-full pl-3.5 pr-14 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:border-sky-500 focus:bg-white outline-none shadow-inner"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono font-bold pointer-events-none">
                Days
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Divisor used for daily salary and per-hour wage computation.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white flex items-center gap-2 cursor-pointer shadow-md shadow-sky-500/30"
            >
              <Save className="w-4 h-4" />
              <span>Save Shift Settings</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL FORM 2: Biometric & Geofence Security ================= */}
      <Modal
        isOpen={activeModal === 'security'}
        onClose={() => setActiveModal(null)}
        title="Biometric & Geofence Enforcements"
        subtitle="Location proximity boundaries, camera selfie verification, and GPS coordinate locks."
        icon={ShieldCheck}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveModal} className="space-y-4 pt-2">
          {/* Plant Geofence Radius */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
              <span>Plant Geofence Radius</span>
              <span className="text-[10px] text-slate-500 font-mono">meters</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={form.geofenceRadiusMeters}
                onChange={(e) => setForm({ ...form, geofenceRadiusMeters: e.target.value })}
                className="w-full pl-3.5 pr-16 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:border-sky-500 focus:bg-white outline-none shadow-inner"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono font-bold pointer-events-none">
                Meters
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Allowable proximity radius around plant control cabin.
            </p>
          </div>

          {/* Checkbox 1: Camera Selfie */}
          <div 
            onClick={() => setForm({ ...form, requireSelfieOnMobilePunch: !form.requireSelfieOnMobilePunch })}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              form.requireSelfieOnMobilePunch 
                ? 'bg-sky-50/80 border-sky-400 text-slate-900 shadow-xs' 
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <div className="pt-0.5">
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                form.requireSelfieOnMobilePunch 
                  ? 'bg-sky-500 border-sky-400 text-white' 
                  : 'border-slate-300 bg-white'
              }`}>
                {form.requireSelfieOnMobilePunch && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="font-bold text-xs text-slate-900">Require Camera Selfie on Mobile Punch-In</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Enforces facial verification snapshot on mobile terminal before registering arrival.
              </p>
            </div>
          </div>

          {/* Checkbox 2: GPS Lock */}
          <div 
            onClick={() => setForm({ ...form, requireGpsOnMobilePunch: !form.requireGpsOnMobilePunch })}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              form.requireGpsOnMobilePunch 
                ? 'bg-sky-50/80 border-sky-400 text-slate-900 shadow-xs' 
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <div className="pt-0.5">
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                form.requireGpsOnMobilePunch 
                  ? 'bg-sky-500 border-sky-400 text-white' 
                  : 'border-slate-300 bg-white'
              }`}>
                {form.requireGpsOnMobilePunch && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="font-bold text-xs text-slate-900">Enforce GPS Coordinate Lock on Punch-In</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Rejects punch-in attempts if smartphone GPS coordinates fall outside boundary.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white flex items-center gap-2 cursor-pointer shadow-md shadow-sky-500/30"
            >
              <Save className="w-4 h-4" />
              <span>Save Security Settings</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL FORM 3: Overtime & Payroll Formula ================= */}
      <Modal
        isOpen={activeModal === 'payroll'}
        onClose={() => setActiveModal(null)}
        title="Overtime Compensation & Payroll Formula"
        subtitle="Configure overtime multipliers, wage rate calculation rules, and probation period tenure."
        icon={IndianRupee}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveModal} className="space-y-4 pt-2">
          {/* Overtime Hourly Multiplier */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
              <span>Overtime Hourly Multiplier</span>
              <span className="text-[10px] text-slate-500 font-mono">rate factor</span>
            </label>
            <select
              value={form.otMultiplier}
              onChange={(e) => setForm({ ...form, otMultiplier: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:border-sky-500 focus:bg-white outline-none cursor-pointer"
            >
              <option value={1.0}>1.0x (Standard Single Hourly Rate)</option>
              <option value={1.25}>1.25x Rate</option>
              <option value={1.5}>1.5x (Industry Standard Time-and-a-Half)</option>
              <option value={2.0}>2.0x (Double Time for Night Concrete Pours)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Applied to hourly wage during excess duty hours.
            </p>
          </div>

          {/* Probationary Period */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
              <span>Probationary Period</span>
              <span className="text-[10px] text-slate-500 font-mono">months</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={form.probationPeriodMonths}
                onChange={(e) => setForm({ ...form, probationPeriodMonths: e.target.value })}
                className="w-full pl-3.5 pr-16 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:border-sky-500 focus:bg-white outline-none shadow-inner"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono font-bold pointer-events-none">
                Months
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Tenure required before entitlement to full earned leave bank.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white flex items-center gap-2 cursor-pointer shadow-md shadow-sky-500/30"
            >
              <Save className="w-4 h-4" />
              <span>Save Payroll Formula</span>
            </button>
          </div>
        </form>
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
