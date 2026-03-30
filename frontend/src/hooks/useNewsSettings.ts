import { normalizeSectionFontMap, type SectionFontConfig } from '../lib/cmsTypography';
import { useCmsSingletonSettings } from './useCmsSingletonSettings';

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
  section_fonts: NewsSectionFonts;
}

export interface NewsSectionFonts {
  section_1: SectionFontConfig;
  section_2: SectionFontConfig;
  section_3: SectionFontConfig;
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
  section_fonts: {
    section_1: { heading: 'cardo', body: 'nunito_sans' },
    section_2: { heading: 'cardo', body: 'nunito_sans' },
    section_3: { heading: 'cardo', body: 'nunito_sans' },
  },
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
    section_fonts: normalizeSectionFontMap(data.section_fonts, DEFAULT_NEWS_PAGE_SETTINGS.section_fonts),
  };
}

export function useNewsSettings() {
  return useCmsSingletonSettings<NewsPageSettings>({
    table: 'news_page_settings',
    defaultId: DEFAULT_NEWS_PAGE_SETTINGS.id,
    normalize: normalizeSettings,
    errorLabel: 'news page settings',
  });
}
