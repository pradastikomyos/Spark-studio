import { supabase } from '../../../lib/supabase';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EntranceTicket } from '../../../hooks/useEntranceTicket';
import type { TicketBookingSettings } from '../../../hooks/useTicketBookingSettings';
import { useEntranceBookingConfigForm } from './useEntranceBookingConfigForm';

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => {
      throw new Error('Unexpected client-side mutation');
    }),
    rpc: vi.fn(),
  },
}));

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

  it('saves entrance booking config through a single atomic rpc', async () => {
    const refetchTicket = vi.fn(async () => null);
    const refetchSettings = vi.fn(async () => null);
    const showToast = vi.fn();

    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: {
        saved: true,
      },
      error: null,
    } as any);

    const { result } = renderHook(() =>
      useEntranceBookingConfigForm({
        ticket,
        bookingSettings,
        refetchTicket,
        refetchSettings,
        showToast,
      })
    );

    await act(async () => {
      await result.current.handleSaveConfig();
    });

    expect(vi.mocked(supabase.from)).not.toHaveBeenCalled();
    expect(vi.mocked(supabase.rpc)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(supabase.rpc)).toHaveBeenCalledWith(
      'save_entrance_booking_config',
      expect.objectContaining({
        p_ticket_id: 7,
        p_is_active: true,
        p_price: 100000,
        p_available_from: '2026-04-01',
        p_available_until: '2026-04-30',
        p_time_slots: ['09:00', '13:00'],
        p_max_tickets_per_booking: 5,
        p_booking_window_days: 30,
        p_auto_generate_days_ahead: 60,
        p_default_slot_capacity: 120,
      })
    );
    expect(refetchTicket).toHaveBeenCalledTimes(1);
    expect(refetchSettings).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('success', 'Entrance booking settings saved');
  });
});
