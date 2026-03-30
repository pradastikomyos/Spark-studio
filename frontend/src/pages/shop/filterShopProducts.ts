import type { Product } from '../../hooks/useProducts';
import {
  filterBestSellerCharmProducts,
  filterGoldCharmProducts,
  filterNewestCharmProducts,
  filterSilverCharmProducts,
  rankAllProducts,
} from './shopFilterConfig';

export type FilterShopProductsArgs = {
  products: Product[];
  activeCategory: string;
  activeSubcategory: string;
  activeSubSubcategory: string;
  searchQuery: string;
  allowedSlugMap: Map<string, Set<string>>;
  bestSellerIds: number[];
};

export function filterShopProducts({
  products,
  activeCategory,
  activeSubcategory,
  activeSubSubcategory,
  searchQuery,
  allowedSlugMap,
  bestSellerIds,
}: FilterShopProductsArgs) {
  let currentProducts = products;

  if (activeCategory !== 'all') {
    if (activeCategory === 'charm' && activeSubcategory === 'gold-group') {
      currentProducts = filterGoldCharmProducts(products);
    } else if (activeCategory === 'charm' && activeSubcategory === 'silver-group') {
      currentProducts = filterSilverCharmProducts(products);
    } else if (activeCategory === 'charm' && activeSubcategory === 'newest-group') {
      currentProducts = filterNewestCharmProducts(products, allowedSlugMap.get('charm'));
    } else if (activeCategory === 'charm' && activeSubcategory === 'bestseller-group') {
      currentProducts = filterBestSellerCharmProducts(products, new Set(bestSellerIds));
    } else {
      let activeNode = activeCategory;
      if (activeSubcategory !== 'all') {
        activeNode = activeSubcategory;
        if (activeSubSubcategory !== 'all') {
          activeNode = activeSubSubcategory;
        }
      }

      const allowedSlugs = allowedSlugMap.get(activeNode);
      if (allowedSlugs) {
        currentProducts = products.filter((product) => product.categorySlug && allowedSlugs.has(product.categorySlug));
      } else {
        currentProducts = products.filter((product) => product.categorySlug === activeNode);
      }
    }
  }

  const normalizedSearch = searchQuery.toLowerCase().trim();
  if (normalizedSearch) {
    currentProducts = currentProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(normalizedSearch) ||
        (product.description && product.description.toLowerCase().includes(normalizedSearch))
    );
  }

  if (activeCategory === 'all') {
    const makeupSlugs = allowedSlugMap.get('makeup') ?? new Set<string>();
    return rankAllProducts(currentProducts, makeupSlugs);
  }

  return currentProducts;
}
