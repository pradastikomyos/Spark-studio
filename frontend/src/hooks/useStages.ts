import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { createQuerySignal } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

export type StageRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  zone: string | null;
  max_occupancy: number;
  status: 'active' | 'maintenance' | 'inactive';
  qr_code_url: string | null;
  created_at: string;
  updated_at: string;
};

export type StageWithStats = StageRow & {
  total_scans: number;
  today_scans: number;
};

type StageScanStatsRow = {
  stage_id: number;
  total_scans: number | string | null;
  today_scans: number | string | null;
};

type UseStagesOptions = {
  enabled?: boolean;
};

/**
 * Admin hook untuk memuat daftar stage + statistik scan (total & hari ini).
 * - 2 query paralel (stages + RPC stats)
 * - SWR caching + revalidation
 */
export function useStages(options?: UseStagesOptions) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: queryKeys.stages(),
    enabled,
    queryFn: async ({ signal }) => {
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);
      try {
        const [stagesResult, statsResult] = await Promise.all([
          supabase.from('stages').select('*').order('id', { ascending: true }).abortSignal(timeoutSignal),
          supabase.rpc('get_stage_scan_stats').abortSignal(timeoutSignal),
        ]);

        if (stagesResult.error) throw new Error(stagesResult.error.message);
        if (statsResult.error) {
          console.warn('RPC get_stage_scan_stats gagal, fallback ke stats=0:', statsResult.error);
        }

        const statsMap = new Map<number, { total_scans: number; today_scans: number }>();
        const statsRows = (statsResult.data || []) as unknown as StageScanStatsRow[];
        for (const stat of statsRows) {
          statsMap.set(stat.stage_id, {
            total_scans: Number(stat.total_scans) || 0,
            today_scans: Number(stat.today_scans) || 0,
          });
        }

        const stages = (stagesResult.data || []) as unknown as StageRow[];
        return stages.map((stage) => ({
          ...stage,
          total_scans: statsMap.get(stage.id)?.total_scans ?? 0,
          today_scans: statsMap.get(stage.id)?.today_scans ?? 0,
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
    refetchOnReconnect: true,
    staleTime: 5000,
  });
}

export function useCreateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newStage: Omit<StageRow, 'id' | 'created_at' | 'updated_at' | 'qr_code_url'>) => {
      const { data, error } = await supabase.from('stages').insert(newStage).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stages() });
    },
  });
}

export function useUpdateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StageRow> & { id: number }) => {
      const { data, error } = await supabase.from('stages').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stages() });
    },
  });
}

export function useDeleteStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('stages').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stages() });
    },
  });
}
