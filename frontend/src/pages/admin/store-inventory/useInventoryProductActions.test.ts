import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useInventoryProductActions } from './useInventoryProductActions';

const loadInventoryProductImagesMock = vi.fn();

vi.mock('../../../hooks/useInventory', () => ({
  clearInventoryFallbackCache: vi.fn(),
}));

vi.mock('./inventoryProductMutations', () => ({
  deleteInventoryProductMutation: vi.fn(),
  formatInventoryProductMutationError: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Failed to save product'
  ),
  loadInventoryProductImages: (...args: unknown[]) => loadInventoryProductImagesMock(...args),
  saveInventoryProductMutation: vi.fn(),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

describe('useInventoryProductActions', () => {
  it('ignores stale image loads after the form is closed', async () => {
    const deferred = createDeferred<
      Array<{
        id: number;
        url: string;
        is_primary: boolean;
      }>
    >();
    loadInventoryProductImagesMock.mockReturnValueOnce(deferred.promise);

    const showToast = vi.fn();
    const refetch = vi.fn(async () => null);
    const { result } = renderHook(() =>
      useInventoryProductActions({
        products: [
          {
            id: 1,
            name: 'Glow Kit',
            slug: 'glow-kit',
            description: null,
            category_id: 2,
            sku: 'GLOW-001',
            is_active: true,
            deleted_at: null,
            product_variants: [],
            product_images: [],
          },
        ],
        session: null,
        getValidAccessToken: vi.fn(async () => 'token-1'),
        refreshSession: vi.fn(async () => undefined),
        refetch,
        showToast,
      })
    );

    await act(async () => {
      void result.current.handleOpenEdit(1);
    });

    expect(result.current.showProductForm).toBe(true);
    expect(result.current.existingImagesLoading).toBe(true);

    act(() => {
      result.current.closeProductForm();
    });

    await act(async () => {
      deferred.resolve([
        {
          id: 11,
          url: 'https://example.com/primary.jpg',
          is_primary: true,
        },
      ]);
      await Promise.resolve();
    });

    expect(result.current.showProductForm).toBe(false);
    expect(result.current.existingImages).toEqual([]);
    expect(result.current.existingImagesLoading).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
  });
});
