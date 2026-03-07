import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CategoryManager from './CategoryManager';

const controllerState = {
  categories: [],
  loading: false,
  editingId: null,
  draft: { name: '', slug: '', is_active: true, parent_id: null },
  slugTouched: false,
  error: 'Failed to load categories',
  expandedParents: [],
  setDraft: vi.fn(),
  setSlugTouched: vi.fn(),
  handleEdit: vi.fn(),
  handleNew: vi.fn(),
  handleSave: vi.fn(),
  handleDelete: vi.fn(),
  toggleExpanded: vi.fn(),
  parentOptions: [],
  parents: [],
  childrenByParent: new Map(),
  orphanChildren: [],
  parentNameMap: new Map(),
};

vi.mock('./category-manager/useCategoryManagerController', () => ({
  useCategoryManagerController: () => controllerState,
}));

vi.mock('./category-manager/CategoryEditorPanel', () => ({
  CategoryEditorPanel: () => <div>category-editor-panel</div>,
}));

vi.mock('./category-manager/CategoryTreeTable', () => ({
  CategoryTreeTable: () => <div>category-tree-table</div>,
}));

describe('CategoryManager', () => {
  it('returns null when closed', () => {
    const { container } = render(<CategoryManager isOpen={false} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal composition and error state', () => {
    render(<CategoryManager isOpen onClose={vi.fn()} onUpdate={vi.fn()} />);

    expect(screen.getByText('Category Management')).toBeInTheDocument();
    expect(screen.getByText('Failed to load categories')).toBeInTheDocument();
    expect(screen.getByText('category-editor-panel')).toBeInTheDocument();
    expect(screen.getByText('category-tree-table')).toBeInTheDocument();
  });
});
