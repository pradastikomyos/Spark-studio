import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeSectionFontMap, type SectionFontConfig } from '../lib/cmsTypography';

const GLAM_ASSET_BASE = '/images/glam%20page%20assets';

export interface GlamSectionFonts {
  hero: SectionFontConfig;
  look: SectionFontConfig;
  products: SectionFontConfig;
}

export interface GlamPageSettings {
  id: string;
  hero_title: string;
  hero_description: string;
  hero_image_url: string;
  look_heading: string;
  look_model_image_url: string;
  look_star_links: GlamStarLink[];
  product_section_title: string;
  product_search_placeholder: string;
  section_fonts: GlamSectionFonts;
}

export interface GlamStarLink {
  slot: string;
  product_id: number | null;
  image_url: string | null;
}

export const DEFAULT_GLAM_PAGE_SETTINGS: GlamPageSettings = {
  id: 'default-glam-page-settings',
  hero_title: 'Glam Makeup',
  hero_description:
    'Craft a luminous signature look with Spark\'s curated glam direction, polished textures, and camera-ready finishing touches for every close-up.',
  hero_image_url: `${GLAM_ASSET_BASE}/VISUAL%201.png`,
  look_heading: 'Get The Look',
  look_model_image_url: `${GLAM_ASSET_BASE}/ChatGPT_Image_10_Mar_2026__21.13.39-removebg-preview.png`,
  look_star_links: [
    { slot: 'pink-rush', product_id: null, image_url: null },
    { slot: 'silver-blink', product_id: null, image_url: null },
    { slot: 'bronze', product_id: null, image_url: null },
    { slot: 'aura-pop', product_id: null, image_url: null },
  ],
  product_section_title: 'Charm Bar',
  product_search_placeholder: 'Search products...',
  section_fonts: {
    hero: { heading: 'great_vibes', body: 'nunito_sans' },
    look: { heading: 'great_vibes', body: 'nunito_sans' },
    products: { heading: 'cardo', body: 'nunito_sans' },
  },
};

function normalizeStarLinks(value: unknown): GlamStarLink[] {
  if (!Array.isArray(value)) return DEFAULT_GLAM_PAGE_SETTINGS.look_star_links;

  const parsed = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const slot = typeof record.slot === 'string' ? record.slot : null;
      const productId =
        typeof record.product_id === 'number'
          ? record.product_id
          : typeof record.product_id === 'string' && record.product_id.trim() !== ''
            ? Number(record.product_id)
            : null;
      const imageUrl = typeof record.image_url === 'string' && record.image_url.trim() !== '' ? record.image_url : null;

      if (!slot) return null;
      return {
        slot,
        product_id: Number.isFinite(productId) ? Number(productId) : null,
        image_url: imageUrl,
      };
    })
    .filter((entry): entry is GlamStarLink => entry !== null);

  if (parsed.length === 0) return DEFAULT_GLAM_PAGE_SETTINGS.look_star_links;
  return parsed;
}

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
        const raw = data as Record<string, unknown>;
        setSettings({
          ...(data as GlamPageSettings),
          look_star_links: normalizeStarLinks(raw.look_star_links),
          section_fonts: normalizeSectionFontMap(raw.section_fonts, DEFAULT_GLAM_PAGE_SETTINGS.section_fonts),
        });
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
        const raw = newData as Record<string, unknown>;
        setSettings({
          ...(newData as GlamPageSettings),
          look_star_links: normalizeStarLinks(raw.look_star_links),
          section_fonts: normalizeSectionFontMap(raw.section_fonts, DEFAULT_GLAM_PAGE_SETTINGS.section_fonts),
        });
        return newData;
      }

      const { data, error } = await supabase
        .from('glam_page_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      const raw = data as Record<string, unknown>;
      setSettings({
        ...(data as GlamPageSettings),
        look_star_links: normalizeStarLinks(raw.look_star_links),
        section_fonts: normalizeSectionFontMap(raw.section_fonts, DEFAULT_GLAM_PAGE_SETTINGS.section_fonts),
      });
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
