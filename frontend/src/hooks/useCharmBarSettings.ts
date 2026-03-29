import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeSectionFontMap, type SectionFontConfig } from '../lib/cmsTypography';

const CHARM_BAR_ASSET_BASE = '/images/Charm%20Bar%20assets';

export interface CharmBarSectionFonts {
  quick_links: SectionFontConfig;
  customize: SectionFontConfig;
  video_gallery: SectionFontConfig;
  how_it_works: SectionFontConfig;
}

export interface CharmBarQuickLink {
  title: string;
  description: string;
  image_url: string;
  href: string;
}

export interface CharmBarStep {
  title: string;
  body: string;
  image_url: string;
  cta_label: string;
  cta_href: string;
}

export interface CharmBarVideoCard {
  title: string;
  video_url: string;
}

export interface CharmBarPageSettings {
  id: string;
  hero_image_url: string;
  quick_links: CharmBarQuickLink[];
  customize_title: string;
  steps: CharmBarStep[];
  video_intro_text: string;
  video_cards: CharmBarVideoCard[];
  how_it_works_title: string;
  how_it_works_intro: string;
  how_it_works_steps: string[];
  how_it_works_video_url: string;
  how_it_works_cta_label: string;
  how_it_works_cta_href: string;
  section_fonts: CharmBarSectionFonts;
  best_seller_charms: number[];
}

export const DEFAULT_CHARM_BAR_PAGE_SETTINGS: CharmBarPageSettings = {
  id: 'default-charm-bar-page-settings',
  hero_image_url: `${CHARM_BAR_ASSET_BASE}/43620168072.png`,
  quick_links: [
    {
      title: 'ITALIAN BRACELET',
      description: 'Choose your base bracelet in silver, gold, or rose gold.',
      image_url: `${CHARM_BAR_ASSET_BASE}/CHARM%20VISUAL%201.png`,
      href: '/shop?category=charm&subcategory=italian-bracelet',
    },
    {
      title: 'BEST-SELLERS',
      description: 'Most-loved charm combinations from the current edit.',
      image_url: `${CHARM_BAR_ASSET_BASE}/CHARM%20VISUAL%203.png`,
      href: '/shop?category=charm&subcategory=bestseller-group',
    },
    {
      title: "WHAT'S NEW",
      description: 'Fresh arrivals to build the latest bracelet stack.',
      image_url: `${CHARM_BAR_ASSET_BASE}/CHARM%20VISUAL%202.png`,
      href: '/shop?category=charm&subcategory=newest-group',
    },
    {
      title: 'GOLDEN CHARMS',
      description: 'Warm metallic accents for a brighter custom look.',
      image_url: `${CHARM_BAR_ASSET_BASE}/CHARM%20VISUAL%203.png`,
      href: '/shop?category=charm&subcategory=gold-group',
    },
    {
      title: 'SILVER CHARMS',
      description: 'Classic silver pieces for a cleaner charm story.',
      image_url: `${CHARM_BAR_ASSET_BASE}/CHARM%20VISUAL%202.png`,
      href: '/shop?category=charm&subcategory=silver-group',
    },
  ],
  customize_title: 'CUSTOMIZE YOUR BRACELET',
  steps: [
    {
      title: '1 - CHOOSE YOUR BRACELET',
      body: 'Choose your bracelet: silver, gold, or rose gold. A bracelet is made up of 18 links without charms and adapts to your wrist by removing or adding links.',
      image_url: `${CHARM_BAR_ASSET_BASE}/CHARM%20VISUAL%201.png`,
      cta_label: 'ITALIAN BRACELET',
      cta_href: '/shop',
    },
    {
      title: '2 - ADD YOUR CHARMS',
      body: 'Option 1: Start with a blank bracelet and a few charms. Option 2: Choose 16 to 20 charms, depending on your wrist size, for a complete bracelet.',
      image_url: `${CHARM_BAR_ASSET_BASE}/CHARM%20VISUAL%202.png`,
      cta_label: 'ALL OUR CHARMS',
      cta_href: '/shop',
    },
    {
      title: '3 - ASSEMBLE AND WEAR YOUR BRACELET',
      body: 'Secure your charms by replacing the bracelet links. Tip: our tool can help you with assembly for a clean, finished look.',
      image_url: `${CHARM_BAR_ASSET_BASE}/CHARM%20VISUAL%203.png`,
      cta_label: 'OUR BEST SELLERS',
      cta_href: '/shop',
    },
  ],
  video_intro_text: 'SEE ONE. CLIP ONE. WEAR ONE.',
  video_cards: [
    { title: 'DIY CHARM 1', video_url: `${CHARM_BAR_ASSET_BASE}/DIY%20CHARM%201.mp4` },
    { title: 'DIY CHARM 2', video_url: `${CHARM_BAR_ASSET_BASE}/DIY%20CHARM%202.mp4` },
    { title: 'DIY CHARM 3', video_url: `${CHARM_BAR_ASSET_BASE}/DIY%20CHARM%203.mp4` },
  ],
  how_it_works_title: 'HOW DOES IT WORKS?',
  how_it_works_intro: 'Adding and removing charms is easy.',
  how_it_works_steps: [
    'Open the individual links using our charm tool.',
    'Select a charm and attach it to the bracelet.',
    'Close the bracelet and wear your new Italian charm bracelet.',
  ],
  how_it_works_video_url: `${CHARM_BAR_ASSET_BASE}/DIY%20CHARM%202.mp4`,
  how_it_works_cta_label: 'EXPLORE THE COLLECTION',
  how_it_works_cta_href: '/shop',
  section_fonts: {
    quick_links: { heading: 'cardo', body: 'nunito_sans' },
    customize: { heading: 'cardo', body: 'nunito_sans' },
    video_gallery: { heading: 'cardo', body: 'nunito_sans' },
    how_it_works: { heading: 'cardo', body: 'nunito_sans' },
  },
  best_seller_charms: [],
};

