import type { ProductRow } from '../../../hooks/inventory/inventoryTypes';
import { toInventoryThumbUrl } from '../../../utils/inventoryImage';
import type { InventoryProduct } from './storeInventoryTypes';

export const toNumber = (value: unknown, fallback: number = 0) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export const computeStockStatus = (stock: number): InventoryProduct['stock_status'] => {
  if (stock <= 0) return 'out';
  if (stock <= 10) return 'low';
  if (stock <= 30) return 'ok';
  return 'good';
};

export const getStockLabel = (status: string) => {
  const labels = {
    good: 'Good',
    ok: 'Ok',
    low: 'Restock',
    out: 'Empty',
  };
  return labels[status as keyof typeof labels] || 'Unknown';
};

export const getStockPercent = (stock: number, maxStock: number = 150) => Math.min((stock / maxStock) * 100, 100);

export const mapInventoryProducts = (productsRaw: ProductRow[]): InventoryProduct[] => {
  return productsRaw.map((row) => {
    const variants = (row.product_variants || []).filter((variant) => variant.is_active !== false);
    const categoryName = row.categories?.name || 'Uncategorized';
    const categorySlug = row.categories?.slug;

    let stockAvailable = 0;
    let priceMin = Number.POSITIVE_INFINITY;
    let priceMax = 0;

    const images = row.product_images || [];
    const primaryImage = images.find((img) => img.is_primary);
    let imageUrl: string | null = primaryImage?.image_url ?? null;
    if (!imageUrl && images.length > 0) {
      const lowest = images.reduce((a, b) => (a.display_order <= b.display_order ? a : b));
      imageUrl = lowest.image_url ?? null;
    }

    for (const variant of variants) {
      const stock = Math.max(toNumber(variant.stock, 0) - toNumber(variant.reserved_stock, 0), 0);
      stockAvailable += stock;
      const price = toNumber(variant.price, 0);
      priceMin = Math.min(priceMin, price);
      priceMax = Math.max(priceMax, price);
      if (!imageUrl) {
        const attrs = variant.attributes || {};
        const maybeImage = typeof attrs.image_url === 'string' ? attrs.image_url : null;
        if (maybeImage) imageUrl = maybeImage;
      }
    }

    if (!Number.isFinite(priceMin)) priceMin = 0;

    const imageUrlOriginal = imageUrl;
    const imageUrlThumb = imageUrl ? toInventoryThumbUrl(imageUrl) : null;

    return {
      id: row.id,
      name: row.name,
      sku: row.sku,
      is_active: row.is_active,
      category: categoryName,
      category_slug: categorySlug,
      stock_available: stockAvailable,
      stock_status: computeStockStatus(stockAvailable),
      price_min: priceMin,
      price_max: priceMax,
      variant_count: variants.length,
      image_url: imageUrlThumb,
      image_url_original: imageUrlOriginal,
    };
  });
};
