import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SESSION_DURATION_MINUTES,
  isTimeSlotBookable,
  getSessionEndTime,
  getMinutesUntilSessionEnd,
  createWIBDate,
} from './timezone';

describe('Flexible Session Booking Logic', () => {
  beforeEach(() => {
    // Mock current time to a fixed point for consistent testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('SESSION_DURATION_MINUTES', () => {
    it('should be 150 minutes (2.5 hours)', () => {
      expect(SESSION_DURATION_MINUTES).toBe(150);
    });
  });

  describe('isTimeSlotBookable - NEW LOGIC', () => {
    it('should allow booking when current time is before session start', () => {
      // Current time: 17:00 WIB
      vi.setSystemTime(new Date('2026-01-27T10:00:00Z')); // 17:00 WIB (UTC+7)
      
      // Session: 18:00-20:30
      const result = isTimeSlotBookable('2026-01-27', '18:00:00');
      
      expect(result).toBe(true);
    });

    it('should allow booking when current time is after session start but before session end', () => {
      // Current time: 18:15 WIB (session started 15 min ago)
      vi.setSystemTime(new Date('2026-01-27T11:15:00Z')); // 18:15 WIB
      
      // Session: 18:00-20:30 (ends at 20:30)
      const result = isTimeSlotBookable('2026-01-27', '18:00:00');
      
      expect(result).toBe(true); // NEW: Allowed during active session
    });

    it('should allow booking even 5 minutes before session ends', () => {
      // Current time: 20:25 WIB (5 min before session ends)
      vi.setSystemTime(new Date('2026-01-27T13:25:00Z')); // 20:25 WIB
      
      // Session: 18:00-20:30
      const result = isTimeSlotBookable('2026-01-27', '18:00:00');
      
      expect(result).toBe(true);
    });

    it('should NOT allow booking when session has ended', () => {
      // Current time: 20:35 WIB (5 min after session ended)
      vi.setSystemTime(new Date('2026-01-27T13:35:00Z')); // 20:35 WIB
      
      // Session: 18:00-20:30 (ended at 20:30)
      const result = isTimeSlotBookable('2026-01-27', '18:00:00');
      
      expect(result).toBe(false);
    });

    it('should handle morning session correctly', () => {
      // Current time: 10:00 WIB
      vi.setSystemTime(new Date('2026-01-27T03:00:00Z')); // 10:00 WIB
      
      // Session: 09:00-11:30
      const result = isTimeSlotBookable('2026-01-27', '09:00:00');
      
      expect(result).toBe(true); // Session ends at 11:30, still bookable
    });

    it('should handle afternoon session correctly', () => {
      // Current time: 13:00 WIB
      vi.setSystemTime(new Date('2026-01-27T06:00:00Z')); // 13:00 WIB
      
      // Session: 12:00-14:30
      const result = isTimeSlotBookable('2026-01-27', '12:00:00');
      
      expect(result).toBe(true); // Session ends at 14:30, still bookable
    });
  });

  describe('getSessionEndTime', () => {
    it('should calculate correct end time for morning session', () => {
      // Session: 09:00-11:30
      const endTime = getSessionEndTime('2026-01-27', '09:00:00');
      
      // Expected: 11:30 WIB
      const expected = createWIBDate('2026-01-27', '11:30:00');
      
      expect(endTime.getTime()).toBe(expected.getTime());
    });

    it('should calculate correct end time for evening session', () => {
      // Session: 18:00-20:30
      const endTime = getSessionEndTime('2026-01-27', '18:00:00');
      
      // Expected: 20:30 WIB
      const expected = createWIBDate('2026-01-27', '20:30:00');
      
      expect(endTime.getTime()).toBe(expected.getTime());
    });
  });

  describe('getMinutesUntilSessionEnd', () => {
    it('should return correct minutes when session has not started', () => {
      // Current time: 17:00 WIB
      vi.setSystemTime(new Date('2026-01-27T10:00:00Z')); // 17:00 WIB
      
      // Session: 18:00-20:30 (ends at 20:30)
      const minutes = getMinutesUntilSessionEnd('2026-01-27', '18:00:00');
      
      expect(minutes).toBe(210); // 3.5 hours = 210 minutes
    });

    it('should return correct minutes during active session', () => {
      // Current time: 19:00 WIB (1 hour into session)
      vi.setSystemTime(new Date('2026-01-27T12:00:00Z')); // 19:00 WIB
      
      // Session: 18:00-20:30 (ends at 20:30)
      const minutes = getMinutesUntilSessionEnd('2026-01-27', '18:00:00');
      
      expect(minutes).toBe(90); // 1.5 hours remaining
    });

    it('should return 0 when session has ended', () => {
      // Current time: 20:35 WIB (after session ended)
      vi.setSystemTime(new Date('2026-01-27T13:35:00Z')); // 20:35 WIB
      
      // Session: 18:00-20:30
      const minutes = getMinutesUntilSessionEnd('2026-01-27', '18:00:00');
      
      expect(minutes).toBe(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('Scenario 1: Customer books at 17:46 for 18:00 session', () => {
      // OLD SYSTEM: ❌ Blocked (within 30-min buffer)
      // NEW SYSTEM: ✅ Allowed
      
      vi.setSystemTime(new Date('2026-01-27T10:46:00Z')); // 17:46 WIB
      
      const result = isTimeSlotBookable('2026-01-27', '18:00:00');
      const minutesLeft = getMinutesUntilSessionEnd('2026-01-27', '18:00:00');
      
      expect(result).toBe(true);
      expect(minutesLeft).toBe(164); // 2h 44min until session ends
    });

    it('Scenario 2: Customer books at 18:10 for 18:00 session (already started)', () => {
      // OLD SYSTEM: ❌ Blocked (session started)
      // NEW SYSTEM: ✅ Allowed (session hasn't ended)
      
      vi.setSystemTime(new Date('2026-01-27T11:10:00Z')); // 18:10 WIB
      
      const result = isTimeSlotBookable('2026-01-27', '18:00:00');
      const minutesLeft = getMinutesUntilSessionEnd('2026-01-27', '18:00:00');
      
      expect(result).toBe(true);
      expect(minutesLeft).toBe(140); // 2h 20min until session ends
    });

    it('Scenario 3: Customer tries to book at 20:35 for 18:00 session (ended)', () => {
      // OLD SYSTEM: ❌ Blocked
      // NEW SYSTEM: ❌ Blocked (session ended)
      
      vi.setSystemTime(new Date('2026-01-27T13:35:00Z')); // 20:35 WIB
      
      const result = isTimeSlotBookable('2026-01-27', '18:00:00');
      const minutesLeft = getMinutesUntilSessionEnd('2026-01-27', '18:00:00');
      
      expect(result).toBe(false);
      expect(minutesLeft).toBe(0);
    });

    it('Scenario 4: Morning session - book at 10:00 for 09:00 session', () => {
      // Session: 09:00-11:30
      // Current: 10:00 (1 hour into session)
      
      vi.setSystemTime(new Date('2026-01-27T03:00:00Z')); // 10:00 WIB
      
      const result = isTimeSlotBookable('2026-01-27', '09:00:00');
      const minutesLeft = getMinutesUntilSessionEnd('2026-01-27', '09:00:00');
      
      expect(result).toBe(true);
      expect(minutesLeft).toBe(90); // 1.5 hours remaining
    });

    it('Scenario 5: Afternoon session - book at 14:00 for 12:00 session', () => {
      // Session: 12:00-14:30
      // Current: 14:00 (2 hours into session, 30 min left)
      
      vi.setSystemTime(new Date('2026-01-27T07:00:00Z')); // 14:00 WIB
      
      const result = isTimeSlotBookable('2026-01-27', '12:00:00');
      const minutesLeft = getMinutesUntilSessionEnd('2026-01-27', '12:00:00');
      
      expect(result).toBe(true);
      expect(minutesLeft).toBe(30); // 30 minutes remaining
    });
  });

  describe('Edge cases', () => {
    it('should handle exact session end time', () => {
      // Current time: exactly 20:30 WIB (session end time)
      vi.setSystemTime(new Date('2026-01-27T13:30:00Z')); // 20:30 WIB
      
      const result = isTimeSlotBookable('2026-01-27', '18:00:00');
      
      expect(result).toBe(false); // Exactly at end time = not bookable
    });

    it('should handle 1 minute before session ends', () => {
      // Current time: 20:29 WIB (1 min before session ends)
      vi.setSystemTime(new Date('2026-01-27T13:29:00Z')); // 20:29 WIB
      
      const result = isTimeSlotBookable('2026-01-27', '18:00:00');
      const minutesLeft = getMinutesUntilSessionEnd('2026-01-27', '18:00:00');
      
      expect(result).toBe(true);
      expect(minutesLeft).toBe(1);
    });
  });
});
