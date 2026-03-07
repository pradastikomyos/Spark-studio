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

export const getParentOptions = (categories: Category[], editingId: number | null): Category[] =>
  categories
    .filter((category) => category.parent_id === null && category.id !== editingId)
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

export const getOrphanChildren = (categories: Category[], parents: Category[]): Category[] => {
  const parentIds = new Set(parents.map((category) => category.id));
  return categories
    .filter((category) => category.parent_id !== null && !parentIds.has(category.parent_id))
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name));
};

export const getParentNameMap = (categories: Category[]): Map<number, string> =>
  new Map(categories.map((category) => [category.id, category.name]));
