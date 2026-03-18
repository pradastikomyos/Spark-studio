import { useEffect, useState } from 'react';
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

export const DEFAULT_NEWS_PAGE_SETTINGS: NewsPageSettings = {
  id: 'default-news-page-settings',
  section_1_category: 'FASHION',
  section_1_title: 'HOW TO DRESS LIKE A STAR - GIRL?',
  section_1_excerpt: 'FROM FEATHER TOPS TO SAINT LAURENT HAND BAGS.',
  section_1_description:
    "They're the ysl girlies, with black nails and smokey eyes, glitter lovers. Usually spotted in Upper East Side leaving a party or listening to the weeknd. Learn everything about their lifestyle.",
  section_1_author: 'By Amélie Schiffer',
  section_1_image: '',
  section_2_title: 'SHE A COLD-HEARTED\nB!TCH WITH NO SHAME',
  section_2_subtitle1: 'Escape from LA',
  section_2_subtitle2: '(THE WEEKEND)',
  section_2_quotes: "SHE GOT\n*CHROME .. HEARTS*\nHANGIN' FROM HER NECK",
  section_2_image: '',
  section_3_title: 'HER ESSENTIALS !',
  section_3_products: [],
};

function normalizeProducts(value: unknown): NewsProduct[] {
  if (!Array.isArray(value)) return DEFAULT_NEWS_PAGE_SETTINGS.section_3_products;

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      return {
        image: typeof record.image === 'string' ? record.image : '',
        brand: typeof record.brand === 'string' ? record.brand : '',
        name: typeof record.name === 'string' ? record.name : '',
        price: typeof record.price === 'string' ? record.price : '',
        link: typeof record.link === 'string' ? record.link : '',
      };
    })
    .filter((entry): entry is NewsProduct => entry !== null);
}

function normalizeSettings(data: Record<string, unknown>): NewsPageSettings {
  return {
    id: typeof data.id === 'string' ? data.id : DEFAULT_NEWS_PAGE_SETTINGS.id,
    section_1_category:
      typeof data.section_1_category === 'string' && data.section_1_category.trim() !== ''
        ? data.section_1_category
        : DEFAULT_NEWS_PAGE_SETTINGS.section_1_category,
    section_1_title:
      typeof data.section_1_title === 'string' && data.section_1_title.trim() !== ''
        ? data.section_1_title
        : DEFAULT_NEWS_PAGE_SETTINGS.section_1_title,
    section_1_excerpt:
      typeof data.section_1_excerpt === 'string' && data.section_1_excerpt.trim() !== ''
        ? data.section_1_excerpt
        : DEFAULT_NEWS_PAGE_SETTINGS.section_1_excerpt,
    section_1_description:
      typeof data.section_1_description === 'string' && data.section_1_description.trim() !== ''
        ? data.section_1_description
        : DEFAULT_NEWS_PAGE_SETTINGS.section_1_description,
    section_1_author:
      typeof data.section_1_author === 'string' && data.section_1_author.trim() !== ''
        ? data.section_1_author
        : DEFAULT_NEWS_PAGE_SETTINGS.section_1_author,
    section_1_image: typeof data.section_1_image === 'string' ? data.section_1_image : DEFAULT_NEWS_PAGE_SETTINGS.section_1_image,
    section_2_title:
      typeof data.section_2_title === 'string' && data.section_2_title.trim() !== ''
        ? data.section_2_title
        : DEFAULT_NEWS_PAGE_SETTINGS.section_2_title,
    section_2_subtitle1:
      typeof data.section_2_subtitle1 === 'string' && data.section_2_subtitle1.trim() !== ''
        ? data.section_2_subtitle1
        : DEFAULT_NEWS_PAGE_SETTINGS.section_2_subtitle1,
    section_2_subtitle2:
      typeof data.section_2_subtitle2 === 'string' && data.section_2_subtitle2.trim() !== ''
        ? data.section_2_subtitle2
        : DEFAULT_NEWS_PAGE_SETTINGS.section_2_subtitle2,
    section_2_quotes:
      typeof data.section_2_quotes === 'string' && data.section_2_quotes.trim() !== ''
        ? data.section_2_quotes
        : DEFAULT_NEWS_PAGE_SETTINGS.section_2_quotes,
    section_2_image: typeof data.section_2_image === 'string' ? data.section_2_image : DEFAULT_NEWS_PAGE_SETTINGS.section_2_image,
    section_3_title:
      typeof data.section_3_title === 'string' && data.section_3_title.trim() !== ''
        ? data.section_3_title
        : DEFAULT_NEWS_PAGE_SETTINGS.section_3_title,
    section_3_products: normalizeProducts(data.section_3_products),
  };
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
        setSettings(normalizeSettings(data as Record<string, unknown>));
      }
    } catch (err: unknown) {
      console.error('Error fetching news page settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch news page settings'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const updateSettings = async (updates: Partial<NewsPageSettings>) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!settings?.id || settings.id === DEFAULT_NEWS_PAGE_SETTINGS.id) {
        const { data: newData, error: insertError } = await supabase
          .from('news_page_settings')
          .insert([updates])
          .select()
          .single();

        if (insertError) throw insertError;
        const normalized = normalizeSettings(newData as Record<string, unknown>);
        setSettings(normalized);
        return normalized;
      }

      const { data, error } = await supabase
        .from('news_page_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      const normalized = normalizeSettings(data as Record<string, unknown>);
      setSettings(normalized);
      return normalized;
    } catch (err: unknown) {
      console.error('Error updating news page settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to update news page settings'));
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
