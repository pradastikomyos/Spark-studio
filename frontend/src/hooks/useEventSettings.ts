import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ExperienceLink {
  title: string;
  subtitle: string;
  link: string;
}

export interface EventPageSettings {
  id: string;
  hero_images: string[];
  magic_title: string;
  magic_description: string;
  magic_button_text: string;
  magic_button_link: string;
  magic_images: string[];
  experience_title: string;
  experience_images: string[];
  experience_links: ExperienceLink[];
}

export function useEventSettings() {
  const [settings, setSettings] = useState<EventPageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('event_page_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // PGRST116 means zero rows returned
        if (error.code === 'PGRST116') {
          // It's possible the default row hasn't been created or fetched properly
          setSettings(null);
        } else {
          throw error;
        }
      } else {
        setSettings(data as EventPageSettings);
      }
    } catch (err: any) {
      console.error('Error fetching event page settings:', err);
      setError(err instanceof Error ? err : new Error(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (updates: Partial<EventPageSettings>) => {
    try {
      setIsLoading(true);
      setError(null);

      let currentId = settings?.id;

      // If no settings exist yet, we insert first instead of throwing
      if (!currentId) {
        const { data: newData, error: insertError } = await supabase
          .from('event_page_settings')
          .insert([updates])
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newData as EventPageSettings);
        return newData;
      }

      // Perform update if we have an ID
      const { data, error } = await supabase
        .from('event_page_settings')
        .update(updates)
        .eq('id', currentId)
        .select()
        .single();

      if (error) {
        console.error('Supabase update returned error:', error);
        throw error;
      }
      setSettings(data as EventPageSettings);
      return data;
    } catch (err: any) {
      console.error('Error updating event page settings in try/catch:', err);
      setError(err instanceof Error ? err : new Error(err.message));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    refetch: fetchSettings
  };
}
