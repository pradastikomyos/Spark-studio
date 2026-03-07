import type { TicketData } from '../../types';

export interface TicketAvailability {
  date: string;
  time_slot: string | null;
  total_capacity: number;
  reserved_capacity: number;
  sold_capacity: number;
  available_capacity: number;
}

export interface CalendarDay {
  day: number;
  date: Date;
  isAvailable: boolean;
  isDisabled: boolean;
  isToday: boolean;
}

export interface AvailableTimeSlot {
  time: string;
  available: number;
  isPast: boolean;
}

export interface GroupedTimeSlots {
  morning: AvailableTimeSlot[];
  afternoon1: AvailableTimeSlot[];
  afternoon2: AvailableTimeSlot[];
  evening: AvailableTimeSlot[];
}

export interface JourneySelectionController {
  ticket: TicketData | null;
  availabilities: TicketAvailability[];
  loading: boolean;
  currentDate: Date;
  selectedDate: Date | null;
  selectedTime: string | null;
  currentTime: Date;
  calendarDays: Array<CalendarDay | null>;
  availableTimeSlots: AvailableTimeSlot[];
  groupedSlots: GroupedTimeSlots;
  today: Date;
  maxBookingDate: Date;
  canGoPrevMonth: boolean;
  canGoNextMonth: boolean;
  monthName: string;
  setSelectedDate: (date: Date | null) => void;
  setSelectedTime: (time: string | null) => void;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  getMinutesUntilClose: (timeSlot: string) => number | null;
  getSlotUrgency: (timeSlot: string) => 'none' | 'low' | 'medium' | 'high';
}
