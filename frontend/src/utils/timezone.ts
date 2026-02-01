/**
 * Timezone Utilities for Spark Stage
 * 
 * CRITICAL: All business operations are in WIB (UTC+7) timezone
 * 
 * RULES:
 * 1. Database stores dates/times as UTC (PostgreSQL TIMESTAMPTZ)
 * 2. Database stores time_slot as TIME WITHOUT TIMEZONE (treated as WIB local time)
 * 3. All user-facing times are displayed in WIB
 * 4. All comparisons must be timezone-aware
 * 
 * NEVER use:
 * - new Date() without timezone context
 * - Date.now() for business logic
 * - toISOString() without understanding it returns UTC
 * 
 * ALWAYS use:
 * - Functions from this file
 * - Explicit timezone conversion
 * - WIB-aware comparisons
 */

export const WIB_OFFSET_HOURS = 7;
export const WIB_OFFSET_MS = WIB_OFFSET_HOURS * 60 * 60 * 1000;

/**
 * Get current time in WIB timezone
 * Use this instead of new Date() for business logic
 * Returns a Date object representing current WIB time
 */
export function nowWIB(): Date {
  // Get current UTC time
  const now = new Date();
  // Return as-is (Date object internally stores UTC, we interpret it as WIB)
  return now;
}

/**
 * Convert UTC Date to WIB Date
 */
export function utcToWIB(utcDate: Date): Date {
  return new Date(utcDate.getTime() + WIB_OFFSET_MS);
}

/**
 * Convert WIB Date to UTC Date
 */
export function wibToUTC(wibDate: Date): Date {
  return new Date(wibDate.getTime() - WIB_OFFSET_MS);
}

/**
 * Parse date string from database (UTC) and convert to WIB
 */
export function parseDBDateToWIB(dbDateString: string): Date {
  const utcDate = new Date(dbDateString);
  return utcToWIB(utcDate);
}

/**
 * Format Date to ISO string in WIB timezone
 * Use this when sending dates to backend that expects WIB
 */
export function toWIBISOString(date: Date): string {
  const wibDate = new Date(date.getTime() + WIB_OFFSET_MS);
  return wibDate.toISOString();
}

/**
 * Get today's date at midnight in WIB
 * Use this for date comparisons
 */
export function todayWIB(): Date {
  return createWIBDate(toLocalDateString(nowWIB()));
}

/**
 * Create a Date object for a specific date and time in WIB
 * @param dateString - YYYY-MM-DD format
 * @param timeString - HH:MM or HH:MM:SS format (optional)
 * @returns Date object representing the WIB time
 */
export function createWIBDate(dateString: string, timeString?: string): Date {
  // Parse as if it's in WIB timezone (UTC+7)
  // Add :00 for seconds if timeString is HH:MM format
  const fullTimeString = timeString 
    ? (timeString.split(':').length === 2 ? `${timeString}:00` : timeString)
    : '00:00:00';
  
  const isoString = `${dateString}T${fullTimeString}+07:00`;
  return new Date(isoString);
}

/**
 * Format date to local date string (YYYY-MM-DD)
 * Handles timezone properly - uses WIB date
 */
