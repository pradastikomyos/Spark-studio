import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { createEmptyOverrideForm, validateOverrideForm } from './entranceBookingHelpers';
import type { OverrideFormState, OverrideRow } from './entranceBookingTypes';

type UseEntranceOverridesManagerArgs = {
  ticketId: number | null | undefined;
  showToast: (type: 'success' | 'error', message: string) => void;
};

const OVERRIDE_SELECT = 'id, date, time_slot, is_closed, capacity_override, reason';

const normalizeOverrideRow = (row: OverrideRow): OverrideRow => ({
  ...row,
  reason: row.reason ?? null,
});

const sortOverrides = (rows: OverrideRow[]) =>
  rows
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date) || (left.time_slot ?? '').localeCompare(right.time_slot ?? ''));

export function useEntranceOverridesManager({ ticketId, showToast }: UseEntranceOverridesManagerArgs) {
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [overrideForm, setOverrideForm] = useState<OverrideFormState>(createEmptyOverrideForm);
  const [savingOverride, setSavingOverride] = useState(false);
  const [deletingOverrideId, setDeletingOverrideId] = useState<number | null>(null);
  const loadRequestIdRef = useRef(0);

  const resetOverrideForm = useCallback(() => {
    setOverrideForm(createEmptyOverrideForm());
  }, []);

  const loadOverrides = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    if (!ticketId) {
      setOverrides([]);
      setOverridesLoading(false);
      return;
    }

    setOverridesLoading(true);
    const { data, error } = await supabase
      .from('ticket_availability_overrides')
      .select(OVERRIDE_SELECT)
      .eq('ticket_id', ticketId)
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true });

    if (loadRequestIdRef.current !== requestId) return;

    if (error) {
      showToast('error', error.message || 'Failed to load availability overrides');
      setOverridesLoading(false);
      return;
    }

    setOverrides(sortOverrides(((data as OverrideRow[] | null) ?? []).map(normalizeOverrideRow)));
    setOverridesLoading(false);
  }, [showToast, ticketId]);

  useEffect(() => {
    if (!ticketId) {
      loadRequestIdRef.current += 1;
      setOverrides([]);
      setOverridesLoading(false);
      resetOverrideForm();
      return;
    }
    void loadOverrides();
  }, [loadOverrides, resetOverrideForm, ticketId]);

  const handleEditOverride = useCallback((override: OverrideRow) => {
    setOverrideForm({
      id: override.id,
      date: override.date,
      time_slot: override.time_slot ? override.time_slot.slice(0, 5) : '',
      is_closed: override.is_closed,
      capacity_override: override.capacity_override != null ? String(override.capacity_override) : '',
      reason: override.reason ?? '',
    });
  }, []);

  const handleSaveOverride = useCallback(async () => {
    if (!ticketId || savingOverride) return;

    setSavingOverride(true);
    try {
      const validated = validateOverrideForm(overrideForm);
      const payload = {
        ticket_id: ticketId,
        ...validated,
      };

      const query = overrideForm.id
        ? supabase.from('ticket_availability_overrides').update(payload).eq('id', overrideForm.id).select(OVERRIDE_SELECT).single()
        : supabase.from('ticket_availability_overrides').insert(payload).select(OVERRIDE_SELECT).single();

      const { data, error } = await query;
      if (error) throw error;
      if (!data) throw new Error('Override response is empty');

      const nextOverride = normalizeOverrideRow(data as OverrideRow);
      setOverrides((current) => {
        const remaining = current.filter((override) => override.id !== nextOverride.id);
        return sortOverrides([...remaining, nextOverride]);
      });

      resetOverrideForm();
      showToast('success', overrideForm.id ? 'Override updated' : 'Override created');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to save override');
    } finally {
      setSavingOverride(false);
    }
  }, [overrideForm, resetOverrideForm, savingOverride, showToast, ticketId]);

  const handleDeleteOverride = useCallback(async (overrideId: number) => {
    if (deletingOverrideId != null) return;
    setDeletingOverrideId(overrideId);
    try {
      const { error } = await supabase.from('ticket_availability_overrides').delete().eq('id', overrideId);
      if (error) throw error;
      setOverrides((current) => current.filter((override) => override.id !== overrideId));
      if (overrideForm.id === overrideId) {
        resetOverrideForm();
      }
      showToast('success', 'Override deleted');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to delete override');
    } finally {
      setDeletingOverrideId(null);
    }
  }, [deletingOverrideId, overrideForm.id, resetOverrideForm, showToast]);

  return {
    overridesLoading,
    overrides,
    overrideForm,
    setOverrideForm,
    savingOverride,
    deletingOverrideId,
    resetOverrideForm,
    handleEditOverride,
    handleSaveOverride,
    handleDeleteOverride,
  };
}
