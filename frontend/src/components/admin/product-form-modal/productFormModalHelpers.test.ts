import { describe, expect, it } from 'vitest';
import { emptyDraft, validateProductDraft } from './productFormModalHelpers';
import type { ExistingImage, ProductDraft } from './productFormModalTypes';

describe('productFormModalHelpers', () => {
  it('requires at least one image when saving', () => {
    const draft: ProductDraft = {
      ...emptyDraft(),
      name: 'Test Product',
      slug: 'test-product',
      category_id: 1,
      sku: 'SKU-001',
      variants: [{ name: 'Default', sku: 'VAR-001', price: '10000', stock: 1 }],
    };

    expect(
      validateProductDraft({
        draft,
        imagesLength: 0,
        existingImages: [],
        removedImageUrlsLength: 0,
      })
    ).toBe('At least one product image is required.');
  });

  it('blocks when total images exceed the max', () => {
    const draft: ProductDraft = {
      ...emptyDraft(),
      name: 'Test Product',
      slug: 'test-product',
      category_id: 1,
      sku: 'SKU-001',
      variants: [{ name: 'Default', sku: 'VAR-001', price: '10000', stock: 1 }],
    };
    const existingImages: ExistingImage[] = Array.from({ length: 9 }, (_, index) => ({
      url: `https://example.com/${index}.jpg`,
      is_primary: index === 0,
    }));

    expect(
      validateProductDraft({
        draft,
        imagesLength: 0,
        existingImages,
        removedImageUrlsLength: 0,
      })
    ).toBe('Max 8 product images allowed.');
  });
});
