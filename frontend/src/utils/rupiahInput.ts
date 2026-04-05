import { normalizeNumberLikeString, normalizeText } from '../lib/inventoryProductContract';

const RUPIAH_PREFIX_PATTERN = /^rp\.?\s*/i;

function stripZeroDecimals(value: string): string {
  return value.replace(/[.,]00$/, '');
}

function removeThousandsSeparators(value: string): string {
  return value.replace(/[.,]/g, '');
}

function normalizeCurrencyLikeText(value: string): string {
  return value.replace(RUPIAH_PREFIX_PATTERN, '').replace(/\s+/g, '');
}

function parseStrictRupiahString(value: string): string {
  if (/^\d+$/.test(value)) {
    return value;
  }

  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(value)) {
    return removeThousandsSeparators(value);
  }

  if (/^\d+[.,]00$/.test(value)) {
    return stripZeroDecimals(value);
  }

  if (/^\d{1,3}(?:\.\d{3})+,00$/.test(value) || /^\d{1,3}(?:,\d{3})+\.00$/.test(value)) {
    return removeThousandsSeparators(value).slice(0, -2);
  }

  return '';
}

export function parseRupiahInputValue(value: unknown): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) return '';
    return String(value);
  }

  const normalized = normalizeCurrencyLikeText(normalizeText(value));
  if (!normalized || normalized.startsWith('-')) return '';

  const strictNormalized = parseStrictRupiahString(normalized);
  if (strictNormalized) return strictNormalized;

  const normalizedNumberLike = normalizeNumberLikeString(normalized);
  if (!normalizedNumberLike) return '';

  return parseStrictRupiahString(normalizedNumberLike);
}

export function formatRupiahInputValue(value: unknown): string {
  const normalized = parseRupiahInputValue(value);
  if (!normalized) return '';
  return Number(normalized).toLocaleString('id-ID');
}
