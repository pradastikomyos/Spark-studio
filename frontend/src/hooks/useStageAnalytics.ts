import { useEffect, useMemo, useRef } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { safeCountQuery } from '../utils/queryHelpers';
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

function getRanges(filter: StageAnalyticsTimeFilter) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const spanDays = filter === 'monthly' ? 30 : filter === 'weekly' ? 7 : 0;

  if (spanDays === 0) {
    return {
      label: getPeriodLabel(filter),
      currentStart: new Date(0),
      prevStart: null as Date | null,
      prevEnd: null as Date | null,
    };
  }

  const currentStart = new Date(now - spanDays * dayMs);
  const prevStart = new Date(now - spanDays * 2 * dayMs);
  const prevEnd = currentStart;

  return {
    label: getPeriodLabel(filter),
    currentStart,
    prevStart,
    prevEnd,
  };
}

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
  const ranges = useMemo(() => getRanges(timeFilter), [timeFilter]);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.stageAnalytics(timeFilter),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const timeout = AbortSignal.timeout(10000);
      const combined = typeof (AbortSignal as unknown as { any?: unknown }).any === 'function'
        ? (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any([signal, timeout])
        : signal;

      const { data: stagesData, error: stagesError } = await supabase
        .from('stages')
        .select('id, code, name, zone')
        .order('id', { ascending: true })
        .abortSignal(combined);

      if (stagesError) throw new Error(stagesError.message);

      const stages = stagesData || [];

      const stagesWithAnalytics: StageAnalyticsData[] = await Promise.all(
        stages.map(async (stage) => {
          // Total scans (all time)
          const totalScans = await safeCountQuery(
            async () => {
              const result = await supabase
                .from('stage_scans')
                .select('*', { count: 'exact', head: true })
                .eq('stage_id', stage.id)
                .abortSignal(AbortSignal.timeout(8000));
              return result;
            },
            8000
          );

          // Period scans (weekly / monthly / all)
          const periodScans =
            timeFilter === 'all'
              ? totalScans
              : await safeCountQuery(
                  async () => {
                    const result = await supabase
                      .from('stage_scans')
                      .select('*', { count: 'exact', head: true })
                      .eq('stage_id', stage.id)
                      .gte('scanned_at', ranges.currentStart.toISOString())
                      .abortSignal(AbortSignal.timeout(8000));
                    return result;
                  },
                  8000
                );

          // Previous period scans (only when comparing weekly/monthly)
          const prevPeriodScans =
            !ranges.prevStart || !ranges.prevEnd
              ? 0
              : await safeCountQuery(
                  async () => {
                    const result = await supabase
                      .from('stage_scans')
                      .select('*', { count: 'exact', head: true })
                      .eq('stage_id', stage.id)
                      .gte('scanned_at', ranges.prevStart!.toISOString())
                      .lt('scanned_at', ranges.prevEnd!.toISOString())
                      .abortSignal(AbortSignal.timeout(8000));
                    return result;
                  },
                  8000
                );

          const prev = prevPeriodScans || 0;
          const current = periodScans || 0;
          const change =
            prev > 0 ? Math.round(((current - prev) / prev) * 100) : current > 0 ? 100 : 0;

          return {
            id: stage.id,
            code: stage.code,
            name: stage.name,
            zone: stage.zone,
            total_scans: totalScans,
            period_scans: periodScans,
            period_change: timeFilter === 'all' ? 0 : change,
          };
        })
      );

      stagesWithAnalytics.sort((a, b) => b.period_scans - a.period_scans);
      return stagesWithAnalytics;
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
    periodLabel: ranges.label,
  };
}