function normalizeQuickLinks(value: unknown): CharmBarQuickLink[] {
  if (!Array.isArray(value)) return DEFAULT_CHARM_BAR_PAGE_SETTINGS.quick_links;

  const parsed = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const title = typeof record.title === 'string' ? record.title : '';
      const description = typeof record.description === 'string' ? record.description : '';
      const imageUrl = typeof record.image_url === 'string' ? record.image_url : '';
      const href = typeof record.href === 'string' ? record.href : '/shop';

      if (!title.trim()) return null;
      return {
        title,
        description,
        image_url: imageUrl,
        href,
      };
    })
    .filter((entry): entry is CharmBarQuickLink => entry !== null);

  return parsed.length > 0 ? parsed : DEFAULT_CHARM_BAR_PAGE_SETTINGS.quick_links;
}

function normalizeSteps(value: unknown): CharmBarStep[] {
  if (!Array.isArray(value)) return DEFAULT_CHARM_BAR_PAGE_SETTINGS.steps;

  const parsed = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const title = typeof record.title === 'string' ? record.title : '';
      const body = typeof record.body === 'string' ? record.body : '';
      const imageUrl = typeof record.image_url === 'string' ? record.image_url : '';
      const ctaLabel = typeof record.cta_label === 'string' ? record.cta_label : '';
      const ctaHref = typeof record.cta_href === 'string' ? record.cta_href : '/shop';

      if (!title.trim()) return null;
      return {
        title,
        body,
        image_url: imageUrl,
        cta_label: ctaLabel,
        cta_href: ctaHref,
      };
    })
    .filter((entry): entry is CharmBarStep => entry !== null);

  return parsed.length > 0 ? parsed : DEFAULT_CHARM_BAR_PAGE_SETTINGS.steps;
}

function normalizeVideoCards(value: unknown): CharmBarVideoCard[] {
  if (!Array.isArray(value)) return DEFAULT_CHARM_BAR_PAGE_SETTINGS.video_cards;

  const parsed = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const title = typeof record.title === 'string' ? record.title : '';
      const videoUrl = typeof record.video_url === 'string' ? record.video_url : '';

      if (!title.trim()) return null;
      return {
        title,
        video_url: videoUrl,
      };
    })
    .filter((entry): entry is CharmBarVideoCard => entry !== null);

  return parsed.length > 0 ? parsed : DEFAULT_CHARM_BAR_PAGE_SETTINGS.video_cards;
}

