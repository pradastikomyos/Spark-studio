import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError, createQuerySignal } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

export interface EntranceTicket {
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

function normalizeTimeSlots(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((slot) => String(slot).trim()).filter(Boolean);
  }
  return [];
}

function normalizeTicket(row: Record<string, unknown>): EntranceTicket {
  return {
    id: Number(row.id),
    type: String(row.type ?? ''),
    name: String(row.name ?? ''),
    slug: String(row.slug ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    price: String(row.price ?? '0'),
    available_from: String(row.available_from ?? ''),
    available_until: String(row.available_until ?? ''),
    time_slots: normalizeTimeSlots(row.time_slots),
    is_active: row.is_active !== false,
  };
}

export function useEntranceTicket(scope: 'public' | 'admin' = 'public') {
  return useQuery({
    queryKey: queryKeys.entranceTicket(scope),
    queryFn: async ({ signal }) => {
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);
      try {
        let query = supabase
          .from('tickets')
          .select('*')
          .abortSignal(timeoutSignal)
          .eq('type', 'entrance')
          .order('id', { ascending: true })
          .limit(1);

        if (scope === 'public') {
          query = query.eq('is_active', true);
        }

        const { data, error } = await query.maybeSingle();

        if (error || !data) {
          const err = new Error(error?.message || 'Entrance ticket not found') as APIError;
          err.status = error?.code === 'PGRST116' ? 404 : 500;
          err.info = error;
          throw err;
        }

        return normalizeTicket(data as Record<string, unknown>);
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
    staleTime: 30000,
  });
}
