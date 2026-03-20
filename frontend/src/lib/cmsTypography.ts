import type { CSSProperties } from 'react';

export type CmsFontChoice = 'cardo' | 'nunito_sans' | 'great_vibes';

export type SectionFontConfig = {
  heading: CmsFontChoice;
  body: CmsFontChoice;
};

export const CMS_FONT_OPTIONS: Array<{ value: CmsFontChoice; label: string }> = [
  { value: 'cardo', label: 'Cardo' },
  { value: 'nunito_sans', label: 'Nunito Sans' },
  { value: 'great_vibes', label: 'Great Vibes' },
];

const FONT_FAMILY_MAP: Record<CmsFontChoice, string> = {
  cardo: "'Cardo', serif",
  nunito_sans: "'Nunito Sans', sans-serif",
  great_vibes: "'Great Vibes', cursive",
};

export const DEFAULT_SECTION_FONT_CONFIG: SectionFontConfig = {
  heading: 'cardo',
  body: 'nunito_sans',
};

export function normalizeCmsFontChoice(value: unknown, fallback: CmsFontChoice): CmsFontChoice {
  return typeof value === 'string' && value in FONT_FAMILY_MAP ? (value as CmsFontChoice) : fallback;
}

export function normalizeSectionFontConfig(
  value: unknown,
  fallback: SectionFontConfig = DEFAULT_SECTION_FONT_CONFIG,
): SectionFontConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Record<string, unknown>;
  return {
    heading: normalizeCmsFontChoice(record.heading, fallback.heading),
    body: normalizeCmsFontChoice(record.body, fallback.body),
  };
}

export function normalizeSectionFontMap<T extends string>(
  value: unknown,
  defaults: Record<T, SectionFontConfig>,
): Record<T, SectionFontConfig> {
  const record =
    value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

  return Object.fromEntries(
    (Object.keys(defaults) as T[]).map((key) => [key, normalizeSectionFontConfig(record[key], defaults[key])])
  ) as Record<T, SectionFontConfig>;
}

export function getCmsFontStyle(choice: CmsFontChoice): CSSProperties {
  return { fontFamily: FONT_FAMILY_MAP[choice] };
}
