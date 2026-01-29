import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { supabaseAuthFetcher } from '../lib/fetchers';
import { useEffect } from 'react';

export interface PurchasedTicket {
  id: number;
  ticket_code: string;
  ticket_id: number;
  valid_date: string;
  time_slot: string | null;
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
  status: string;
  created_at: string;
  tickets: {
    name?: string | null;
    type?: string | null;
    description?: string | null;
  } | { name?: string | null; type?: string | null; description?: string | null }[];
};

export function useMyTickets(userId: string | null | undefined) {
  const swr = useSWR<PurchasedTicket[]>(
    userId ? ['my-tickets', userId] : null,
    () =>
      supabaseAuthFetcher<PurchasedTicketRow>(async () =>
        supabase
          .from('purchased_tickets')
          .select(
            `
            id,
            ticket_code,
            ticket_id,
            valid_date,
            time_slot,
            status,
            created_at,
            tickets:ticket_id (
              name,
              type,
              description
            )
          `
          )
          .eq('user_id', userId)
          .order('valid_date', { ascending: true })
      ).then((rows) =>
        rows.map((ticket) => {
          const ticketMeta = Array.isArray(ticket.tickets) ? ticket.tickets[0] : ticket.tickets;
          return {
            id: ticket.id,
            ticket_code: ticket.ticket_code,
            ticket_id: ticket.ticket_id,
            valid_date: ticket.valid_date,
            time_slot: ticket.time_slot,
            status: ticket.status,
            created_at: ticket.created_at,
            ticket: {
              name: ticketMeta?.name || 'Unknown Ticket',
              type: ticketMeta?.type || 'entrance',
              description: ticketMeta?.description || null,
            },
          };
        })
      ),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
    }
  );

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('my_tickets_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchased_tickets', filter: `user_id=eq.${userId}` },
        () => {
          swr.mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [swr, userId]);

  return swr;
}
