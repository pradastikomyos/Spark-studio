import { useEffect, useMemo, useRef } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { createQuerySignal } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

export type StageAnalyticsTimeFilter = 'weekly' | 'monthly' | 'all';

export type StageAnalyticsData = {
  id: number;
  code: string;
  name: string;
  zone: string | null;
  total_scans: number;
  period_scans: number;
  period_change: number;
};

function getPeriodLabel(filter: StageAnalyticsTimeFilter) {
  switch (filter) {
    case 'weekly':
      return 'week';
    case 'monthly':
      return 'month';
    case 'all':
      return 'all time';
    default:
      return 'period';
  }
}

type StageAnalyticsSummaryRow = {
  stage_id: number;
  stage_code: string;
  stage_name: string;
  stage_zone: string | null;
  total_scans: number | string | null;
  period_scans: number | string | null;
  prev_period_scans: number | string | null;
};

type UseStageAnalyticsOptions = {
  enabled?: boolean;
};

/**
 * Admin hook for Stage Analytics.
 * - Uses SWR caching + revalidation
 * - Revalidates automatically on `stage_scans` realtime changes
 */
export function useStageAnalytics(timeFilter: StageAnalyticsTimeFilter, options?: UseStageAnalyticsOptions) {
  const enabled = options?.enabled ?? true;
  const periodLabel = useMemo(() => getPeriodLabel(timeFilter), [timeFilter]);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.stageAnalytics(timeFilter),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);
      try {
        const { data, error } = await supabase
          .rpc('get_stage_analytics_summary', { p_time_filter: timeFilter })
          .abortSignal(timeoutSignal);

        if (error) throw new Error(error.message);

        const stagesWithAnalytics: StageAnalyticsData[] = ((data || []) as StageAnalyticsSummaryRow[]).map((row) => {
          const totalScans = Number(row.total_scans) || 0;
          const periodScans = Number(row.period_scans) || 0;
          const prevPeriodScans = Number(row.prev_period_scans) || 0;
          const change =
            prevPeriodScans > 0 ? Math.round(((periodScans - prevPeriodScans) / prevPeriodScans) * 100) : periodScans > 0 ? 100 : 0;

          return {
            id: row.stage_id,
            code: row.stage_code,
            name: row.stage_name,
            zone: row.stage_zone,
            total_scans: totalScans,
            period_scans: periodScans,
            period_change: timeFilter === 'all' ? 0 : change,
          };
        });

        stagesWithAnalytics.sort((a, b) => b.period_scans - a.period_scans);
        return stagesWithAnalytics;
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
    staleTime: 5000,
  });

  // Realtime revalidate on stage_scans changes (debounced)
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('stage_scans_analytics_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stage_scans' },
        () => {
          if (debounceRef.current) window.clearTimeout(debounceRef.current);
          debounceRef.current = window.setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.stageAnalytics(timeFilter) });
          }, 500);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, timeFilter]);

  return {
    ...query,
    periodLabel,
  };
}
