import type { Category, CategoryDraft } from './categoryManagerTypes';

export const emptyCategoryDraft = (): CategoryDraft => ({
  name: '',
  slug: '',
  is_active: true,
  parent_id: null,
});

export const toCategoryDraft = (category: Category): CategoryDraft => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  is_active: category.is_active,
  parent_id: category.parent_id,
});

const isDescendant = (categoryId: number, targetId: number, allCategories: Category[]): boolean => {
  let current = allCategories.find((c) => c.id === categoryId);
  const visited = new Set<number>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.parent_id === targetId) return true;
    const parentId = current.parent_id;
    current = allCategories.find((c) => c.id === parentId);
  }
  return false;
};

export const getParentOptions = (categories: Category[], editingId: number | null): Category[] =>
  categories
    .filter((category) => {
      if (editingId === null) return true;
      if (category.id === editingId) return false;
      return !isDescendant(category.id, editingId, categories);
    })
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name));

export const getParents = (categories: Category[]): Category[] =>
  categories
    .filter((category) => category.parent_id === null)
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name));

export const getChildrenByParent = (categories: Category[]): Map<number, Category[]> => {
  const map = new Map<number, Category[]>();
  categories
    .filter((category) => category.parent_id !== null)
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .forEach((child) => {
      const parentId = child.parent_id as number;
      const list = map.get(parentId) ?? [];
      list.push(child);
      map.set(parentId, list);
    });
  return map;
};

export const getOrphanChildren = (categories: Category[]): Category[] => {
  const allCategoryIds = new Set(categories.map((c) => c.id));
  return categories
    .filter((category) => category.parent_id !== null && !allCategoryIds.has(category.parent_id))
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name));
};

export const getParentNameMap = (categories: Category[]): Map<number, string> =>
  new Map(categories.map((category) => [category.id, category.name]));
