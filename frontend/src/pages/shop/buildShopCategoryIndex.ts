import type { Category } from '../../hooks/useCategories';

export type ShopCategoryIndex = {
  parentCategories: Category[];
  childCategoriesByParentSlug: Map<string, Category[]>;
  allowedSlugMap: Map<string, Set<string>>;
};

export function buildShopCategoryIndex(categories: Category[]): ShopCategoryIndex {
  const parents: Category[] = [];
  const childrenByParentId = new Map<number, Category[]>();

  for (const category of categories) {
    if (category.parent_id === null) {
      parents.push(category);
      continue;
    }

    const currentChildren = childrenByParentId.get(category.parent_id) ?? [];
    currentChildren.push(category);
    childrenByParentId.set(category.parent_id, currentChildren);
  }

  const getAllDescendantSlugs = (categoryId: number): string[] => {
    const children = childrenByParentId.get(categoryId) ?? [];
    let slugs: string[] = [];

    for (const child of children) {
      slugs.push(child.slug);
      slugs = slugs.concat(getAllDescendantSlugs(child.id));
    }

    return slugs;
  };

  const allowedSlugMap = new Map<string, Set<string>>();
  for (const category of categories) {
    allowedSlugMap.set(category.slug, new Set([category.slug, ...getAllDescendantSlugs(category.id)]));
  }

  const childCategoriesByParentSlug = new Map<string, Category[]>();
  for (const category of categories) {
    const children = childrenByParentId.get(category.id) ?? [];
    childCategoriesByParentSlug.set(
      category.slug,
      children.slice().sort((left, right) => left.name.localeCompare(right.name))
    );
  }

  return {
    parentCategories: parents.slice().sort((left, right) => left.name.localeCompare(right.name)),
    childCategoriesByParentSlug,
    allowedSlugMap,
  };
}
