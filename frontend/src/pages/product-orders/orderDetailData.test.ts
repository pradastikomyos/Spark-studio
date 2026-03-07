import { describe, expect, it } from 'vitest';
import { mapProductOrderItemRows } from './orderDetailData';

describe('mapProductOrderItemRows', () => {
  it('prefers primary image and coerces numeric values', () => {
    const result = mapProductOrderItemRows([
      {
        id: '1',
        quantity: '2',
        price: '50000',
        subtotal: '100000',
        product_variants: {
          name: 'XL',
          products: {
            name: 'Spark Tee',
            image_url: null,
            product_images: [
              { image_url: 'fallback.jpg', is_primary: false },
              { image_url: 'primary.jpg', is_primary: true },
            ],
          },
        },
      },
    ]);

    expect(result).toEqual([
      {
        id: 1,
        quantity: 2,
        price: 50000,
        subtotal: 100000,
        productName: 'Spark Tee',
        variantName: 'XL',
        imageUrl: 'primary.jpg',
      },
    ]);
  });
});
