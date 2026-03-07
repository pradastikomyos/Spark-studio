import { useEffect, useRef, useState } from 'react';
import type { InventoryProduct } from './storeInventoryTypes';

export function useInventoryImageMetrics(products: InventoryProduct[], currentPage: number) {
  const imageMetricsRef = useRef({ expected: 0, loaded: 0, errors: 0, logged: false, page: 1 });
  const [thumbFallbackIds, setThumbFallbackIds] = useState<Record<number, true>>({});

  useEffect(() => {
    const expected = products.reduce((count, product) => count + (product.image_url ? 1 : 0), 0);
    imageMetricsRef.current = {
      expected,
      loaded: 0,
      errors: 0,
      logged: false,
      page: currentPage,
    };
  }, [products, currentPage]);

  const trackImageResult = (result: 'loaded' | 'error') => {
    const metrics = imageMetricsRef.current;
    if (result === 'loaded') {
      metrics.loaded += 1;
    } else {
      metrics.errors += 1;
    }

    const resolvedCount = metrics.loaded + metrics.errors;
    if (metrics.logged || resolvedCount < metrics.expected) return;

    console.debug('[InventoryPerf]', {
      metric: 'inventory_image_load',
      expected: metrics.expected,
      loaded: metrics.loaded,
      errors: metrics.errors,
      page: metrics.page,
    });
    metrics.logged = true;
  };

  const markThumbFallback = (productId: number) => {
    setThumbFallbackIds((prev) => (prev[productId] ? prev : { ...prev, [productId]: true }));
  };

  return {
    thumbFallbackIds,
    trackImageResult,
    markThumbFallback,
  };
}
