import type { Availability } from '../../hooks/useTicketAvailability';

export type CalendarDay = {
  day: number;
  date: Date;
  isAvailable: boolean;
  isDisabled: boolean;
  isToday: boolean;
};

export type BookableSlotViewModel = {
  time: string;
  available: number;
  isPast: boolean;
};

export type GroupedBookableSlots = {
  morning: BookableSlotViewModel[];
  afternoon1: BookableSlotViewModel[];
  afternoon2: BookableSlotViewModel[];
  evening: BookableSlotViewModel[];
};

export type BookingSelectionStateParams = {
  ticket: {
    available_from: string;
    available_until: string;
  } | null | undefined;
  availabilities: Availability[];
};
