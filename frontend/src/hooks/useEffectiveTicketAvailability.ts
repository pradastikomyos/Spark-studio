import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError, createQuerySignal } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';
import type { Availability } from './useTicketAvailability';
import { addDays, toLocalDateString, todayWIB } from '../utils/timezone';

export interface EffectiveAvailability extends Availability {
  id: number;
  ticket_id: number;
  date: string;
  time_slot: string | null;
  total_capacity: number;
  base_total_capacity: number;
  effective_total_capacity: number;
  reserved_capacity: number;
  sold_capacity: number;
  available_capacity: number;
  is_closed: boolean;
  reason: string | null;
}

type RawEffectiveAvailability = {
  id: number | string;
  ticket_id: number | string;
  date: string;
  time_slot: string | null;
  base_total_capacity: number | string;
  effective_total_capacity: number | string;
  reserved_capacity: number | string;
  sold_capacity: number | string;
  available_capacity: number | string;
  is_closed: boolean | null;
  reason: string | null;
};

function toInt(value: unknown) {
  return Math.max(0, Math.floor(Number(value ?? 0)));
}

function normalizeRow(row: RawEffectiveAvailability): EffectiveAvailability {
  return {
    id: Number(row.id),
    ticket_id: Number(row.ticket_id),
    date: row.date,
    time_slot: row.time_slot,
    total_capacity: toInt(row.effective_total_capacity),
    base_total_capacity: toInt(row.base_total_capacity),
    effective_total_capacity: toInt(row.effective_total_capacity),
    reserved_capacity: toInt(row.reserved_capacity),
    sold_capacity: toInt(row.sold_capacity),
    available_capacity: toInt(row.available_capacity),
    is_closed: row.is_closed === true,
    reason: row.reason ?? null,
  };
}

export function useEffectiveTicketAvailability(ticketId: number | null, bookingWindowDays: number | null | undefined) {
  const queryClient = useQueryClient();
  const enabled = typeof ticketId === 'number' && Number.isFinite(ticketId);
  const resolvedTicketId = ticketId ?? 0;
  const today = todayWIB();
  const startDate = toLocalDateString(today);
  const endDate = toLocalDateString(addDays(today, Math.max(1, bookingWindowDays ?? 30)));

  useEffect(() => {
    if (!enabled) return;

    const availabilityChannel = supabase
      .channel(`effective-ticket-availabilities:${resolvedTicketId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_availabilities', filter: `ticket_id=eq.${resolvedTicketId}` },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.effectiveTicketAvailability(resolvedTicketId, startDate, endDate),
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_availability_overrides', filter: `ticket_id=eq.${resolvedTicketId}` },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.effectiveTicketAvailability(resolvedTicketId, startDate, endDate),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(availabilityChannel);
    };
  }, [enabled, endDate, queryClient, resolvedTicketId, startDate]);

  return useQuery({
    queryKey: enabled
      ? queryKeys.effectiveTicketAvailability(resolvedTicketId, startDate, endDate)
      : ['effective-ticket-availability', 'invalid'],
    enabled,
    queryFn: async ({ signal }) => {
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);
      try {
        const rpc = supabase.rpc('list_effective_ticket_availabilities', {
          p_ticket_id: resolvedTicketId,
          p_start_date: startDate,
          p_end_date: endDate,
        });

        const { data, error } = await rpc.abortSignal(timeoutSignal);

        if (error) {
          const err = new Error(error.message) as APIError;
          err.status = 500;
          err.info = error;
          throw err;
        }

        return ((data as RawEffectiveAvailability[] | null) ?? []).map(normalizeRow);
      } catch (error) {
        if (didTimeout()) {
          throw new Error('Request timeout');
        }
        throw error;
      } finally {
        cleanup();
      }
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: enabled ? 2 * 60 * 1000 : false,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });
}
