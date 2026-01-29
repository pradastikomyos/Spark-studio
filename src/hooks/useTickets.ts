import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { APIError } from '../lib/fetchers';

export interface Ticket {
  id: number;
  type: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  available_from: string;
  available_until: string;
  time_slots: string[];
  is_active: boolean;
}

export function useTickets(slug: string | undefined) {
  return useSWR<Ticket | null>(
    slug ? ['ticket', slug] : null,
    async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        const err = new Error(error?.message || 'Ticket not found') as APIError;
        err.status = error?.code === 'PGRST116' ? 404 : 500;
        err.info = error;
        throw err;
      }

      return data as Ticket;
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
    }
  );
}
