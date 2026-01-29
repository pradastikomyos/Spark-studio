import useSWR from 'swr';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { APIError } from '../lib/fetchers';

export type PurchasedTicket = {
  id: string;
  ticket_id: string;
  user_id: string;
  purchase_date: string;
  entry_status: 'entered' | 'not_yet' | 'invalid';
  qr_code: string;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  valid_date: string;
  used_at?: string | null;
  users: {
    name: string;
    email: string;
  };
  tickets: {
    name: string;
  };
};

type PurchasedTicketRow = {
  id: string | number;
  ticket_id: string | number;
  user_id: string;
  created_at: string | null;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  used_at: string | null;
  ticket_code: string;
  valid_date: string;
  tickets: { name: string };
};

type TicketStats = {
  totalValid: number;
  entered: number;
};

export function useTicketsManagement() {
  const swr = useSWR<{ tickets: PurchasedTicket[]; stats: TicketStats }>(
    'tickets-management',
    async () => {
      const { data: ticketsData, error } = await supabase
        .from('purchased_tickets')
        .select(
          `
          id,
          ticket_id,
          user_id,
          created_at,
          status,
          used_at,
          ticket_code,
          valid_date,
          tickets!inner(name)
        `
        )
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        const err = new Error(error.message) as APIError;
        err.status = 500;
        err.info = error;
        throw err;
      }

      const rows = (ticketsData || []) as unknown as PurchasedTicketRow[];
      const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
      const { data: profilesData, error: profilesError } =
        userIds.length > 0
          ? await supabase.from('profiles').select('id, name, email').in('id', userIds)
          : { data: [], error: null };

      if (profilesError) {
        const err = new Error(profilesError.message) as APIError;
        err.status = 500;
        err.info = profilesError;
        throw err;
      }

      const profilesMap = new Map(
        (profilesData || []).map((profile) => [
          String(profile.id),
          { name: String(profile.name || '-'), email: String(profile.email || '-') },
        ])
      );

      const mapped: PurchasedTicket[] = rows.map((row) => {
        const entry_status: PurchasedTicket['entry_status'] =
          row.status === 'used' ? 'entered' : row.status === 'active' ? 'not_yet' : 'invalid';

        return {
          id: String(row.id),
          ticket_id: String(row.ticket_id),
          user_id: String(row.user_id),
          purchase_date: row.created_at || new Date().toISOString(),
          entry_status,
          qr_code: row.ticket_code,
          status: row.status,
          valid_date: row.valid_date,
          used_at: row.used_at,
          users: profilesMap.get(String(row.user_id)) || { name: '-', email: '-' },
          tickets: row.tickets,
        };
      });

      const totalValid = mapped.length;
      const entered = mapped.filter((t) => t.status === 'used').length;

      return { tickets: mapped, stats: { totalValid, entered } };
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
    }
  );

  useEffect(() => {
    const channel = supabase
      .channel('purchased_tickets_admin_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchased_tickets',
        },
        () => {
          swr.mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [swr]);

  return swr;
}
