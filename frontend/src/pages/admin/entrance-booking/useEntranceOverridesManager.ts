import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { createEmptyOverrideForm, validateOverrideForm } from './entranceBookingHelpers';
import type { OverrideFormState, OverrideRow } from './entranceBookingTypes';

type UseEntranceOverridesManagerArgs = {
  ticketId: number | null | undefined;
  showToast: (type: 'success' | 'error', message: string) => void;
};

export function useEntranceOverridesManager({ ticketId, showToast }: UseEntranceOverridesManagerArgs) {
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [overrideForm, setOverrideForm] = useState<OverrideFormState>(createEmptyOverrideForm);
  const [savingOverride, setSavingOverride] = useState(false);
  const [deletingOverrideId, setDeletingOverrideId] = useState<number | null>(null);

  const loadOverrides = useCallback(async () => {
    if (!ticketId) return;

    setOverridesLoading(true);
    const { data, error } = await supabase
      .from('ticket_availability_overrides')
      .select('id, date, time_slot, is_closed, capacity_override, reason')
      .eq('ticket_id', ticketId)
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true });

    if (error) {
      showToast('error', error.message || 'Failed to load availability overrides');
      setOverridesLoading(false);
      return;
    }

    setOverrides(((data as OverrideRow[] | null) ?? []).map((row) => ({
      ...row,
      reason: row.reason ?? null,
    })));
    setOverridesLoading(false);
  }, [showToast, ticketId]);

  useEffect(() => {
    void loadOverrides();
  }, [loadOverrides]);

  const resetOverrideForm = useCallback(() => {
    setOverrideForm(createEmptyOverrideForm());
  }, []);

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
    if (!ticketId) return;

    setSavingOverride(true);
    try {
      const validated = validateOverrideForm(overrideForm);
      const payload = {
        ticket_id: ticketId,
        ...validated,
      };

      const query = overrideForm.id
        ? supabase.from('ticket_availability_overrides').update(payload).eq('id', overrideForm.id)
        : supabase.from('ticket_availability_overrides').insert(payload);

      const { error } = await query;
      if (error) throw error;

      await loadOverrides();
      resetOverrideForm();
      showToast('success', overrideForm.id ? 'Override updated' : 'Override created');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to save override');
    } finally {
      setSavingOverride(false);
    }
  }, [loadOverrides, overrideForm, resetOverrideForm, showToast, ticketId]);

  const handleDeleteOverride = useCallback(async (overrideId: number) => {
    setDeletingOverrideId(overrideId);
    try {
      const { error } = await supabase.from('ticket_availability_overrides').delete().eq('id', overrideId);
      if (error) throw error;
      await loadOverrides();
      if (overrideForm.id === overrideId) {
        resetOverrideForm();
      }
      showToast('success', 'Override deleted');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to delete override');
    } finally {
      setDeletingOverrideId(null);
    }
  }, [loadOverrides, overrideForm.id, resetOverrideForm, showToast]);

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
