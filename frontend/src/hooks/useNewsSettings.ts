import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface NewsProduct {
  image: string;
  brand: string;
  name: string;
  price: string;
  link: string;
}

export interface NewsPageSettings {
  id: string;
  section_1_category: string;
  section_1_title: string;
  section_1_excerpt: string;
  section_1_description: string;
  section_1_author: string;
  section_1_image: string;

  section_2_title: string;
  section_2_subtitle1: string;
  section_2_subtitle2: string;
  section_2_quotes: string;
  section_2_image: string;

  section_3_title: string;
  section_3_products: NewsProduct[];
}

export function useNewsSettings() {
  const [settings, setSettings] = useState<NewsPageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('news_page_settings')
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
        setSettings(data as NewsPageSettings);
      }
    } catch (err: any) {
      console.error('Error fetching news page settings:', err);
      setError(err instanceof Error ? err : new Error(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (updates: Partial<NewsPageSettings>) => {
    try {
      setIsLoading(true);
      setError(null);

      let currentId = settings?.id;

      if (!currentId) {
        const { data: newData, error: insertError } = await supabase
          .from('news_page_settings')
          .insert([updates])
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newData as NewsPageSettings);
        return newData;
      }

      const { data, error } = await supabase
        .from('news_page_settings')
        .update(updates)
        .eq('id', currentId)
        .select()
        .single();

      if (error) {
        console.error('Supabase update returned error:', error);
        throw error;
      }
      setSettings(data as NewsPageSettings);
      return data;
    } catch (err: any) {
      console.error('Error updating news page settings:', err);
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
