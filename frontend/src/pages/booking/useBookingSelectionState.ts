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

const MAX_TICKETS = 5;

export function useBookingSelectionState(params: BookingSelectionStateParams) {
  const { ticket, availabilities } = params;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [currentTime, setCurrentTime] = useState(nowWIB());
  const [showUrgencyModal, setShowUrgencyModal] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    const today = todayWIB();
    setSelectedDate(today);
    setCurrentDate(today);
  }, [ticket]);

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
  const maxBookingDate = useMemo(() => addDays(today, 30), [today]);

  const calendarDays = useMemo<(CalendarDay | null)[]>(() => {
    if (!ticket) return [];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const extractDateOnly = (value: string) => value.split('T')[0].split(' ')[0];
    const ticketFromDate = extractDateOnly(ticket.available_from);
    const ticketUntilDate = extractDateOnly(ticket.available_until);

    const maxAvailabilityDate = availabilities.reduce<string>(
      (max, avail) => (avail.date > max ? avail.date : max),
      ''
    );

    const effectiveUntilDate =
      maxAvailabilityDate && maxAvailabilityDate > ticketUntilDate ? maxAvailabilityDate : ticketUntilDate;

    const availableFrom = createWIBDate(ticketFromDate);
    const availableUntil = createWIBDate(effectiveUntilDate, '23:59:59');

    const days: (CalendarDay | null)[] = [];

    for (let index = 0; index < startingDayOfWeek; index += 1) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);

      const isToday = toLocalDateString(date) === toLocalDateString(today);
      const isWithinBookingWindow = date >= today && date <= maxBookingDate;
      const isAvailable = isWithinBookingWindow && date >= availableFrom && date <= availableUntil;
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
  }, [ticket, currentDate, availabilities, today, maxBookingDate]);

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
    maxTickets: MAX_TICKETS,
    showUrgencyModal,
    calendarDays,
    availableTimeSlots,
    groupedSlots,
    isAllDayTicket,
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
