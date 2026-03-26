import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  createWIBDate,
  getMinutesUntilSessionEnd,
  isTimeSlotBookable,
  nowWIB,
  toLocalDateString,
  todayWIB,
} from '../../utils/timezone';
import type {
  BookingSelectionStateParams,
  BookableSlotViewModel,
  CalendarDay,
  GroupedBookableSlots,
} from './bookingTypes';

const DEFAULT_MAX_TICKETS = 5;
const DEFAULT_BOOKING_WINDOW_DAYS = 30;

export function useBookingSelectionState(params: BookingSelectionStateParams) {
  const { ticket, availabilities } = params;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [currentTime, setCurrentTime] = useState(nowWIB());
  const [showUrgencyModal, setShowUrgencyModal] = useState(false);
  const maxTickets = Math.max(1, Math.floor(params.max_tickets_per_booking ?? DEFAULT_MAX_TICKETS));
  const bookingWindowDays = Math.max(1, Math.floor(params.booking_window_days ?? DEFAULT_BOOKING_WINDOW_DAYS));

  useEffect(() => {
    if (!ticket) return;
    const today = todayWIB();
    setSelectedDate(null);
    setCurrentDate(today);
  }, [ticket]);

  useEffect(() => {
    setQuantity((previous) => Math.min(maxTickets, Math.max(1, previous)));
  }, [maxTickets]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(nowWIB());
      console.log('[BookingPage] Current time updated:', nowWIB().toISOString());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setCurrentTime(nowWIB());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const today = useMemo(() => createWIBDate(toLocalDateString(currentTime)), [currentTime]);
  const maxBookingDate = useMemo(() => addDays(today, bookingWindowDays), [bookingWindowDays, today]);
  const extractDateOnly = (value: string) => value.split('T')[0].split(' ')[0];

  const availabilityWindow = useMemo(() => {
    if (!ticket) return null;

    const ticketFromDate = extractDateOnly(ticket.available_from);
    const ticketUntilDate = extractDateOnly(ticket.available_until);
    const maxAvailabilityDate = availabilities.reduce<string>(
      (max, avail) => (avail.date > max ? avail.date : max),
      ''
    );

    const effectiveUntilDate =
      maxAvailabilityDate && maxAvailabilityDate > ticketUntilDate ? maxAvailabilityDate : ticketUntilDate;

    return {
      availableFrom: createWIBDate(ticketFromDate),
      availableUntil: createWIBDate(effectiveUntilDate, '23:59:59'),
    };
  }, [ticket, availabilities]);

  const hasBookableDates = useMemo(() => {
    if (!availabilityWindow) return false;

    return availabilities.some((avail) => {
      if (avail.available_capacity <= 0) return false;
      const date = createWIBDate(avail.date);
      return (
        date >= today &&
        date <= maxBookingDate &&
        date >= availabilityWindow.availableFrom &&
        date <= availabilityWindow.availableUntil
      );
    });
  }, [availabilityWindow, availabilities, maxBookingDate, today]);

  const firstBookableDate = useMemo(() => {
    if (!availabilityWindow) return null;

    const nextDate = availabilities
      .filter((avail) => avail.available_capacity > 0)
      .map((avail) => avail.date)
      .sort()
      .find((dateString) => {
        const date = createWIBDate(dateString);
        return (
          date >= today &&
          date <= maxBookingDate &&
          date >= availabilityWindow.availableFrom &&
          date <= availabilityWindow.availableUntil
        );
      });

    return nextDate ? createWIBDate(nextDate) : null;
  }, [availabilityWindow, availabilities, maxBookingDate, today]);

  const isDateBookable = (date: Date) => {
    if (!availabilityWindow) return false;

    const dateString = toLocalDateString(date);
    const normalizedDate = createWIBDate(dateString);
    const isWithinBookingWindow = normalizedDate >= today && normalizedDate <= maxBookingDate;
    const isWithinTicketWindow =
      normalizedDate >= availabilityWindow.availableFrom && normalizedDate <= availabilityWindow.availableUntil;
    const hasAvailability = availabilities.some(
      (avail) => avail.date === dateString && avail.available_capacity > 0
    );

    return isWithinBookingWindow && isWithinTicketWindow && hasAvailability;
  };

  const selectedDateIsBookable = selectedDate ? isDateBookable(selectedDate) : false;

  useEffect(() => {
    if (!ticket) return;

    setSelectedDate((previous) => {
      if (previous && isDateBookable(previous)) {
        return previous;
      }

      return firstBookableDate;
    });

    if (!firstBookableDate) return;

    setCurrentDate((previous) => {
      if (selectedDateIsBookable) {
        return previous;
      }

      const sameMonth =
        previous.getFullYear() === firstBookableDate.getFullYear() &&
        previous.getMonth() === firstBookableDate.getMonth();

      return sameMonth ? previous : firstBookableDate;
    });
  }, [
    availabilityWindow,
    availabilities,
    firstBookableDate,
    maxBookingDate,
    selectedDateIsBookable,
    ticket,
    today,
  ]);

  const calendarDays = useMemo<(CalendarDay | null)[]>(() => {
    if (!ticket || !availabilityWindow) return [];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (CalendarDay | null)[] = [];

    for (let index = 0; index < startingDayOfWeek; index += 1) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);

      const isToday = toLocalDateString(date) === toLocalDateString(today);
      const isWithinBookingWindow = date >= today && date <= maxBookingDate;
      const isAvailable =
        isWithinBookingWindow &&
        date >= availabilityWindow.availableFrom &&
        date <= availabilityWindow.availableUntil;
      const hasAvailability = availabilities.some(
        (avail) => avail.date === toLocalDateString(date) && avail.available_capacity > 0
      );
      const canBook = isAvailable && hasAvailability;

      days.push({
        day,
        date,
        isAvailable: canBook,
        isDisabled: !canBook,
        isToday,
      });
    }

    return days;
  }, [ticket, availabilityWindow, currentDate, availabilities, today, maxBookingDate]);

  const availableTimeSlots = useMemo<BookableSlotViewModel[]>(() => {
    if (!selectedDate) return [];

    const dateString = toLocalDateString(selectedDate);
    const isToday = dateString === toLocalDateString(todayWIB());

    const filtered = availabilities.filter((avail) => {
      const matchesDate = avail.date === dateString;
      const hasCapacity = avail.available_capacity > 0;
      const hasTimeSlot = !!avail.time_slot;

      return matchesDate && hasCapacity && hasTimeSlot;
    });

    console.log(`[BookingPage] Available slots for ${dateString} at ${currentTime.toISOString()}:`, filtered.length);

    return filtered.map((avail) => {
      const isPast = isToday && avail.time_slot ? !isTimeSlotBookable(dateString, avail.time_slot) : false;

      if (isPast) {
        console.log(`[BookingPage] Marking slot ${avail.time_slot} as past/disabled: session has ended`);
      }

      return {
        time: avail.time_slot as string,
        available: avail.available_capacity,
        isPast,
      };
    });
  }, [selectedDate, availabilities, currentTime]);

  const getMinutesUntilClose = (timeSlot: string): number | null => {
    if (!selectedDate) return null;

    const dateString = toLocalDateString(selectedDate);
    const isToday = selectedDate.toDateString() === todayWIB().toDateString();

    if (!isToday) return null;

    return getMinutesUntilSessionEnd(dateString, timeSlot);
  };

  const getSlotUrgency = (timeSlot: string): 'none' | 'low' | 'medium' | 'high' => {
    const minutes = getMinutesUntilClose(timeSlot);
    if (minutes === null || minutes > 90) return 'none';
    if (minutes > 60) return 'low';
    if (minutes > 30) return 'medium';
    return 'high';
  };

  const isAllDayTicket = useMemo(() => {
    if (!selectedDate) return false;
    const dateString = toLocalDateString(selectedDate);
    return availabilities.some(
      (avail) => avail.date === dateString && avail.available_capacity > 0 && !avail.time_slot
    );
  }, [selectedDate, availabilities]);

  const groupedSlots = useMemo<GroupedBookableSlots>(() => {
    const grouped: GroupedBookableSlots = {
      morning: [],
      afternoon1: [],
      afternoon2: [],
      evening: [],
    };

    availableTimeSlots.forEach((slot) => {
      if (!slot.time) return;
      const hour = parseInt(slot.time.split(':')[0], 10);
      if (hour >= 9 && hour < 12) grouped.morning.push(slot);
      else if (hour >= 12 && hour < 15) grouped.afternoon1.push(slot);
      else if (hour >= 15 && hour < 18) grouped.afternoon2.push(slot);
      else if (hour >= 18) grouped.evening.push(slot);
    });

    return grouped;
  }, [availableTimeSlots]);

  const canGoPrevMonth = useMemo(() => {
    const lastDayOfPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    return lastDayOfPrevMonth >= today;
  }, [currentDate, today]);

  const canGoNextMonth = useMemo(() => {
    const firstDayOfNextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    return firstDayOfNextMonth <= maxBookingDate;
  }, [currentDate, maxBookingDate]);

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (!canGoNextMonth) return;
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  return {
    currentDate,
    selectedDate,
    selectedTime,
    quantity,
    maxTickets,
    showUrgencyModal,
    calendarDays,
    availableTimeSlots,
    groupedSlots,
    isAllDayTicket,
    hasBookableDates,
    today,
    maxBookingDate,
    canGoPrevMonth,
    canGoNextMonth,
    getMinutesUntilClose,
    getSlotUrgency,
    setSelectedTime,
    setQuantity,
    setShowUrgencyModal,
    handlePrevMonth,
    handleNextMonth,
    handleSelectDate,
  };
}
