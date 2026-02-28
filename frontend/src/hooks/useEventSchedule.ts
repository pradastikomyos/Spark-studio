import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { createQuerySignal } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

export type EventScheduleCategory = 'Workshop' | 'Seminar' | 'Masterclass' | 'Exhibition' | string;

export interface EventScheduleItem {
  id: number;
  title: string;
  description: string;
  event_date: string; // YYYY-MM-DD
  time_label: string;
  category: EventScheduleCategory;
  image_url: string | null;
  image_path: string | null;
  image_bucket: string | null;
  placeholder_icon: string | null;
  is_coming_soon: boolean;
  button_text: string;
  button_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

async function fetchEventSchedule(includeInactive: boolean, signal?: AbortSignal): Promise<EventScheduleItem[]> {
  let query = supabase
    .from('events_schedule_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('event_date', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = signal ? await query.abortSignal(signal) : await query;
  if (error) throw error;
  return (data || []) as EventScheduleItem[];
}

export function useEventSchedule(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;
  return useQuery({
    queryKey: queryKeys.eventSchedule(includeInactive ? 'admin' : 'public'),
    queryFn: async ({ signal }) => {
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);
      try {
        return await fetchEventSchedule(includeInactive, timeoutSignal);
      } catch (error) {
        if (didTimeout()) {
          throw new Error('Request timeout');
        }
        throw error;
      } finally {
        cleanup();
      }
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
