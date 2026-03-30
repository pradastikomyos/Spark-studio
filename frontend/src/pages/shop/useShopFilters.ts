import { useDeferredValue, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useShopFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'all';
  const activeSubcategory = searchParams.get('subcategory') || 'all';
  const activeSubSubcategory = searchParams.get('subsubcategory') || 'all';
  const searchQueryParam = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(searchQueryParam);

  useEffect(() => {
    setSearchQuery(searchQueryParam);
  }, [searchQueryParam]);

  const updateFilters = (updates: Record<string, string | null>) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === 'all' || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      return next;
    }, { replace: true });
  };

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const resultsResetSignal = `${activeCategory}:${activeSubcategory}:${activeSubSubcategory}:${deferredSearchQuery.trim().toLowerCase()}`;

  return {
    activeCategory,
    activeSubcategory,
    activeSubSubcategory,
    searchQuery,
    setSearchQuery,
    updateFilters,
    deferredSearchQuery,
    resultsResetSignal,
  };
}
