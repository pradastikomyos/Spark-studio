import { useMemo } from 'react';
import { useEffectiveTicketAvailability } from '../../hooks/useEffectiveTicketAvailability';
import { useEntranceTicket } from '../../hooks/useEntranceTicket';
import { useTicketBookingSettings } from '../../hooks/useTicketBookingSettings';
import { useBookingSelectionState } from '../booking/useBookingSelectionState';
import type { JourneySelectionController } from './journeySelectionTypes';

export function useJourneySelectionController(): JourneySelectionController {
  const { data: ticket, error: ticketError, isLoading: ticketLoading } = useEntranceTicket('public');
  const {
    data: bookingSettings,
    error: settingsError,
    isLoading: settingsLoading,
  } = useTicketBookingSettings(ticket?.id ?? null);
  const {
    data: availabilities = [],
    error: availabilityError,
    isLoading: availabilityLoading,
  } = useEffectiveTicketAvailability(ticket?.id ?? null, bookingSettings?.booking_window_days);

  const selection = useBookingSelectionState({
    ticket,
    availabilities,
    max_tickets_per_booking: bookingSettings?.max_tickets_per_booking,
    booking_window_days: bookingSettings?.booking_window_days,
  });

  const error = useMemo(() => {
    const candidate = ticketError || settingsError || availabilityError;
    return candidate instanceof Error ? candidate : null;
  }, [availabilityError, settingsError, ticketError]);

  return {
    ticket: ticket ?? null,
    availabilities,
    loading: ticketLoading || settingsLoading || availabilityLoading,
    error,
    currentDate: selection.currentDate,
    selectedDate: selection.selectedDate,
    selectedTime: selection.selectedTime,
    calendarDays: selection.calendarDays,
    availableTimeSlots: selection.availableTimeSlots,
    groupedSlots: selection.groupedSlots,
    hasBookableDates: selection.hasBookableDates,
    isAllDayTicket: selection.isAllDayTicket,
    today: selection.today,
    maxBookingDate: selection.maxBookingDate,
    canGoPrevMonth: selection.canGoPrevMonth,
    canGoNextMonth: selection.canGoNextMonth,
    monthName: selection.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    setSelectedDate: (date) => {
      if (!date) return;
      selection.handleSelectDate(date);
    },
    setSelectedTime: selection.setSelectedTime,
    handlePrevMonth: selection.handlePrevMonth,
    handleNextMonth: selection.handleNextMonth,
    getMinutesUntilClose: selection.getMinutesUntilClose,
    getSlotUrgency: selection.getSlotUrgency,
  };
}
