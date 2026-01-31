import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { toLocalDateString } from '../utils/timezone';
import { APIError } from '../lib/fetchers';

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
  return useSWR<Availability[]>(
    ticketId ? ['ticket-availability', ticketId] : null,
    async () => {
      const { data, error } = await supabase
        .from('ticket_availabilities')
        .select('*')
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
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000,
      dedupingInterval: 10000,
    }
  );
}
