import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

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
  const enabled = typeof slug === 'string' && slug.length > 0;

  return useQuery({
    queryKey: enabled ? queryKeys.ticket(slug) : ['ticket', 'invalid'],
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .abortSignal(signal)
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
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });
}
