import { describe, expect, it } from 'vitest';
import {
  calculateFinalTotal,
  calculateSubtotal,
  mapCheckoutOrderItems,
  selectCheckoutItems,
} from './checkoutPricing';

const allItems = [
  {
    productId: 1,
    productName: 'Spark Tee',
    variantId: 11,
    variantName: 'S',
    unitPrice: 50000,
    quantity: 2,
  },
  {
    productId: 2,
    productName: 'Spark Cap',
    variantId: 22,
    variantName: 'Default',
    unitPrice: 30000,
    quantity: 1,
  },
];

describe('checkoutPricing', () => {
  it('filters selected variants and calculates totals', () => {
    const selectedItems = selectCheckoutItems(allItems, [22]);

    expect(selectedItems).toHaveLength(1);
    expect(calculateSubtotal(allItems)).toBe(130000);
    expect(calculateFinalTotal(130000, 30000)).toBe(100000);
  });

  it('maps checkout payload items', () => {
    expect(mapCheckoutOrderItems(allItems)).toEqual([
      {
        product_variant_id: 11,
        product_name: 'Spark Tee',
        variant_name: 'S',
        quantity: 2,
        unit_price: 50000,
        subtotal: 100000,
      },
      {
        product_variant_id: 22,
        product_name: 'Spark Cap',
        variant_name: 'Default',
        quantity: 1,
        unit_price: 30000,
        subtotal: 30000,
      },
    ]);
  });
});