export function toLocalDateString(date: Date): string {
  const wibDate = new Date(date.getTime() + WIB_OFFSET_MS);
  const year = wibDate.getUTCFullYear();
  const month = String(wibDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(wibDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date is today in WIB timezone
 */
export function isTodayWIB(date: Date): boolean {
  return toLocalDateString(date) === toLocalDateString(nowWIB());
}

/**
 * Check if a datetime is in the past (WIB timezone)
 */
export function isPastWIB(date: Date): boolean {
  return date.getTime() < nowWIB().getTime();
}

/**
 * Add minutes to a date (timezone-safe)
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Add hours to a date (timezone-safe)
 */
export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Add days to a date (timezone-safe)
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Format time for display (HH:MM format)
 */
export function formatTimeWIB(date: Date): string {
  const wibDate = utcToWIB(date);
  const hours = String(wibDate.getUTCHours()).padStart(2, '0');
  const minutes = String(wibDate.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format datetime for display in WIB
 */
export function formatDateTimeWIB(date: Date): string {
  const wibDate = utcToWIB(date);
  return wibDate.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Parse time slot string (HH:MM:SS) and create Date for today in WIB
 * Used for comparing time slots with current time
 */
export function parseTimeSlotToday(timeSlot: string, referenceDate?: Date): Date {
  const dateString = toLocalDateString(referenceDate ? new Date(referenceDate) : nowWIB());
  return createWIBDate(dateString, timeSlot);
}

/**
 * Session duration in minutes (2.5 hours)
 * Updated: January 2026 - Changed from 3 hours to 2.5 hours
 */
export const SESSION_DURATION_MINUTES = 150; // 2.5 hours

/**
 * Get booking buffer time (current time + buffer minutes) in WIB
 * @deprecated Use isTimeSlotBookable instead - buffer logic removed
 */
export function getBookingBufferTime(bufferMinutes: number = 30): Date {
  return addMinutes(nowWIB(), bufferMinutes);
}

/**
 * Validate if a time slot is bookable
 * NEW LOGIC (Jan 2026): Allow booking as long as session hasn't ended
 * - Customers can book even after session starts
 * - Booking closes when session END time is reached
 * - No artificial 30-minute buffer
 * 
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeSlot - Time in HH:MM:SS format (session start time)
 * @returns true if current time is before session end time
 * 
 * Example:
 * - Session: 18:00-20:30 (2.5 hours)
 * - Current: 18:15 → ✅ Bookable (session ends at 20:30)
 * - Current: 20:35 → ❌ Not bookable (session ended)
 */
export function isTimeSlotBookable(
  dateString: string,
  timeSlot: string
): boolean {
  const slotStartTime = createWIBDate(dateString, timeSlot);
  const slotEndTime = addMinutes(slotStartTime, SESSION_DURATION_MINUTES);
  const currentTime = nowWIB();
  
  // Allow booking if session hasn't ended yet
  return slotEndTime > currentTime;
}

/**
 * Get the end time of a session
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeSlot - Time in HH:MM:SS format (session start time)
 * @returns Session end time as Date
 */
export function getSessionEndTime(dateString: string, timeSlot: string): Date {
  const slotStartTime = createWIBDate(dateString, timeSlot);
  return addMinutes(slotStartTime, SESSION_DURATION_MINUTES);
}

/**
 * Get minutes remaining until session ends
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeSlot - Time in HH:MM:SS format (session start time)
 * @returns Minutes until session ends, or 0 if session has ended
 */
export function getMinutesUntilSessionEnd(dateString: string, timeSlot: string): number {
  const sessionEndTime = getSessionEndTime(dateString, timeSlot);
  const currentTime = nowWIB();
  const diffMs = sessionEndTime.getTime() - currentTime.getTime();
  return Math.max(0, Math.floor(diffMs / (60 * 1000)));
}

/**
 * MIGRATION HELPER: Convert existing Date usage
 * Use this to audit and fix existing code
 */
export const MIGRATION_NOTES = `
BEFORE (WRONG):
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

AFTER (CORRECT):
  import { nowWIB, todayWIB } from '@/utils/timezone';
  const now = nowWIB();
  const today = todayWIB();

BEFORE (WRONG):
  const slotTime = new Date();
  slotTime.setHours(hours, minutes, 0, 0);

AFTER (CORRECT):
  import { parseTimeSlotToday } from '@/utils/timezone';
  const slotTime = parseTimeSlotToday(timeSlot, selectedDate);

BEFORE (WRONG):
  const bookingDate = new Date(dateString);

AFTER (CORRECT):
  import { createWIBDate } from '@/utils/timezone';
  const bookingDate = createWIBDate(dateString);
`;
