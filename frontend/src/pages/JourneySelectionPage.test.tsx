import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import JourneySelectionPage from './JourneySelectionPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

vi.mock('../components/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../hooks/useBookingPageSettings', () => ({
  DEFAULT_BOOKING_PAGE_SETTINGS: {
    journey_title: 'Select Your Journey',
    journey_description: 'Pick a date to see available magical experiences.',
  },
  useBookingPageSettings: () => ({
    settings: null,
  }),
}));

vi.mock('./journey-selection/useJourneySelectionController', () => ({
  useJourneySelectionController: () => ({
    ticket: {
      id: 1,
      slug: 'journey-ticket',
      name: 'Journey Ticket',
      type: 'experience',
      price: '125000',
      description: null,
      available_from: '2026-03-01',
      available_until: '2026-03-31',
      is_active: true,
    },
    availabilities: [],
    loading: false,
    error: null,
    currentDate: new Date('2026-03-07T00:00:00.000Z'),
    selectedDate: new Date('2026-03-08T00:00:00.000Z'),
    selectedTime: '10:00:00',
    calendarDays: [],
    availableTimeSlots: [{ time: '10:00:00', available: 4, isPast: false }],
    groupedSlots: { morning: [], afternoon1: [], afternoon2: [], evening: [] },
    hasBookableDates: true,
    isAllDayTicket: false,
    today: new Date('2026-03-07T00:00:00.000Z'),
    maxBookingDate: new Date('2026-04-06T00:00:00.000Z'),
    canGoPrevMonth: false,
    canGoNextMonth: true,
    monthName: 'March 2026',
    setSelectedDate: vi.fn(),
    setSelectedTime: vi.fn(),
    handlePrevMonth: vi.fn(),
    handleNextMonth: vi.fn(),
    getMinutesUntilClose: vi.fn(),
    getSlotUrgency: vi.fn(() => 'none'),
  }),
}));

vi.mock('./journey-selection/JourneyCalendarSection', () => ({
  JourneyCalendarSection: ({ monthName }: { monthName: string }) => <div>calendar:{monthName}</div>,
}));

vi.mock('./journey-selection/JourneyTimeSlotsSection', () => ({
  JourneyTimeSlotsSection: ({ availableSlotsCount }: { availableSlotsCount: number }) => (
    <div>slots:{availableSlotsCount}</div>
  ),
}));

vi.mock('./journey-selection/JourneySummaryCard', () => ({
  JourneySummaryCard: ({ ticket }: { ticket: { name: string } }) => <div>summary:{ticket.name}</div>,
}));

describe('JourneySelectionPage', () => {
  it('renders modular sections through controller composition', () => {
    render(<JourneySelectionPage />);

    expect(screen.getByText('Select Your Journey')).toBeInTheDocument();
    expect(screen.getByText('calendar:March 2026')).toBeInTheDocument();
    expect(screen.getByText('slots:1')).toBeInTheDocument();
    expect(screen.getByText('summary:Journey Ticket')).toBeInTheDocument();
  });
});
