import { describe, expect, it, vi } from 'vitest';
import type { TicketAvailability } from './journeySelectionTypes';
import {
  buildAvailableTimeSlots,
  buildCalendarDays,
  getJourneySlotUrgency,
  groupAvailableTimeSlots,
} from './journeySelectionHelpers';

const availabilities: TicketAvailability[] = [
  {
    date: '2026-03-07',
    time_slot: '10:00:00',
    total_capacity: 10,
    reserved_capacity: 2,
    sold_capacity: 3,
    available_capacity: 5,
  },
  {
    date: '2026-03-07',
    time_slot: '16:00:00',
    total_capacity: 10,
    reserved_capacity: 1,
    sold_capacity: 1,
    available_capacity: 8,
  },
];

describe('journeySelectionHelpers', () => {
  it('builds calendar days with availability gating', () => {
    const result = buildCalendarDays({
      currentDate: new Date('2026-03-01T00:00:00.000Z'),
      availabilities,
      today: new Date('2026-03-01T00:00:00.000Z'),
      maxBookingDate: new Date('2026-03-31T00:00:00.000Z'),
    });

    const seventh = result.find((day) => day && day.day === 7);
    expect(seventh?.isAvailable).toBe(true);
  });

  it('filters available time slots and groups periods', () => {
    vi.setSystemTime(new Date('2026-03-07T09:00:00.000Z'));

    const slots = buildAvailableTimeSlots({
      selectedDate: new Date('2026-03-07T00:00:00.000Z'),
      availabilities,
      currentTime: new Date('2026-03-07T09:00:00.000Z'),
    });
    const grouped = groupAvailableTimeSlots(slots);

    expect(slots).toHaveLength(2);
    expect(grouped.morning).toHaveLength(1);
    expect(grouped.afternoon2).toHaveLength(1);
  });

  it('maps urgency thresholds predictably', () => {
    expect(getJourneySlotUrgency(null)).toBe('none');
    expect(getJourneySlotUrgency(70)).toBe('low');
    expect(getJourneySlotUrgency(45)).toBe('medium');
    expect(getJourneySlotUrgency(20)).toBe('high');
  });
});
