import { describe, expect, it } from 'vitest';
import { computeStockStatus, mapInventoryProducts } from './inventoryProducts';

describe('inventoryProducts', () => {
  it('computes stock status correctly', () => {
    expect(computeStockStatus(0)).toBe('out');
    expect(computeStockStatus(5)).toBe('low');
    expect(computeStockStatus(20)).toBe('ok');
    expect(computeStockStatus(50)).toBe('good');
  });

  it('maps inventory rows into card view models', () => {
    const products = mapInventoryProducts([
      {
        id: 1,
        name: 'Glow Kit',
        slug: 'glow-kit',
        description: null,
        category_id: 2,
        sku: 'GLOW-001',
        is_active: true,
        deleted_at: null,
        categories: {
          id: 2,
          name: 'Beauty',
          slug: 'beauty',
          is_active: true,
        },
        product_images: [
          { image_url: 'https://example.com/b.jpg', is_primary: false, display_order: 2 },
          { image_url: 'https://example.com/a.jpg', is_primary: true, display_order: 1 },
        ],
        product_variants: [
          {
            id: 10,
            product_id: 1,
            name: 'Default',
            sku: 'GLOW-001',
            price: 120000,
            stock: 20,
            reserved_stock: 2,
            attributes: null,
            is_active: true,
          },
          {
            id: 11,
            product_id: 1,
            name: 'Refill',
            sku: 'GLOW-002',
            price: 90000,
            stock: 5,
            reserved_stock: 1,
            attributes: null,
            is_active: true,
          },
        ],
      },
    ] as never);

    expect(products[0]).toMatchObject({
      name: 'Glow Kit',
      category: 'Beauty',
      stock_available: 22,
      price_min: 90000,
      price_max: 120000,
      variant_count: 2,
      stock_status: 'ok',
      image_url_original: 'https://example.com/a.jpg',
    });
  });
});
