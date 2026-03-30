import { describe, expect, it } from 'vitest';
import type { Category } from '../../hooks/useCategories';
import type { Product } from '../../hooks/useProducts';
import { buildShopCategoryIndex } from './buildShopCategoryIndex';
import { filterShopProducts } from './filterShopProducts';

const categories: Category[] = [
  { id: 1, name: 'Charm', slug: 'charm', parent_id: null },
  { id: 2, name: 'Golden Charm Pendant', slug: 'golden-charm-pendant', parent_id: 1 },
  { id: 3, name: 'Silver Charm Pendant', slug: 'silver-charm-pendant', parent_id: 1 },
  { id: 4, name: 'Makeup', slug: 'makeup', parent_id: null },
  { id: 5, name: 'Headliner', slug: 'headliner', parent_id: 4 },
];

const products: Product[] = [
  { id: 1, name: 'Gold Star', description: 'gold charm', price: 10, categorySlug: 'golden-charm-pendant' },
  { id: 2, name: 'Silver Star', description: 'silver charm', price: 12, categorySlug: 'silver-charm-pendant' },
  { id: 3, name: 'Newest Charm', description: 'fresh', price: 14, categorySlug: 'golden-charm-pendant' },
  { id: 4, name: 'Headliner Lip', description: 'hero', price: 20, categorySlug: 'headliner' },
];

describe('shop filters', () => {
  it('builds descendant slug maps for nested categories', () => {
    const index = buildShopCategoryIndex(categories);

    expect(index.parentCategories.map((category) => category.slug)).toEqual(['charm', 'makeup']);
    expect(index.allowedSlugMap.get('charm')).toEqual(new Set(['charm', 'golden-charm-pendant', 'silver-charm-pendant']));
  });

  it('filters special charm groups and best sellers', () => {
    const index = buildShopCategoryIndex(categories);

    expect(
      filterShopProducts({
        products,
        activeCategory: 'charm',
        activeSubcategory: 'gold-group',
        activeSubSubcategory: 'all',
        searchQuery: '',
        allowedSlugMap: index.allowedSlugMap,
        bestSellerIds: [],
      }).map((product) => product.id)
    ).toEqual([1, 3]);

    expect(
      filterShopProducts({
        products,
        activeCategory: 'charm',
        activeSubcategory: 'bestseller-group',
        activeSubSubcategory: 'all',
        searchQuery: '',
        allowedSlugMap: index.allowedSlugMap,
        bestSellerIds: [2],
      }).map((product) => product.id)
    ).toEqual([2]);
  });

  it('keeps all-products ranking behavior', () => {
    const index = buildShopCategoryIndex(categories);

    expect(
      filterShopProducts({
        products,
        activeCategory: 'all',
        activeSubcategory: 'all',
        activeSubSubcategory: 'all',
        searchQuery: '',
        allowedSlugMap: index.allowedSlugMap,
        bestSellerIds: [],
      }).map((product) => product.id)
    ).toEqual([4, 1, 2, 3]);
  });
});
