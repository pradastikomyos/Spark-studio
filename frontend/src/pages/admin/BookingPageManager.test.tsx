import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingPageManager from './BookingPageManager';

const updateSettingsMock = vi.fn().mockResolvedValue(undefined);

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: vi.fn(),
  }),
}));

vi.mock('../../components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('../../components/AdminLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../hooks/useBookingPageSettings', () => ({
  DEFAULT_BOOKING_PAGE_SETTINGS: {
    id: 'default-booking-page-settings',
    journey_title: 'Select Your Journey',
    journey_description: 'Pick a date to see available magical experiences.',
    reserve_title: 'Reserve Your Session',
    reserve_description: 'Secure your spot.',
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
    ticket_price_label: 'Ticket Price',
    vat_included_label: '(VAT included)',
    total_label: 'Total',
    proceed_button_label: 'Proceed to Payment',
    secure_checkout_label: 'Secure Encrypted Checkout',
    important_info_title: 'Important Info',
    important_info_items: ['Please arrive 15 minutes before your slot.'],
  },
  useBookingPageSettings: () => ({
    settings: null,
    isLoading: false,
    updateSettings: updateSettingsMock,
  }),
}));

describe('BookingPageManager', () => {
  it('renders booking cms sections', () => {
    render(<BookingPageManager />);

    expect(screen.getByText('Journey Section')).toBeInTheDocument();
    expect(screen.getByText('Booking Page Hero')).toBeInTheDocument();
    expect(screen.getByText('Booking Summary')).toBeInTheDocument();
    expect(screen.getByText('Save booking page')).toBeInTheDocument();
  });

  it('saves updated journey copy and important info items', async () => {
    const user = userEvent.setup();
    updateSettingsMock.mockClear();

    render(<BookingPageManager />);

    await user.clear(screen.getByDisplayValue('Select Your Journey'));
    await user.type(screen.getByLabelText(/Journey Title/i), 'Pick Your Spark Journey');
    await user.click(screen.getByText('Tambah Poin'));
    await user.type(screen.getByLabelText('Important Info Item 2'), 'Bring your booking confirmation.');

    await user.click(screen.getByText('Save booking page'));

    await waitFor(() => {
      expect(updateSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          journey_title: 'Pick Your Spark Journey',
          important_info_items: expect.arrayContaining([
            'Please arrive 15 minutes before your slot.',
            'Bring your booking confirmation.',
          ]),
        })
      );
    });
  });
});
