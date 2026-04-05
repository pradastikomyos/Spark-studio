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

  it('blocks duplicate variant SKUs in the same form', () => {
    const draft: ProductDraft = {
      ...emptyDraft(),
      name: 'Test Product',
      slug: 'test-product',
      category_id: 1,
      sku: 'SKU-001',
      variants: [
        { name: 'Default', sku: 'VAR-001', price: '10000', stock: 1 },
        { name: 'Alt', sku: 'var-001', price: '12000', stock: 2 },
      ],
    };
    const existingImages: ExistingImage[] = [{ url: 'https://example.com/0.jpg', is_primary: true }];

    expect(
      validateProductDraft({
        draft,
        imagesLength: 0,
        existingImages,
        removedImageUrlsLength: 0,
      })
    ).toBe('Each variant SKU must be unique.');
  });

  it('blocks negative stock before submit', () => {
    const draft: ProductDraft = {
      ...emptyDraft(),
      name: 'Test Product',
      slug: 'test-product',
      category_id: 1,
      sku: 'SKU-001',
      variants: [{ name: 'Default', sku: 'VAR-001', price: '10000', stock: -1 }],
    };
    const existingImages: ExistingImage[] = [{ url: 'https://example.com/0.jpg', is_primary: true }];

    expect(
      validateProductDraft({
        draft,
        imagesLength: 0,
        existingImages,
        removedImageUrlsLength: 0,
      })
    ).toBe('Variant "Default" must have stock 0 or greater.');
  });
});
