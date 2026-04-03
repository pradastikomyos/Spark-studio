import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import { supabase } from '../../../lib/supabase';
import type { AvailabilityActionMode } from './entranceBookingTypes';

type UseEntranceAvailabilityActionsArgs = {
  ticketId: number | null | undefined;
  showToast: (type: 'success' | 'error', message: string) => void;
};

export function useEntranceAvailabilityActions({ ticketId, showToast }: UseEntranceAvailabilityActionsArgs) {
  const [startDate, setStartDateState] = useState('');
  const [endDate, setEndDateState] = useState('');
  const [runningAction, setRunningAction] = useState<AvailabilityActionMode | null>(null);
  const [actionSummary, setActionSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketId) {
      setRunningAction(null);
    }
    setActionSummary(null);
  }, [ticketId]);

  const setStartDate = useCallback((value: SetStateAction<string>) => {
    setActionSummary(null);
    setStartDateState((current) => (typeof value === 'function' ? value(current) : value));
  }, []);

  const setEndDate = useCallback((value: SetStateAction<string>) => {
    setActionSummary(null);
    setEndDateState((current) => (typeof value === 'function' ? value(current) : value));
  }, []);

  const handleAvailabilityAction = useCallback(async (mode: AvailabilityActionMode) => {
    if (!ticketId) {
      showToast('error', 'Entrance ticket is unavailable');
      return;
    }
    if (runningAction) return;
    if (!startDate || !endDate) {
      showToast('error', 'Select a start and end date first');
      return;
    }
    if (startDate > endDate) {
      showToast('error', 'Start date must be before end date');
      return;
    }

    setRunningAction(mode);
    setActionSummary(null);
    try {
      if (mode === 'generate') {
        const { data, error } = await supabase.rpc('generate_ticket_availability', {
          p_start_date: startDate,
          p_end_date: endDate,
          p_ticket_id: ticketId,
        });

        if (error) throw error;
        const insertedCount = Number(data ?? 0);
        const message =
          insertedCount > 0
            ? `Generated ${insertedCount} new availability rows`
            : 'No new availability rows were needed for that range';
        setActionSummary(message);
        showToast('success', message);
        return;
      }

      const { data, error } = await supabase.rpc('regenerate_ticket_availability', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_ticket_id: ticketId,
      });

      if (error) throw error;

      const summary = data as {
        inserted?: number;
        updated?: number;
        deleted?: number;
        skipped_locked?: number;
      } | null;
      const message = `Regenerated range: inserted ${summary?.inserted ?? 0}, updated ${summary?.updated ?? 0}, deleted ${summary?.deleted ?? 0}, skipped ${summary?.skipped_locked ?? 0}`;
      setActionSummary(message);
      showToast('success', message);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Availability action failed');
    } finally {
      setRunningAction(null);
    }
  }, [endDate, runningAction, showToast, startDate, ticketId]);

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    runningAction,
    actionSummary,
    handleAvailabilityAction,
  };
}
