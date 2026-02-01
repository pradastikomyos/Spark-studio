import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';

export type StageQRCode = {
  id: number;
  code: string;
  name: string;
  status: 'active' | 'maintenance' | 'inactive';
  today_scans: number;
};

type StageScanStatsRow = {
  stage_id: number;
  total_scans: number | string | null;
  today_scans: number | string | null;
};

type UseStageQRCodesOptions = {
  enabled?: boolean;
};

/**
 * Admin hook untuk memuat daftar stage untuk kebutuhan QR bulk + statistik scan hari ini.
 * - 2 query paralel (stages + RPC stats)
 * - SWR caching + revalidation
 * - Revalidate otomatis saat ada perubahan realtime di `stage_scans`
 */
export function useStageQRCodes(options?: UseStageQRCodesOptions) {
  const enabled = options?.enabled ?? true;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.stageQrCodes(),
    enabled,
    queryFn: async ({ signal }) => {
      const timeout = AbortSignal.timeout(10000);
      const combined = typeof (AbortSignal as unknown as { any?: unknown }).any === 'function'
        ? (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any([signal, timeout])
        : signal;

      const [stagesResult, statsResult] = await Promise.all([
        supabase
          .from('stages')
          .select('id, code, name, status')
          .order('id', { ascending: true })
          .abortSignal(combined),
        supabase.rpc('get_stage_scan_stats').abortSignal(combined),
      ]);

      if (stagesResult.error) throw new Error(stagesResult.error.message);
      if (statsResult.error) {
        // Fallback: tetap render stages dengan today_scans = 0
        console.warn('RPC get_stage_scan_stats gagal, fallback ke today_scans=0:', statsResult.error);
      }

      const statsMap = new Map<number, { today_scans: number }>();
      const statsRows = (statsResult.data || []) as unknown as StageScanStatsRow[];
      for (const stat of statsRows) {
        statsMap.set(stat.stage_id, {
          today_scans: Number(stat.today_scans) || 0,
        });
      }

      const stages = (stagesResult.data || []) as unknown as Array<{
        id: number;
        code: string;
        name: string;
        status: 'active' | 'maintenance' | 'inactive';
      }>;

      return stages.map((stage) => ({
        ...stage,
        today_scans: statsMap.get(stage.id)?.today_scans ?? 0,
      }));
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5000,
  });

  // Realtime revalidate on stage_scans changes (debounced)
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    const channel = supabase
      .channel('stage_scans_qr_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stage_scans' }, () => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.stageQrCodes() });
        }, 500);
      })
      .subscribe();

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  return query;
}
