import type { Product } from '../../hooks/useProducts';

const GOLD_SLUGS = new Set(['golden-charm-pendant', 'golden-charm-welded']);
const SILVER_SLUGS = new Set(['silver-charm-pendant', 'silver-charm-welded']);

export function filterGoldCharmProducts(products: Product[]) {
  return products.filter((product) => product.categorySlug && GOLD_SLUGS.has(product.categorySlug));
}

export function filterSilverCharmProducts(products: Product[]) {
  return products.filter((product) => product.categorySlug && SILVER_SLUGS.has(product.categorySlug));
}

export function filterNewestCharmProducts(products: Product[], charmSlugs: Set<string> | undefined) {
  if (!charmSlugs) return [];

  return [...products]
    .filter((product) => product.categorySlug && charmSlugs.has(product.categorySlug))
    .sort((left, right) => right.id - left.id)
    .slice(0, 10);
}

export function filterBestSellerCharmProducts(products: Product[], bestSellerIds: Set<number>) {
  return products.filter((product) => bestSellerIds.has(product.id));
}

export function rankAllProducts(products: Product[], makeupSlugsSet: Set<string>) {
  return [...products].sort((left, right) => {
    const getScore = (product: Product) => {
      const slug = product.categorySlug?.toLowerCase() || '';
      if (slug === 'headliner') return 3;
      if (slug === 'starglitter' || slug === 'star-glitter') return 2;
      if (makeupSlugsSet.has(slug)) return 1;
      return 0;
    };

    const leftScore = getScore(left);
    const rightScore = getScore(right);

    if (leftScore !== rightScore) return rightScore - leftScore;
    return 0;
  });
}
