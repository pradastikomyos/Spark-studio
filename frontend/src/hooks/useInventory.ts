import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError, createQuerySignal, supabasePaginatedFetcher } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

type ProductVariantRow = {
  id: number;
  product_id: number;
  name: string;
  sku: string;
  price: string | number | null;
  stock: number | null;
  reserved_stock: number | null;
  attributes: Record<string, unknown> | null;
  is_active: boolean | null;
};

export type ProductImageRow = {
  image_url: string;
  is_primary: boolean;
  display_order: number;
};

export type ProductRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category_id: number | null;
  sku: string;
  is_active: boolean;
  deleted_at: string | null;
  categories?: { id: number; name: string; slug: string; is_active: boolean | null } | null;
  product_variants?: ProductVariantRow[] | null;
  product_images?: ProductImageRow[] | null;
};

export type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean | null;
  parent_id: number | null;
};

export type UseInventoryParams = {
  page: number;
  pageSize: number;
  searchQuery: string;
  categoryFilter: string;
  stockFilter: '' | 'in' | 'low' | 'out';
};

export type InventoryDiagnostics = {
  fetchMs: number;
  fullScan: boolean;
  source: 'rpc' | 'fallback-live' | 'fallback-cache';
  warning: string | null;
};

export type InventoryQueryData = {
  products: ProductRow[];
  categories: CategoryRow[];
  totalCount: number;
  diagnostics: InventoryDiagnostics;
};

type InventoryProductFetchResult = {
  data: ProductRow[] | null;
  error: unknown;
  count: number | null;
  fullScan: boolean;
  source: InventoryDiagnostics['source'];
  warning: string | null;
};

type InventoryPageRow = {
  product_id: number | string | null;
  total_count: number | string | null;
};

type InventoryFallbackCacheEntry = {
  filteredRows: ProductRow[];
  totalCount: number;
};

const INVENTORY_FULL_SCAN_PAGE_SIZE = 500;
const INVENTORY_FULL_SCAN_WARNING =
  'Stock filter fallback is using a full product scan because the inventory RPC failed.';
const INVENTORY_PRODUCTS_SELECT = `
  id,
  name,
  slug,
  description,
  category_id,
  sku,
  is_active,
  deleted_at,
  categories(id, name, slug, is_active),
  product_images(image_url, is_primary, display_order),
  product_variants(
    id,
    product_id,
    name,
    sku,
    price,
    stock,
    reserved_stock,
    attributes,
    is_active
  )
`;

type InventoryListFilters = {
  searchQuery: string;
  categoryFilter: string;
};

const inventoryFallbackCache = new Map<string, InventoryFallbackCacheEntry>();

const normalizeSearchTerm = (searchQuery: string) =>
  searchQuery
    .trim()
    .replace(/[%_]/g, ' ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ');

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const applyInventoryFilters = <T>(query: T, filters: InventoryListFilters): T => {
  let next = query as unknown as {
    or: (filters: string) => unknown;
    eq: (column: string, value: string) => unknown;
  };

  const normalizedSearch = normalizeSearchTerm(filters.searchQuery);
  if (normalizedSearch) {
    next = next.or(`name.ilike.%${normalizedSearch}%,sku.ilike.%${normalizedSearch}%`) as typeof next;
  }

  const normalizedCategory = filters.categoryFilter.trim();
  if (normalizedCategory) {
    next = next.eq('categories.slug', normalizedCategory) as typeof next;
  }

  return next as unknown as T;
};

const getStockStatus = (row: ProductRow): 'good' | 'ok' | 'low' | 'out' => {
  const variants = (row.product_variants || []).filter((variant) => variant.is_active !== false);
  let stockAvailable = 0;

  for (const variant of variants) {
    const available = Math.max(toNumber(variant.stock, 0) - toNumber(variant.reserved_stock, 0), 0);
    stockAvailable += available;
  }

  if (stockAvailable <= 0) return 'out';
  if (stockAvailable <= 10) return 'low';
  if (stockAvailable <= 30) return 'ok';
  return 'good';
};

