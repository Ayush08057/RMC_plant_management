/**
 * RMC Plant Management System - Phase 1 Workforce & HR Initial Configuration
 * Clean operational workforce structure with real dynamic initial attendance records.
 */

import { ROLES } from './mockUsers.js';

const todayStr = new Date().toISOString().split('T')[0];

export const INITIAL_SHIFTS = [
  {
    id: 'SFT-GEN',
    name: 'General Morning Shift',
    code: 'GEN-A',
    startTime: '09:00 AM',
    endTime: '06:00 PM',
    gracePeriodMins: 15,
    totalShiftHours: 9.0,
    fullDayMinHours: 8.5,
    otThresholdHours: 9.0,
    otRatePerHour: 220,
    status: 'Active',
    description: 'Standard 9-hour operational shift (09:00 AM - 06:00 PM). Minimum 8h 30m required for Full Day present; less than 8h 30m counts as Half Day.',
  },
  {
    id: 'SFT-NIGHT',
    name: 'Night Pour Shift',
    code: 'NGT-B',
    startTime: '08:00 PM',
    endTime: '05:00 AM',
    gracePeriodMins: 15,
    totalShiftHours: 9.0,
    fullDayMinHours: 8.5,
    otThresholdHours: 9.0,
    otRatePerHour: 260,
    status: 'Active',
    description: 'Concrete night slab pouring and nocturnal road delivery schedule (9-hour night shift).',
  },
];

export const INITIAL_EMPLOYEES = [];

export const INITIAL_ATTENDANCE = [];

export const INITIAL_DAILY_WORK = [];

export const INITIAL_LEAVES = [];

export const INITIAL_ADVANCES = [];

export const INITIAL_LOANS = [];

export const INITIAL_DOCUMENTS = [];

export const INITIAL_AUDIT_LOGS = [];

export const INITIAL_HR_SETTINGS = {
  standardWorkingHours: 8,
  otMultiplier: 1.5,
  monthlyWorkingDays: 26,
  lateGraceMinutes: 15,
  geofenceRadiusMeters: 250,
  autoLeaveDeduction: true,
  requireSelfieOnMobilePunch: true,
  requireGpsOnMobilePunch: true,
  probationPeriodMonths: 3,
};