function normalizeStepsText(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_CHARM_BAR_PAGE_SETTINGS.how_it_works_steps;

  const parsed = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_CHARM_BAR_PAGE_SETTINGS.how_it_works_steps;
}

function normalizeSettings(data: Record<string, unknown>): CharmBarPageSettings {
  return {
    id: typeof data.id === 'string' ? data.id : DEFAULT_CHARM_BAR_PAGE_SETTINGS.id,
    hero_image_url:
      typeof data.hero_image_url === 'string' && data.hero_image_url.trim() !== ''
        ? data.hero_image_url
        : DEFAULT_CHARM_BAR_PAGE_SETTINGS.hero_image_url,
    quick_links: normalizeQuickLinks(data.quick_links),
    customize_title:
      typeof data.customize_title === 'string' && data.customize_title.trim() !== ''
        ? data.customize_title
        : DEFAULT_CHARM_BAR_PAGE_SETTINGS.customize_title,
    steps: normalizeSteps(data.steps),
    video_intro_text:
      typeof data.video_intro_text === 'string' && data.video_intro_text.trim() !== ''
        ? data.video_intro_text
        : DEFAULT_CHARM_BAR_PAGE_SETTINGS.video_intro_text,
    video_cards: normalizeVideoCards(data.video_cards),
    how_it_works_title:
      typeof data.how_it_works_title === 'string' && data.how_it_works_title.trim() !== ''
        ? data.how_it_works_title
        : DEFAULT_CHARM_BAR_PAGE_SETTINGS.how_it_works_title,
    how_it_works_intro:
      typeof data.how_it_works_intro === 'string' && data.how_it_works_intro.trim() !== ''
        ? data.how_it_works_intro
        : DEFAULT_CHARM_BAR_PAGE_SETTINGS.how_it_works_intro,
    how_it_works_steps: normalizeStepsText(data.how_it_works_steps),
    how_it_works_video_url:
      typeof data.how_it_works_video_url === 'string' && data.how_it_works_video_url.trim() !== ''
        ? data.how_it_works_video_url
        : DEFAULT_CHARM_BAR_PAGE_SETTINGS.how_it_works_video_url,
    how_it_works_cta_label:
      typeof data.how_it_works_cta_label === 'string' && data.how_it_works_cta_label.trim() !== ''
        ? data.how_it_works_cta_label
        : DEFAULT_CHARM_BAR_PAGE_SETTINGS.how_it_works_cta_label,
    how_it_works_cta_href:
      typeof data.how_it_works_cta_href === 'string' && data.how_it_works_cta_href.trim() !== ''
        ? data.how_it_works_cta_href
        : DEFAULT_CHARM_BAR_PAGE_SETTINGS.how_it_works_cta_href,
    section_fonts: normalizeSectionFontMap(data.section_fonts, DEFAULT_CHARM_BAR_PAGE_SETTINGS.section_fonts),
    best_seller_charms: Array.isArray(data.best_seller_charms)
      ? data.best_seller_charms.map(Number).filter(n => !isNaN(n))
      : [],
  };
}

export function useCharmBarSettings() {
  const [settings, setSettings] = useState<CharmBarPageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('charm_bar_page_settings')
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
      console.error('Error fetching charm bar page settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch charm bar page settings'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const updateSettings = async (updates: Partial<CharmBarPageSettings>) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!settings?.id || settings.id === DEFAULT_CHARM_BAR_PAGE_SETTINGS.id) {
        const { data: newData, error: insertError } = await supabase
          .from('charm_bar_page_settings')
          .insert([updates])
          .select()
          .single();

        if (insertError) throw insertError;
        const normalized = normalizeSettings(newData as Record<string, unknown>);
        setSettings(normalized);
        return normalized;
      }

      const { data, error } = await supabase
        .from('charm_bar_page_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      const normalized = normalizeSettings(data as Record<string, unknown>);
      setSettings(normalized);
      return normalized;
    } catch (err: unknown) {
      console.error('Error updating charm bar page settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to update charm bar page settings'));
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
