import { APIError, createQuerySignal } from '../../lib/fetchers';
import { queryKeys } from '../../lib/queryKeys';
import { supabase } from '../../lib/supabase';
import {
  applyInventoryFilters,
  getInventorySelect,
  normalizeSearchTerm,
  orderProductsByIds,
  toNumber,
} from './inventoryQuerySchema';
import type {
  CategoryRow,
  InventoryProductFetchResult,
  InventoryPageRow,
  InventoryQueryData,
  ProductRow,
  UseInventoryParams,
} from './inventoryTypes';

const DEFAULT_INVENTORY_TIMEOUT_MS = 15000;
const STOCK_FILTER_TIMEOUT_MS = 30000;

export const STOCK_FILTER_FALLBACK_WARNING =
  'Stock filter is temporarily unavailable. Showing unfiltered inventory while RPC recovers.';

async function fetchInventoryPage(
  signal: AbortSignal,
  page: number,
  pageSize: number,
  filters: { searchQuery: string; categoryFilter: string }
): Promise<InventoryProductFetchResult> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let query = supabase
    .from('products')
    .select(getInventorySelect(filters.categoryFilter), { count: 'exact' })
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
  filters: { searchQuery: string; categoryFilter: string },
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
      .select(getInventorySelect(filters.categoryFilter))
      .abortSignal(signal)
      .is('deleted_at', null)
      .in('id', productIds);

    if (detailError) {
      throw detailError;
    }

    return {
      data: orderProductsByIds((detailData || []) as unknown as ProductRow[], productIds),
      error: null,
      count: totalCount,
      fullScan: false,
      source: 'rpc',
      warning: null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    console.warn('Inventory stock filter RPC failed:', error);
    const fallback = await fetchInventoryPage(signal, page, pageSize, filters);
    return {
      ...fallback,
      source: 'rpc-fallback',
      warning: STOCK_FILTER_FALLBACK_WARNING,
    };
  }
}

export async function fetchInventoryQueryData(
  params: UseInventoryParams,
  signal: AbortSignal
): Promise<InventoryQueryData> {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const timeoutMs = params.stockFilter ? STOCK_FILTER_TIMEOUT_MS : DEFAULT_INVENTORY_TIMEOUT_MS;
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

    const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const products = (productsResult.data || []) as ProductRow[];
    const totalCount = productsResult.count ?? products.length;

    return {
      products,
      categories: (categoriesResult.data || []) as CategoryRow[],
      totalCount,
      diagnostics: {
        fetchMs: Math.max(0, endedAt - startedAt),
        fullScan: productsResult.fullScan,
        source: productsResult.source,
        warning: productsResult.warning,
      },
    };
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
}

export const getInventoryQueryKey = (params: UseInventoryParams) =>
  queryKeys.inventoryList(
    params.page,
    params.pageSize,
    params.searchQuery,
    params.categoryFilter,
    params.stockFilter
  );
