import type { StockFilter } from './storeInventoryTypes';

const STOCK_FILTER_VALUES: ReadonlySet<StockFilter> = new Set(['in', 'low', 'out']);

export const parseQueryInt = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export const parseSearchParams = (search: string) => {
  const params = new URLSearchParams(search);
  const page = parseQueryInt(params.get('page'), 1);
  const searchQuery = params.get('q')?.trim() ?? '';
  const categoryFilter = params.get('category')?.trim() ?? '';
  const stockRaw = params.get('stock')?.trim() ?? '';
  const stockFilter: StockFilter = STOCK_FILTER_VALUES.has(stockRaw as StockFilter) ? (stockRaw as StockFilter) : '';

  return {
    page,
    searchQuery,
    categoryFilter,
    stockFilter,
  };
};

export const buildSearchParams = (params: {
  searchQuery: string;
  categoryFilter: string;
  stockFilter: StockFilter;
  page: number;
}) => {
  const next = new URLSearchParams();
  if (params.searchQuery) next.set('q', params.searchQuery);
  if (params.categoryFilter) next.set('category', params.categoryFilter);
  if (params.stockFilter) next.set('stock', params.stockFilter);
  if (params.page > 1) next.set('page', String(params.page));
  const built = next.toString();
  return built ? `?${built}` : '';
};
