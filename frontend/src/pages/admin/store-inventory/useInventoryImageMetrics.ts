import { useCallback, useState } from 'react';
import type { InventoryProduct } from './storeInventoryTypes';

export function useInventoryImageMetrics(products: InventoryProduct[], currentPage: number) {
  void products;
  void currentPage;
  const [thumbFallbackIds, setThumbFallbackIds] = useState<Record<number, true>>({});
  const trackImageResult = useCallback((result: 'loaded' | 'error') => {
    void result;
    // Inventory image diagnostics were intentionally removed from the render path.
  }, []);

  const markThumbFallback = (productId: number) => {
    setThumbFallbackIds((prev) => (prev[productId] ? prev : { ...prev, [productId]: true }));
  };

  return {
    thumbFallbackIds,
    trackImageResult,
    markThumbFallback,
  };
}
