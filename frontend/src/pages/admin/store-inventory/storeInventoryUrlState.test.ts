import { describe, expect, it } from 'vitest';
import { buildSearchParams, parseSearchParams } from './storeInventoryUrlState';

describe('storeInventoryUrlState', () => {
  it('parses search params with defaults', () => {
    expect(parseSearchParams('')).toEqual({
      page: 1,
      searchQuery: '',
      categoryFilter: '',
      stockFilter: '',
      activeFilter: '',
    });
  });

  it('round-trips search params', () => {
    const built = buildSearchParams({
      searchQuery: 'spark',
      categoryFilter: 'beauty',
      stockFilter: 'low',
      activeFilter: '',
      page: 2,
    });

    expect(built).toBe('?q=spark&category=beauty&stock=low&page=2');
    expect(parseSearchParams(built)).toEqual({
      page: 2,
      searchQuery: 'spark',
      categoryFilter: 'beauty',
      stockFilter: 'low',
      activeFilter: '',
    });
  });
});
