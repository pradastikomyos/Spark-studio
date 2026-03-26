import {
  addDays,
  getMinutesUntilSessionEnd,
  isTimeSlotBookable,
  toLocalDateString,
  todayWIB,
} from '../../utils/timezone';
import type { AvailableTimeSlot, CalendarDay, GroupedTimeSlots, TicketAvailability } from './journeySelectionTypes';

export function buildCalendarDays(params: {
  currentDate: Date;
  availabilities: TicketAvailability[];
  today?: Date;
  maxBookingDate?: Date;
}): Array<CalendarDay | null> {
  const { currentDate, availabilities } = params;
  const today = params.today ?? todayWIB();
  const maxBookingDate = params.maxBookingDate ?? addDays(today, 30);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  const days: Array<CalendarDay | null> = [];

  for (let index = 0; index < startingDayOfWeek; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    const isToday = toLocalDateString(date) === toLocalDateString(today);
    const isWithinBookingWindow = date >= today && date <= maxBookingDate;
    const hasAvailability = availabilities.some(
      (availability) => availability.date === toLocalDateString(date) && availability.available_capacity > 0
    );
    const canBook = isWithinBookingWindow && hasAvailability;

    days.push({
      day,
      date,
      isAvailable: canBook,
      isDisabled: !canBook,
      isToday,
    });
  }

  return days;
}

export function buildAvailableTimeSlots(params: {
  selectedDate: Date | null;
  availabilities: TicketAvailability[];
  currentTime: Date;
}): AvailableTimeSlot[] {
  const { selectedDate, availabilities, currentTime } = params;
  if (!selectedDate) return [];

  const dateString = toLocalDateString(selectedDate);
  const isToday = dateString === toLocalDateString(todayWIB());

  return availabilities
    .filter((availability) => {
      const matchesDate = availability.date === dateString;
      const hasCapacity = availability.available_capacity > 0;
      const hasTimeSlot = !!availability.time_slot;
      return matchesDate && hasCapacity && hasTimeSlot;
    })
    .map((availability) => ({
      time: availability.time_slot as string,
      available: availability.available_capacity,
      isPast: isToday && availability.time_slot
        ? !isTimeSlotBookable(dateString, availability.time_slot, currentTime)
        : false,
    }));
}

export function groupAvailableTimeSlots(slots: AvailableTimeSlot[]): GroupedTimeSlots {
  const grouped: GroupedTimeSlots = {
    morning: [],
    afternoon1: [],
    afternoon2: [],
    evening: [],
  };

  slots.forEach((slot) => {
    const hour = Number.parseInt(slot.time.split(':')[0] ?? '0', 10);
    if (hour >= 9 && hour < 12) grouped.morning.push(slot);
    else if (hour >= 12 && hour < 15) grouped.afternoon1.push(slot);
    else if (hour >= 15 && hour < 18) grouped.afternoon2.push(slot);
    else if (hour >= 18) grouped.evening.push(slot);
  });

  return grouped;
}

export function getMinutesUntilCloseForSlot(selectedDate: Date | null, timeSlot: string) {
  if (!selectedDate) return null;
  const dateString = toLocalDateString(selectedDate);
  const isToday = selectedDate.toDateString() === todayWIB().toDateString();
  if (!isToday) return null;
  return getMinutesUntilSessionEnd(dateString, timeSlot);
}

export function getJourneySlotUrgency(minutesUntilClose: number | null): 'none' | 'low' | 'medium' | 'high' {
  if (minutesUntilClose === null || minutesUntilClose > 90) return 'none';
  if (minutesUntilClose > 60) return 'low';
  if (minutesUntilClose > 30) return 'medium';
  return 'high';
}
