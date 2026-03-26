import { useEffect, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { buildSearchParams, parseSearchParams } from './storeInventoryUrlState';
import type { StockFilter } from './storeInventoryTypes';

type UseStoreInventoryFiltersParams = {
  pathname: string;
  search: string;
  navigate: NavigateFunction;
  totalProducts: number | null;
  isFetching: boolean;
  pageSize: number;
};

export function useStoreInventoryFilters(params: UseStoreInventoryFiltersParams) {
  const { pathname, search, navigate, totalProducts, isFetching, pageSize } = params;
  const initialParams = parseSearchParams(search);
  const [searchInput, setSearchInput] = useState(initialParams.searchQuery);
  const [searchQuery, setSearchQuery] = useState(initialParams.searchQuery);
  const [categoryFilter, setCategoryFilter] = useState(initialParams.categoryFilter);
  const [stockFilter, setStockFilter] = useState<StockFilter>(initialParams.stockFilter);
  const [currentPage, setCurrentPage] = useState(initialParams.page);

  useEffect(() => {
    const parsed = parseSearchParams(search);
    setSearchInput(parsed.searchQuery);
    setSearchQuery(parsed.searchQuery);
    setCategoryFilter(parsed.categoryFilter);
    setStockFilter(parsed.stockFilter);
    setCurrentPage(parsed.page);
  }, [search]);

  useEffect(() => {
    const debounceId = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => {
      window.clearTimeout(debounceId);
    };
  }, [searchInput]);

  useEffect(() => {
    const nextSearch = buildSearchParams({
      searchQuery,
      categoryFilter,
      stockFilter,
      page: currentPage,
    });
    if (nextSearch === search) return;
    navigate({ pathname, search: nextSearch }, { replace: true });
  }, [searchQuery, categoryFilter, stockFilter, currentPage, pathname, search, navigate]);

  useEffect(() => {
    if (isFetching || totalProducts == null) return;
    const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
    if (totalProducts === 0 && currentPage !== 1) {
      setCurrentPage(1);
      return;
    }
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalProducts, pageSize, isFetching]);

  return {
    searchInput,
    searchQuery,
    categoryFilter,
    stockFilter,
    currentPage,
    setSearchInput,
    setCategoryFilter,
    setStockFilter,
    setCurrentPage,
  };
}
