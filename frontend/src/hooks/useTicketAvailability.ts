import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toLocalDateString } from '../utils/timezone';
import { APIError } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

export interface Availability {
  id: number;
  date: string;
  time_slot: string | null;
  total_capacity: number;
  reserved_capacity: number;
  sold_capacity: number;
  available_capacity: number;
}

type RawAvailability = {
  id: number;
  date: string;
  time_slot: string | null;
  total_capacity: number;
  reserved_capacity: number;
  sold_capacity: number;
};

export function useTicketAvailability(ticketId: number | null) {
  const enabled = typeof ticketId === 'number' && Number.isFinite(ticketId);

  return useQuery({
    queryKey: enabled ? queryKeys.ticketAvailability(ticketId) : ['ticket-availability', 'invalid'],
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('ticket_availabilities')
        .select('*')
        .abortSignal(signal)
        .eq('ticket_id', ticketId)
        .gte('date', toLocalDateString(new Date()))
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (error) {
        const err = new Error(error.message) as APIError;
        err.status = 500;
        err.info = error;
        throw err;
      }

      return ((data as RawAvailability[] | null) || []).map((avail) => ({
        ...avail,
        available_capacity: avail.total_capacity - avail.reserved_capacity - avail.sold_capacity,
      }));
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30000,
    staleTime: 10000,
  });
}