const matchesStockFilter = (row: ProductRow, stockFilter: UseInventoryParams['stockFilter']) => {
  if (!stockFilter) return true;
  const stockStatus = getStockStatus(row);

  if (stockFilter === 'in') return stockStatus !== 'out';
  if (stockFilter === 'low') return stockStatus === 'low';
  if (stockFilter === 'out') return stockStatus === 'out';
  return true;
};

const orderProductsByIds = (products: ProductRow[], productIds: number[]) => {
  const orderMap = new Map<number, number>();
  productIds.forEach((productId, index) => {
    orderMap.set(productId, index);
  });

  return [...products].sort((a, b) => {
    const indexA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const indexB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return indexA - indexB;
  });
};

const getFallbackCacheKey = (
  filters: InventoryListFilters,
  stockFilter: UseInventoryParams['stockFilter']
) => `${normalizeSearchTerm(filters.searchQuery)}::${filters.categoryFilter.trim()}::${stockFilter}`;

async function fetchAllInventoryProducts(
  signal: AbortSignal,
  filters: InventoryListFilters
): Promise<{ data: ProductRow[] | null; error: unknown }> {
  try {
    const products = await supabasePaginatedFetcher<ProductRow>((from, to) => {
      let query = supabase
        .from('products')
        .select(INVENTORY_PRODUCTS_SELECT)
        .abortSignal(signal)
        .is('deleted_at', null)
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);
      query = applyInventoryFilters(query, filters);
      return query;
    }, INVENTORY_FULL_SCAN_PAGE_SIZE);

    return { data: products, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function fetchInventoryPage(
  signal: AbortSignal,
  page: number,
  pageSize: number,
  filters: InventoryListFilters
): Promise<InventoryProductFetchResult> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let query = supabase
    .from('products')
    .select(INVENTORY_PRODUCTS_SELECT, { count: 'exact' })
    .abortSignal(signal)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to);

  query = applyInventoryFilters(query, filters);
  const { data, error, count } = await query;

  return {
    data: (data || []) as unknown as ProductRow[],
    error,
    count: count ?? 0,
    fullScan: false,
    source: 'rpc',
    warning: null,
  };
}

async function fetchInventoryStockFilteredPage(
  signal: AbortSignal,
  page: number,
  pageSize: number,
  filters: InventoryListFilters,
  stockFilter: UseInventoryParams['stockFilter']
): Promise<InventoryProductFetchResult> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const normalizedSearch = normalizeSearchTerm(filters.searchQuery);
  const normalizedCategory = filters.categoryFilter.trim();

  try {
    const { data, error } = await supabase
      .rpc('list_inventory_product_page', {
        p_search_query: normalizedSearch,
        p_category_slug: normalizedCategory,
        p_stock_filter: stockFilter,
        p_page: safePage,
        p_page_size: safePageSize,
      })
      .abortSignal(signal);

    if (error) {
      throw error;
    }

    const pageRows = (data || []) as InventoryPageRow[];
    const productIds = pageRows
      .map((row) => toNumber(row.product_id, 0))
      .filter((productId) => productId > 0);
    const totalCount = pageRows.length > 0 ? toNumber(pageRows[0].total_count, 0) : 0;

    if (productIds.length === 0) {
      return {
        data: [],
        error: null,
        count: totalCount,
        fullScan: false,
        source: 'rpc',
        warning: null,
      };
    }

    const { data: detailData, error: detailError } = await supabase
      .from('products')
      .select(INVENTORY_PRODUCTS_SELECT)
      .abortSignal(signal)
      .is('deleted_at', null)
      .in('id', productIds);

    if (detailError) {
      throw detailError;
    }

    const orderedProducts = orderProductsByIds((detailData || []) as unknown as ProductRow[], productIds);

    return {
      data: orderedProducts,
      error: null,
      count: totalCount,
      fullScan: false,
      source: 'rpc',
      warning: null,
    };
  } catch (error) {
    const cacheKey = getFallbackCacheKey(filters, stockFilter);
    const cachedEntry = inventoryFallbackCache.get(cacheKey);
    if (cachedEntry) {
      const start = Math.max(0, (safePage - 1) * safePageSize);

      return {
        data: cachedEntry.filteredRows.slice(start, start + safePageSize),
        error: null,
        count: cachedEntry.totalCount,
        fullScan: true,
        source: 'fallback-cache',
        warning: INVENTORY_FULL_SCAN_WARNING,
      };
    }

    console.warn('Inventory stock filter RPC failed, falling back to client-side filtering:', error);
    const fallbackResult = await fetchAllInventoryProducts(signal, filters);
    if (fallbackResult.error) {
      return {
        data: null,
        error: fallbackResult.error,
        count: 0,
        fullScan: true,
        source: 'fallback-live',
        warning: INVENTORY_FULL_SCAN_WARNING,
      };
    }

    const filteredByStock = ((fallbackResult.data || []) as ProductRow[]).filter((row) => matchesStockFilter(row, stockFilter));
    const start = Math.max(0, (safePage - 1) * safePageSize);
    inventoryFallbackCache.set(cacheKey, {
      filteredRows: filteredByStock,
      totalCount: filteredByStock.length,
    });

    return {
      data: filteredByStock.slice(start, start + safePageSize),
      error: null,
      count: filteredByStock.length,
      fullScan: true,
      source: 'fallback-live',
      warning: INVENTORY_FULL_SCAN_WARNING,
    };
  }
}

