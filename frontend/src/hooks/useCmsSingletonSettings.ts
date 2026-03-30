import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useCmsSingletonSettings<T extends { id: string }>(params: {
  table: string;
  defaultId: string;
  normalize: (data: Record<string, unknown>) => T;
  errorLabel: string;
}) {
  const { table, defaultId, normalize, errorLabel } = params;
  const [settings, setSettings] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from(table as never)
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setSettings(null);
          return;
        }
        throw fetchError;
      }

      setSettings(normalize(data as Record<string, unknown>));
    } catch (err: unknown) {
      console.error(`Error fetching ${errorLabel}:`, err);
      setError(err instanceof Error ? err : new Error(`Failed to fetch ${errorLabel}`));
    } finally {
      setIsLoading(false);
    }
  }, [errorLabel, normalize, table]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<T>) => {
      try {
        setIsLoading(true);
        setError(null);

        if (!settings?.id || settings.id === defaultId) {
          const { data, error: insertError } = await supabase
            .from(table as never)
            .insert([updates])
            .select()
            .single();

          if (insertError) throw insertError;

          const normalized = normalize(data as Record<string, unknown>);
          setSettings(normalized);
          return normalized;
        }

        const { data, error: updateError } = await supabase
          .from(table as never)
          .update(updates)
          .eq('id', settings.id)
          .select()
          .single();

        if (updateError) throw updateError;

        const normalized = normalize(data as Record<string, unknown>);
        setSettings(normalized);
        return normalized;
      } catch (err: unknown) {
        console.error(`Error updating ${errorLabel}:`, err);
        setError(err instanceof Error ? err : new Error(`Failed to update ${errorLabel}`));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [defaultId, errorLabel, normalize, settings?.id, table]
  );

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    refetch: fetchSettings,
  };
}
