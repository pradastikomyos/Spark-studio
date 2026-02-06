import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { supabaseAuthFetcher, createQuerySignal } from '../lib/fetchers';
import { useEffect } from 'react';
import { queryKeys } from '../lib/queryKeys';

export interface PurchasedTicket {
  id: number;
  ticket_code: string;
  ticket_id: number;
  valid_date: string;
  time_slot: string | null;
  queue_number: number | null;
  queue_overflow: boolean;
  status: string;
  created_at: string;
  ticket: {
    name: string;
    type: string;
    description: string | null;
  };
}

type PurchasedTicketRow = {
  id: number;
  ticket_code: string;
  ticket_id: number;
  valid_date: string;
  time_slot: string | null;
  queue_number: number | null;
  queue_overflow: boolean | null;
  status: string;
  created_at: string;
  tickets: {
    name?: string | null;
    type?: string | null;
    description?: string | null;
  } | { name?: string | null; type?: string | null; description?: string | null }[];
};

export function useMyTickets(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  const enabled = typeof userId === 'string' && userId.length > 0;

  const query = useQuery({
    queryKey: enabled ? queryKeys.myTickets(userId) : ['my-tickets', 'invalid'],
    enabled,
    queryFn: async ({ signal }) => {
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);
      try {
        const rows = await supabaseAuthFetcher<PurchasedTicketRow>(async (sig) =>
          supabase
            .from('purchased_tickets')
            .select(
              `
              id,
              ticket_code,
              ticket_id,
              valid_date,
              time_slot,
              queue_number,
              queue_overflow,
              status,
              created_at,
              tickets:ticket_id (
                name,
                type,
                description
              )
            `
            )
            .abortSignal(sig ?? timeoutSignal)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        , timeoutSignal);
        return rows.map((ticket) => {
          const ticketMeta = Array.isArray(ticket.tickets) ? ticket.tickets[0] : ticket.tickets;
          return {
            id: ticket.id,
            ticket_code: ticket.ticket_code,
            ticket_id: ticket.ticket_id,
            valid_date: ticket.valid_date,
            time_slot: ticket.time_slot,
            queue_number: ticket.queue_number ?? null,
            queue_overflow: ticket.queue_overflow ?? false,
            status: ticket.status,
            created_at: ticket.created_at,
            ticket: {
              name: ticketMeta?.name || 'Unknown Ticket',
              type: ticketMeta?.type || 'entrance',
              description: ticketMeta?.description || null,
            },
          };
        });
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
    staleTime: 0,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('my_tickets_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchased_tickets', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.myTickets(userId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  return query;
}
