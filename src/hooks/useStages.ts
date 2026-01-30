import useSWR from 'swr';
import { supabase } from '../lib/supabase';

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
  const key = enabled ? ('stages-with-stats' as const) : null;

  return useSWR<StageWithStats[]>(
    key,
    async () => {
      const [stagesResult, statsResult] = await Promise.all([
        supabase
          .from('stages')
          .select('*')
          .order('id', { ascending: true })
          .abortSignal(AbortSignal.timeout(10000)),
        supabase.rpc('get_stage_scan_stats').abortSignal(AbortSignal.timeout(10000)),
      ]);

      if (stagesResult.error) throw new Error(stagesResult.error.message);
      if (statsResult.error) {
        // Behavior lama: kalau RPC gagal tetap render stages dengan stats = 0
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
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );
}

