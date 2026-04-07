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
        activeFilter: '',
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
        activeFilter: '',
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

  it('uses inventory RPC for searches so active variant sku matches can surface in results', async () => {
    const categoriesBuilder = createBuilder({
      data: [{ id: 4, name: 'Charm', slug: 'charm', is_active: true, parent_id: null }],
      error: null,
    });
    const detailProductsBuilder = createBuilder({
      data: [
        {
          id: 1094,
          name: 'Sweet Slice Welded Charm',
          slug: 'sweet-slice-welded-charm',
          description: null,
          category_id: 4,
          sku: 'ICJ1838',
          is_active: true,
          deleted_at: null,
          categories: { id: 4, name: 'Charm', slug: 'charm', is_active: true },
          product_variants: [
            {
              id: 1178,
              product_id: 1094,
              name: 'Pink Mangosteen',
              sku: 'ICJ1839',
              price: '30000',
              stock: 8,
              reserved_stock: 0,
              attributes: {},
              is_active: true,
            },
          ],
          product_images: [],
        },
      ],
      error: null,
      count: 1,
    });

    fromMock.mockImplementation((table: string) => {
      if (table === 'categories') return categoriesBuilder;
      if (table === 'products') return detailProductsBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });
    rpcMock.mockReturnValue(
      createBuilder({
        data: [{ product_id: 1094, total_count: 1 }],
        error: null,
      })
    );

    const result = await fetchInventoryQueryData(
      {
        page: 1,
        pageSize: 24,
        searchQuery: 'ICJ1839',
        categoryFilter: '',
        stockFilter: '',
        activeFilter: '',
      } satisfies UseInventoryParams,
      new AbortController().signal
    );

    expect(rpcMock).toHaveBeenCalledWith('list_inventory_product_page', {
      p_search_query: 'ICJ1839',
      p_category_slug: '',
      p_stock_filter: '',
      p_page: 1,
      p_page_size: 24,
    });
    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.sku).toBe('ICJ1838');
  });
});
