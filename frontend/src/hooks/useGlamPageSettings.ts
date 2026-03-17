import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const GLAM_ASSET_BASE = '/images/glam%20page%20assets';

export interface GlamPageSettings {
  id: string;
  hero_title: string;
  hero_description: string;
  hero_image_url: string;
  look_heading: string;
  look_model_image_url: string;
  product_section_title: string;
  product_search_placeholder: string;
}

export const DEFAULT_GLAM_PAGE_SETTINGS: GlamPageSettings = {
  id: 'default-glam-page-settings',
  hero_title: 'Glam Makeup',
  hero_description:
    'Craft a luminous signature look with Spark\'s curated glam direction, polished textures, and camera-ready finishing touches for every close-up.',
  hero_image_url: `${GLAM_ASSET_BASE}/VISUAL%201.png`,
  look_heading: 'Get The Look',
  look_model_image_url: `${GLAM_ASSET_BASE}/ChatGPT_Image_10_Mar_2026__21.13.39-removebg-preview.png`,
  product_section_title: 'Charm Bar',
  product_search_placeholder: 'Search products...',
};

export function useGlamPageSettings() {
  const [settings, setSettings] = useState<GlamPageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('glam_page_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setSettings(null);
        } else {
          throw error;
        }
      } else {
        setSettings(data as GlamPageSettings);
      }
    } catch (err: unknown) {
      console.error('Error fetching glam page settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch glam page settings'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const updateSettings = async (updates: Partial<GlamPageSettings>) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!settings?.id || settings.id === DEFAULT_GLAM_PAGE_SETTINGS.id) {
        const { data: newData, error: insertError } = await supabase
          .from('glam_page_settings')
          .insert([updates])
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newData as GlamPageSettings);
        return newData;
      }

      const { data, error } = await supabase
        .from('glam_page_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      setSettings(data as GlamPageSettings);
      return data;
    } catch (err: unknown) {
      console.error('Error updating glam page settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to update glam page settings'));
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
    refetch: fetchSettings,
  };
}
