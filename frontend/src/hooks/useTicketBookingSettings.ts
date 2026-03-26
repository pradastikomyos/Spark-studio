import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError, createQuerySignal } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

export interface TicketBookingSettings {
  ticket_id: number;
  max_tickets_per_booking: number;
  booking_window_days: number;
  auto_generate_days_ahead: number;
  default_slot_capacity: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export const DEFAULT_TICKET_BOOKING_SETTINGS: TicketBookingSettings = {
  ticket_id: 0,
  max_tickets_per_booking: 5,
  booking_window_days: 30,
  auto_generate_days_ahead: 60,
  default_slot_capacity: 100,
  created_at: null,
  updated_at: null,
};

function normalizeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSettings(ticketId: number, row: Record<string, unknown> | null | undefined): TicketBookingSettings {
  if (!row) {
    return {
      ...DEFAULT_TICKET_BOOKING_SETTINGS,
      ticket_id: ticketId,
    };
  }

  return {
    ticket_id: ticketId,
    max_tickets_per_booking: normalizeNumber(
      row.max_tickets_per_booking,
      DEFAULT_TICKET_BOOKING_SETTINGS.max_tickets_per_booking
    ),
    booking_window_days: normalizeNumber(row.booking_window_days, DEFAULT_TICKET_BOOKING_SETTINGS.booking_window_days),
    auto_generate_days_ahead: Math.max(
      0,
      Number(row.auto_generate_days_ahead ?? DEFAULT_TICKET_BOOKING_SETTINGS.auto_generate_days_ahead)
    ),
    default_slot_capacity: normalizeNumber(
      row.default_slot_capacity,
      DEFAULT_TICKET_BOOKING_SETTINGS.default_slot_capacity
    ),
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

export function useTicketBookingSettings(ticketId: number | null) {
  const enabled = typeof ticketId === 'number' && Number.isFinite(ticketId);
  const resolvedTicketId = ticketId ?? 0;

  return useQuery({
    queryKey: enabled ? queryKeys.ticketBookingSettings(resolvedTicketId) : ['ticket-booking-settings', 'invalid'],
    enabled,
    queryFn: async ({ signal }) => {
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);
      try {
        const { data, error } = await supabase
          .from('ticket_booking_settings')
          .select('*')
          .abortSignal(timeoutSignal)
          .eq('ticket_id', resolvedTicketId)
          .maybeSingle();

        if (error) {
          const err = new Error(error.message) as APIError;
          err.status = 500;
          err.info = error;
          throw err;
        }

        return normalizeSettings(resolvedTicketId, (data as Record<string, unknown> | null) ?? null);
      } catch (error) {
        if (didTimeout()) {
          throw new Error('Request timeout');
        }
        throw error;
      } finally {
        cleanup();
      }
    },
    staleTime: 30000,
  });
}
