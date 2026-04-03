import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { buildSearchParams, parseSearchParams } from './storeInventoryUrlState';
import type { StockFilter } from './storeInventoryTypes';

type UseStoreInventoryFiltersParams = {
  pathname: string;
  search: string;
  navigate: NavigateFunction;
};

export function useStoreInventoryFilters(params: UseStoreInventoryFiltersParams) {
  const { pathname, search, navigate } = params;
  const parsedParams = useMemo(() => parseSearchParams(search), [search]);
  const [searchInput, setSearchInput] = useState(parsedParams.searchQuery);

  useEffect(() => {
    setSearchInput((current) => (current === parsedParams.searchQuery ? current : parsedParams.searchQuery));
  }, [parsedParams.searchQuery]);

  const navigateWithFilters = useCallback(
    (
      updater:
        | {
            searchQuery?: string;
            categoryFilter?: string;
            stockFilter?: StockFilter;
            page?: number;
          }
        | ((current: ReturnType<typeof parseSearchParams>) => {
            searchQuery: string;
            categoryFilter: string;
            stockFilter: StockFilter;
            page: number;
          })
    ) => {
      const nextState = typeof updater === 'function' ? updater(parsedParams) : { ...parsedParams, ...updater };
      const nextSearch = buildSearchParams({
        searchQuery: nextState.searchQuery,
        categoryFilter: nextState.categoryFilter,
        stockFilter: nextState.stockFilter,
        page: Math.max(1, Math.floor(nextState.page)),
      });

      if (nextSearch === search) return;
      navigate({ pathname, search: nextSearch }, { replace: true });
    },
    [navigate, parsedParams, pathname, search]
  );

  useEffect(() => {
    const debounceId = window.setTimeout(() => {
      const nextSearchQuery = searchInput.trim();
      if (nextSearchQuery === parsedParams.searchQuery) return;

      navigateWithFilters((current) => ({
        ...current,
        searchQuery: nextSearchQuery,
        page: 1,
      }));
    }, 250);
    return () => {
      window.clearTimeout(debounceId);
    };
  }, [navigateWithFilters, parsedParams.searchQuery, searchInput]);

  const setCategoryFilter = useCallback(
    (value: string) => {
      navigateWithFilters((current) => ({
        ...current,
        categoryFilter: value,
        page: 1,
      }));
    },
    [navigateWithFilters]
  );

  const setStockFilter = useCallback(
    (value: StockFilter) => {
      navigateWithFilters((current) => ({
        ...current,
        stockFilter: value,
        page: 1,
      }));
    },
    [navigateWithFilters]
  );

  const setCurrentPage = useCallback(
    (value: SetStateAction<number>) => {
      navigateWithFilters((current) => {
        const resolvedPage = typeof value === 'function' ? value(current.page) : value;
        return {
          ...current,
          page: Number.isFinite(resolvedPage) ? Math.max(1, Math.floor(resolvedPage)) : current.page,
        };
      });
    },
    [navigateWithFilters]
  );

  return {
    searchInput,
    searchQuery: parsedParams.searchQuery,
    categoryFilter: parsedParams.categoryFilter,
    stockFilter: parsedParams.stockFilter,
    currentPage: parsedParams.page,
    setSearchInput,
    setCategoryFilter,
    setStockFilter,
    setCurrentPage,
    commitSearchInput: () => {
      navigateWithFilters((current) => ({
        ...current,
        searchQuery: searchInput.trim(),
        page: 1,
      }));
    },
  };
}
