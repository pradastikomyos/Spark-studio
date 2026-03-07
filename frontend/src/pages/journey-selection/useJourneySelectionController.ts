import { useEffect, useMemo, useState } from 'react';
import { createQuerySignal } from '../../lib/fetchers';
import { supabase } from '../../lib/supabase';
import { addDays, nowWIB, toLocalDateString, todayWIB } from '../../utils/timezone';
import type { TicketData } from '../../types';
import {
  buildAvailableTimeSlots,
  buildCalendarDays,
  getJourneySlotUrgency,
  getMinutesUntilCloseForSlot,
  groupAvailableTimeSlots,
} from './journeySelectionHelpers';
import type { JourneySelectionController, TicketAvailability } from './journeySelectionTypes';

export function useJourneySelectionController(): JourneySelectionController {
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [availabilities, setAvailabilities] = useState<TicketAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(nowWIB());

  useEffect(() => {
    const fetchTicket = async () => {
      const { signal: timeoutSignal, cleanup } = createQuerySignal(undefined, 10000);
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('is_active', true)
          .order('type', { ascending: true })
          .limit(1)
          .abortSignal(timeoutSignal);

        if (error) throw error;
        if (data && data.length > 0) {
          setTicket(data[0]);
        }
      } catch (error) {
        console.error('Error fetching ticket:', error);
      } finally {
        cleanup();
      }
    };

    void fetchTicket();
  }, []);

  useEffect(() => {
    if (!ticket) return;

    const fetchAvailabilities = async () => {
      const { signal: timeoutSignal, cleanup } = createQuerySignal(undefined, 10000);
      try {
        const today = todayWIB();
        const lookaheadEnd = addDays(today, 30);
        const { data, error } = await supabase
          .from('ticket_availabilities')
          .select('*')
          .eq('ticket_id', ticket.id)
          .gte('date', toLocalDateString(today))
          .lte('date', toLocalDateString(lookaheadEnd))
          .order('date', { ascending: true })
          .abortSignal(timeoutSignal);

        if (error) throw error;

        const processed = (data || []).map((row) => ({
          ...row,
          available_capacity: row.total_capacity - row.reserved_capacity - row.sold_capacity,
        }));

        setAvailabilities(processed);
        setSelectedDate(today);
        setCurrentDate(today);
      } catch (error) {
        console.error('Error fetching availabilities:', error);
      } finally {
        cleanup();
        setLoading(false);
      }
    };

    void fetchAvailabilities();
  }, [ticket]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(nowWIB());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const today = todayWIB();
  const maxBookingDate = addDays(today, 30);

  const calendarDays = useMemo(
    () => buildCalendarDays({ currentDate, availabilities, today, maxBookingDate }),
    [availabilities, currentDate, maxBookingDate, today]
  );

  const availableTimeSlots = useMemo(
    () => buildAvailableTimeSlots({ selectedDate, availabilities, currentTime }),
    [availabilities, currentTime, selectedDate]
  );

  const groupedSlots = useMemo(() => groupAvailableTimeSlots(availableTimeSlots), [availableTimeSlots]);

  const canGoPrevMonth = useMemo(() => {
    const lastDayOfPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    return lastDayOfPrevMonth >= today;
  }, [currentDate, today]);

  const canGoNextMonth = useMemo(() => {
    const firstDayOfNextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    return firstDayOfNextMonth <= maxBookingDate;
  }, [currentDate, maxBookingDate]);

  const monthName = useMemo(
    () => currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [currentDate]
  );

  return {
    ticket,
    availabilities,
    loading,
    currentDate,
    selectedDate,
    selectedTime,
    currentTime,
    calendarDays,
    availableTimeSlots,
    groupedSlots,
    today,
    maxBookingDate,
    canGoPrevMonth,
    canGoNextMonth,
    monthName,
    setSelectedDate,
    setSelectedTime,
    handlePrevMonth: () => {
      if (canGoPrevMonth) {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
      }
    },
    handleNextMonth: () => {
      if (canGoNextMonth) {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
      }
    },
    getMinutesUntilClose: (timeSlot: string) => getMinutesUntilCloseForSlot(selectedDate, timeSlot),
    getSlotUrgency: (timeSlot: string) =>
      getJourneySlotUrgency(getMinutesUntilCloseForSlot(selectedDate, timeSlot)),
  };
}
