import { describe, expect, it } from 'vitest';
import { formatRupiahInputValue, parseRupiahInputValue } from './rupiahInput';

describe('rupiahInput', () => {
  it('parses accepted whole-rupiah formats', () => {
    expect(parseRupiahInputValue('30000')).toBe('30000');
    expect(parseRupiahInputValue('30.000')).toBe('30000');
    expect(parseRupiahInputValue('30,000')).toBe('30000');
    expect(parseRupiahInputValue('30000.00')).toBe('30000');
    expect(parseRupiahInputValue('30000,00')).toBe('30000');
    expect(parseRupiahInputValue('30.000,00')).toBe('30000');
    expect(parseRupiahInputValue('30,000.00')).toBe('30000');
    expect(parseRupiahInputValue('Rp 30.000')).toBe('30000');
  });

  it('rejects ambiguous or decimal-like values', () => {
    expect(parseRupiahInputValue('30.000,50')).toBe('');
    expect(parseRupiahInputValue('30,000.50')).toBe('');
    expect(parseRupiahInputValue('30000.50')).toBe('');
    expect(parseRupiahInputValue('30000,50')).toBe('');
    expect(parseRupiahInputValue('30.0a0')).toBe('');
    expect(parseRupiahInputValue(-30000)).toBe('');
    expect(parseRupiahInputValue(30000.5)).toBe('');
  });

  it('formats normalized rupiah values with id-ID separators', () => {
    expect(formatRupiahInputValue('30000')).toBe('30.000');
    expect(formatRupiahInputValue('30000.00')).toBe('30.000');
    expect(formatRupiahInputValue('Rp 30.000')).toBe('30.000');
    expect(formatRupiahInputValue('30000.50')).toBe('');
  });
});
