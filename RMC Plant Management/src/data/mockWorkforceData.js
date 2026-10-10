/**
 * RMC Plant Management System - Phase 1 Workforce & HR Initial Configuration
 * Clean operational workforce structure with real dynamic initial attendance records.
 */

import { ROLES } from './mockUsers.js';

const todayStr = new Date().toISOString().split('T')[0];

export const INITIAL_SHIFTS = [];

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
