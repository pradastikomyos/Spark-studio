import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStoreInventoryFilters } from './useStoreInventoryFilters';

describe('useStoreInventoryFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces search updates into URL state and resets pagination once', () => {
    const navigate = vi.fn();
    const nextSearch = `?${new URLSearchParams({ q: 'glow kit' }).toString()}`;

    const { result, rerender } = renderHook(
      ({ search }) =>
        useStoreInventoryFilters({
          pathname: '/admin/store-inventory',
          search,
          navigate,
        }),
      {
        initialProps: {
          search: '?q=glow&page=3',
        },
      }
    );

    expect(result.current.searchInput).toBe('glow');
    expect(result.current.currentPage).toBe(3);

    act(() => {
      result.current.setSearchInput('glow kit');
    });

    expect(navigate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(navigate).toHaveBeenCalledWith(
      {
        pathname: '/admin/store-inventory',
        search: nextSearch,
      },
      { replace: true }
    );

    rerender({ search: nextSearch });
    expect(result.current.searchInput).toBe('glow kit');
    expect(result.current.currentPage).toBe(1);
  });
});
