import { describe, expect, it } from 'vitest';
import {
  formatQueueCode,
  formatTime,
  getDayPartLabel,
  getSessionRange,
  parseTimeToMinutes,
} from './bookingSuccessFormatters';

describe('bookingSuccessFormatters', () => {
  it('formats time and session ranges', () => {
    expect(formatTime('09:00:00')).toBe('09:00');
    expect(getSessionRange('09:00:00')).toBe('09:00-11:30');
  });

  it('returns null for invalid time input', () => {
    expect(parseTimeToMinutes('abc')).toBeNull();
    expect(getSessionRange(null)).toBeNull();
  });

  it('formats queue code with day part label', () => {
    expect(getDayPartLabel('09:00:00')).toBe('PAGI');
    expect(formatQueueCode('09:00:00', 7)).toBe('PAGI-007');
  });
});
