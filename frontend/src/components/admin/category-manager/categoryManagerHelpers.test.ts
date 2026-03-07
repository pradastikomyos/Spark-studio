import { describe, expect, it } from 'vitest';
import {
  getChildrenByParent,
  getOrphanChildren,
  getParentNameMap,
  getParentOptions,
  getParents,
} from './categoryManagerHelpers';
import type { Category } from './categoryManagerTypes';

const categories: Category[] = [
  { id: 2, name: 'Face', slug: 'face', is_active: true, parent_id: 1, created_at: null, updated_at: null },
  { id: 1, name: 'Beauty', slug: 'beauty', is_active: true, parent_id: null, created_at: null, updated_at: null },
  { id: 3, name: 'Hair', slug: 'hair', is_active: true, parent_id: null, created_at: null, updated_at: null },
  { id: 4, name: 'Orphan', slug: 'orphan', is_active: false, parent_id: 999, created_at: null, updated_at: null },
];

describe('categoryManagerHelpers', () => {
  it('builds sorted parent options excluding the editing category', () => {
    expect(getParentOptions(categories, 1).map((category) => category.id)).toEqual([3]);
  });

  it('groups parents and children correctly', () => {
    expect(getParents(categories).map((category) => category.id)).toEqual([1, 3]);
    expect(getChildrenByParent(categories).get(1)?.map((category) => category.id)).toEqual([2]);
  });

  it('detects orphan children and parent names', () => {
    const parents = getParents(categories);
    expect(getOrphanChildren(categories, parents).map((category) => category.id)).toEqual([4]);
    expect(getParentNameMap(categories).get(1)).toBe('Beauty');
  });
});
