import { normalizeSectionFontMap, type SectionFontConfig } from '../lib/cmsTypography';
import { useCmsSingletonSettings } from './useCmsSingletonSettings';

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
  section_fonts: EventSectionFonts;
}

export interface EventSectionFonts {
  magic: SectionFontConfig;
  experience: SectionFontConfig;
}

export const DEFAULT_EVENT_PAGE_SETTINGS: EventPageSettings = {
  id: 'default-event-page-settings',
  hero_images: [
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541250848049-b4f7141fca3f?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80',
  ],
  magic_title: 'CAPTURING your MAGIC MOMENT',
  magic_description:
    "Hey, I'm Jonny Lou, luxury and destination wedding photographer. I'm a storyteller with a camera, capturing the magic of love in weddings and portraits. More than just wedding photos and portraits, I create lasting memories that celebrate the enduring power of love.",
  magic_button_text: 'LEARN MORE',
  magic_button_link: '#',
  magic_images: ['https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80'],
  experience_title: 'CHOOSE your EXPERIENCE',
  experience_images: [
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541250848049-b4f7141fca3f?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80',
  ],
  experience_links: [
    { title: '1.', subtitle: 'THE GALLERIES', link: '#' },
    { title: '2.', subtitle: 'MY SERVICES', link: '#' },
    { title: '3.', subtitle: 'CONTACT ME', link: '#' },
  ],
  section_fonts: {
    magic: { heading: 'cardo', body: 'nunito_sans' },
    experience: { heading: 'cardo', body: 'nunito_sans' },
  },
};

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;

  const parsed = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);

  return parsed.length > 0 ? parsed : fallback;
}

function normalizeExperienceLinks(value: unknown): ExperienceLink[] {
  if (!Array.isArray(value)) return DEFAULT_EVENT_PAGE_SETTINGS.experience_links;

  const parsed = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const title = typeof record.title === 'string' ? record.title : '';
      const subtitle = typeof record.subtitle === 'string' ? record.subtitle : '';
      const link = typeof record.link === 'string' ? record.link : '#';

      if (!title.trim() && !subtitle.trim()) return null;
      return { title, subtitle, link };
    })
    .filter((entry): entry is ExperienceLink => entry !== null);

  return parsed.length > 0 ? parsed : DEFAULT_EVENT_PAGE_SETTINGS.experience_links;
}

function normalizeSettings(data: Record<string, unknown>): EventPageSettings {
  return {
    id: typeof data.id === 'string' ? data.id : DEFAULT_EVENT_PAGE_SETTINGS.id,
    hero_images: normalizeStringArray(data.hero_images, DEFAULT_EVENT_PAGE_SETTINGS.hero_images),
    magic_title:
      typeof data.magic_title === 'string' && data.magic_title.trim() !== ''
        ? data.magic_title
        : DEFAULT_EVENT_PAGE_SETTINGS.magic_title,
    magic_description:
      typeof data.magic_description === 'string' && data.magic_description.trim() !== ''
        ? data.magic_description
        : DEFAULT_EVENT_PAGE_SETTINGS.magic_description,
    magic_button_text:
      typeof data.magic_button_text === 'string'
        ? data.magic_button_text
        : DEFAULT_EVENT_PAGE_SETTINGS.magic_button_text,
    magic_button_link:
      typeof data.magic_button_link === 'string'
        ? data.magic_button_link
        : DEFAULT_EVENT_PAGE_SETTINGS.magic_button_link,
    magic_images: normalizeStringArray(data.magic_images, DEFAULT_EVENT_PAGE_SETTINGS.magic_images),
    experience_title:
      typeof data.experience_title === 'string' && data.experience_title.trim() !== ''
        ? data.experience_title
        : DEFAULT_EVENT_PAGE_SETTINGS.experience_title,
    experience_images: normalizeStringArray(data.experience_images, DEFAULT_EVENT_PAGE_SETTINGS.experience_images),
    experience_links: normalizeExperienceLinks(data.experience_links),
    section_fonts: normalizeSectionFontMap(data.section_fonts, DEFAULT_EVENT_PAGE_SETTINGS.section_fonts),
  };
}

export function useEventSettings() {
  return useCmsSingletonSettings<EventPageSettings>({
    table: 'event_page_settings',
    defaultId: DEFAULT_EVENT_PAGE_SETTINGS.id,
    normalize: normalizeSettings,
    errorLabel: 'event page settings',
  });
}
