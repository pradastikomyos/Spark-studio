import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchInventoryQueryData, STOCK_FILTER_FALLBACK_WARNING } from './inventoryData';
import type { UseInventoryParams } from './inventoryTypes';

type BuilderResponse = {
  data?: unknown;
  error?: unknown;
  count?: number | null;
};

const fromMock = vi.fn();
const rpcMock = vi.fn();
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

function createBuilder(response: BuilderResponse, options?: { rejectWith?: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    abortSignal: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    or: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    then: (
      onFulfilled?: (value: BuilderResponse) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) =>
      (options?.rejectWith ? Promise.reject(options.rejectWith) : Promise.resolve(response)).then(onFulfilled, onRejected),
  };

  return builder;
}

describe('fetchInventoryQueryData', () => {
  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
    consoleWarnSpy.mockClear();
  });

  it('returns fallback inventory data with diagnostics warning when stock RPC fails', async () => {
    const categoriesBuilder = createBuilder({
      data: [{ id: 2, name: 'Glow', slug: 'glow', is_active: true, parent_id: null }],
      error: null,
    });
    const productsBuilder = createBuilder({
      data: [
        {
          id: 7,
          name: 'Glow Kit',
          slug: 'glow-kit',
          description: null,
          category_id: 2,
          sku: 'GLOW-001',
          is_active: true,
          deleted_at: null,
          categories: { id: 2, name: 'Glow', slug: 'glow', is_active: true },
          product_variants: [],
          product_images: [],
        },
      ],
      error: null,
      count: 1,
    });

    fromMock.mockImplementation((table: string) => {
      if (table === 'categories') return categoriesBuilder;
      if (table === 'products') return productsBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });
    rpcMock.mockReturnValue(createBuilder({}, { rejectWith: new Error('rpc unavailable') }));

    const result = await fetchInventoryQueryData(
      {
        page: 1,
        pageSize: 24,
        searchQuery: 'glow',
        categoryFilter: '',
        stockFilter: 'low',
      } satisfies UseInventoryParams,
      new AbortController().signal
    );

    expect(result.products).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(result.diagnostics.source).toBe('rpc-fallback');
    expect(result.diagnostics.warning).toBe(STOCK_FILTER_FALLBACK_WARNING);
  });

  it('returns diagnostics for successful inventory fetches', async () => {
    const categoriesBuilder = createBuilder({
      data: [{ id: 3, name: 'Stage', slug: 'stage', is_active: true, parent_id: null }],
      error: null,
    });
    const productsBuilder = createBuilder({
      data: [
        {
          id: 8,
          name: 'Stage Light',
          slug: 'stage-light',
          description: null,
          category_id: 3,
          sku: 'STAGE-001',
          is_active: true,
          deleted_at: null,
          categories: { id: 3, name: 'Stage', slug: 'stage', is_active: true },
          product_variants: [],
          product_images: [],
        },
      ],
      error: null,
      count: 1,
    });

    fromMock.mockImplementation((table: string) => {
      if (table === 'categories') return categoriesBuilder;
      if (table === 'products') return productsBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await fetchInventoryQueryData(
      {
        page: 1,
        pageSize: 24,
        searchQuery: '',
        categoryFilter: '',
        stockFilter: '',
      } satisfies UseInventoryParams,
      new AbortController().signal
    );

    expect(result.products).toHaveLength(1);
    expect(result.categories).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(result.diagnostics.source).toBe('rpc');
    expect(result.diagnostics.warning).toBeNull();
    expect(result.diagnostics.fetchMs).toBeGreaterThanOrEqual(0);
  });
});
