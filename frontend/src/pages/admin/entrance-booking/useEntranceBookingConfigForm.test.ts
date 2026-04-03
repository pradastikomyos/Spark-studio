import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EntranceTicket } from '../../../hooks/useEntranceTicket';
import type { TicketBookingSettings } from '../../../hooks/useTicketBookingSettings';
import { useEntranceBookingConfigForm } from './useEntranceBookingConfigForm';

const ticket: EntranceTicket = {
  id: 7,
  type: 'entrance',
  name: 'Weekend Pass',
  slug: 'weekend-pass',
  description: null,
  price: '100000',
  available_from: '2026-04-01 00:00:00',
  available_until: '2026-04-30 00:00:00',
  time_slots: ['09:00', '13:00'],
  is_active: true,
};

const bookingSettings: TicketBookingSettings = {
  ticket_id: 7,
  max_tickets_per_booking: 5,
  booking_window_days: 30,
  auto_generate_days_ahead: 60,
  default_slot_capacity: 120,
};

describe('useEntranceBookingConfigForm', () => {
  it('preserves edited config fields while rehydrating untouched settings from refetches', () => {
    const { result, rerender } = renderHook(
      ({ nextTicket, nextSettings }) =>
        useEntranceBookingConfigForm({
          ticket: nextTicket,
          bookingSettings: nextSettings,
          refetchTicket: vi.fn(async () => null),
          refetchSettings: vi.fn(async () => null),
          showToast: vi.fn(),
        }),
      {
        initialProps: {
          nextTicket: ticket,
          nextSettings: bookingSettings,
        },
      }
    );

    act(() => {
      result.current.setTicketForm((current) =>
        current
          ? {
              ...current,
              price: '150000',
            }
          : current
      );
    });

    expect(result.current.hasConfigChanges).toBe(true);

    rerender({
      nextTicket: {
        ...ticket,
        price: '90000',
        available_until: '2026-05-15 00:00:00',
      },
      nextSettings: {
        ...bookingSettings,
        max_tickets_per_booking: 8,
      },
    });

    expect(result.current.ticketForm?.price).toBe('150000');
    expect(result.current.settingsForm?.max_tickets_per_booking).toBe('8');
  });
});