export function useInventory(params: UseInventoryParams) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [
      ...queryKeys.inventory(),
      params.page,
      params.pageSize,
      params.searchQuery,
      params.categoryFilter,
      params.stockFilter,
    ],
    queryFn: async ({ signal }) => {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const timeoutMs = params.stockFilter ? 30000 : 15000;
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal, timeoutMs);
      try {
        const filters = {
          searchQuery: params.searchQuery,
          categoryFilter: params.categoryFilter,
        };

        const categoriesPromise = supabase
          .from('categories')
          .select('id, name, slug, is_active, parent_id')
          .abortSignal(timeoutSignal)
          .order('name', { ascending: true });

        const productsPromise = params.stockFilter
          ? fetchInventoryStockFilteredPage(timeoutSignal, params.page, params.pageSize, filters, params.stockFilter)
          : fetchInventoryPage(timeoutSignal, params.page, params.pageSize, filters);

        const [productsResult, categoriesResult] = await Promise.all([productsPromise, categoriesPromise]);

        if (productsResult.error || categoriesResult.error) {
          const err = new Error('Failed to load inventory') as APIError;
          const productsErrorCode =
            productsResult.error && typeof productsResult.error === 'object' && 'code' in productsResult.error
              ? String((productsResult.error as { code: unknown }).code)
              : null;
          err.status = productsErrorCode === '409' ? 409 : 500;
          err.info = { products: productsResult.error, categories: categoriesResult.error };
          throw err;
        }

        const products = (productsResult.data || []) as unknown as ProductRow[];
        const totalCount = productsResult.count ?? products.length;
        const fullScan = productsResult.fullScan;

        const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

        return {
          products,
          categories: (categoriesResult.data || []) as unknown as CategoryRow[],
          totalCount,
          diagnostics: {
            fetchMs: Math.max(0, endedAt - startedAt),
            fullScan,
            source: productsResult.source,
            warning: productsResult.warning,
          },
        } satisfies InventoryQueryData;
      } catch (error) {
        if (didTimeout()) {
          throw new Error('Request timeout');
        }
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            products: [],
            categories: [],
            totalCount: 0,
            diagnostics: { fetchMs: 0, fullScan: false, source: 'rpc', warning: null },
          };
        }
        throw error;
      } finally {
        cleanup();
      }
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 30000,
  });

  useEffect(() => {
    let invalidateTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const scheduleInvalidate = () => {
      if (invalidateTimeoutId) return;
      invalidateTimeoutId = setTimeout(() => {
        invalidateTimeoutId = null;
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
      }, 700);
    };

    const channel = supabase
      .channel('inventory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_images' }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, scheduleInvalidate)
      .subscribe();

    return () => {
      if (invalidateTimeoutId) {
        clearTimeout(invalidateTimeoutId);
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
