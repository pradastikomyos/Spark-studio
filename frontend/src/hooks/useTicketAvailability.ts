import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toLocalDateString } from '../utils/timezone';
import { APIError, createQuerySignal } from '../lib/fetchers';
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
  const queryClient = useQueryClient();
  const enabled = typeof ticketId === 'number' && Number.isFinite(ticketId);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`ticket_availabilities:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_availabilities',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.ticketAvailability(ticketId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, ticketId]);

  return useQuery({
    queryKey: enabled ? queryKeys.ticketAvailability(ticketId) : ['ticket-availability', 'invalid'],
    enabled,
    queryFn: async ({ signal }) => {
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);
      try {
        const { data, error } = await supabase
          .from('ticket_availabilities')
          .select('*')
          .abortSignal(timeoutSignal)
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
    // Fallback polling in case realtime disconnects/misses events.
    refetchInterval: enabled ? 2 * 60 * 1000 : false,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });
}
