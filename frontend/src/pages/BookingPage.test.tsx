import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookingPage from './BookingPage';
import { useTickets } from '../hooks/useTickets';
import { useTicketAvailability } from '../hooks/useTicketAvailability';

const mockNavigate = vi.fn();
const mockSetQueryData = vi.fn();
const mockShowToast = vi.fn();

vi.mock('../hooks/useTickets', () => ({
  useTickets: vi.fn(),
}));

vi.mock('../hooks/useTicketAvailability', () => ({
  useTicketAvailability: vi.fn(),
}));

vi.mock('../hooks/useBookingPageSettings', () => ({
  DEFAULT_BOOKING_PAGE_SETTINGS: {
    reserve_title: 'Reserve Your Session',
    reserve_description: 'Secure your spot. Select your preferred date and time to begin your experience.',
    calendar_title: 'Select Date',
    time_slots_title: 'Available Time Slots',
    access_type_title: 'Access Type',
    all_day_access_label: 'All Day Access',
    all_day_access_helper: '(Valid entire day)',
    choose_specific_time_label: 'Or choose specific time',
    empty_slots_message: 'No available time slots for this date',
    booking_summary_title: 'Booking Summary',
    ticket_type_label: 'Ticket Type',
    date_label: 'Date',
    time_label: 'Time',
    not_selected_label: 'Not selected',
    all_day_access_value_label: 'All Day Access',
    quantity_label: 'How Many?',
    max_tickets_label_template: 'Max {count} per booking',
    total_label: 'Total',
    proceed_button_label: 'Proceed to Payment',
    secure_checkout_label: 'Secure Encrypted Checkout',
    important_info_title: 'Important Info',
    important_info_items: [
      'Please arrive 15 minutes before your slot.',
      'Ticket is valid only for selected date and time.',
      'Tiket tidak dapat di-refund atau di-reschedule.',
    ],
  },
  useBookingPageSettings: () => ({
    settings: null,
  }),
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      setQueryData: mockSetQueryData,
    }),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: 'spark-ticket' }),
  };
});

const baseTicket = {
  id: 1,
  type: 'entrance',
  name: 'Spark Pass',
  slug: 'spark-ticket',
  description: 'Premium pass',
  price: '50000',
  available_from: '2026-02-01',
  available_until: '2026-02-28',
  time_slots: ['09:00'],
  is_active: true,
};

describe('BookingPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T00:10:00Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('proceeds with all-day access when available', () => {
    vi.mocked(useTickets).mockReturnValue({
      data: baseTicket,
      error: null,
      isLoading: false,
    } as never);
    vi.mocked(useTicketAvailability).mockReturnValue({
      data: [
        {
          id: 1,
          date: '2026-02-01',
          time_slot: null,
          total_capacity: 10,
          reserved_capacity: 0,
          sold_capacity: 0,
          available_capacity: 10,
        },
      ],
      error: null,
      isLoading: false,
    } as never);

    render(
      <MemoryRouter>
        <BookingPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Proceed to Payment/i }));

    expect(mockSetQueryData).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      '/payment',
      expect.objectContaining({
        state: expect.objectContaining({
          ticketId: 1,
          quantity: 1,
          time: 'all-day',
        }),
      })
    );
  });

  it('shows urgency confirmation before navigating for high-urgency slots', () => {
    vi.setSystemTime(new Date('2026-02-01T04:10:00Z'));
    vi.mocked(useTickets).mockReturnValue({
      data: baseTicket,
      error: null,
      isLoading: false,
    } as never);
    vi.mocked(useTicketAvailability).mockReturnValue({
      data: [
        {
          id: 2,
          date: '2026-02-01',
          time_slot: '09:00:00',
          total_capacity: 10,
          reserved_capacity: 0,
          sold_capacity: 0,
          available_capacity: 3,
        },
      ],
      error: null,
      isLoading: false,
    } as never);

    render(
      <MemoryRouter>
        <BookingPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /09:00/i }));
    fireEvent.click(screen.getByRole('button', { name: /Proceed to Payment/i }));

    expect(screen.getByText('Session Ending Soon!')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /I Understand, Continue/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/payment',
      expect.objectContaining({
        state: expect.objectContaining({
          time: '09:00:00',
        }),
      })
    );
  });
});
