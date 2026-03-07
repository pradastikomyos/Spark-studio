import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StoreInventory from './StoreInventory';

const refetchMock = vi.fn();
const inventoryResult = {
  data: {
    products: [],
    categories: [],
    totalCount: 0,
    diagnostics: { fetchMs: 1, fullScan: false },
  },
  error: null,
  isLoading: false,
  isFetching: false,
  refetch: refetchMock,
};

const filterResult = {
  searchInput: 'glow',
  searchQuery: 'glow',
  categoryFilter: '',
  stockFilter: '',
  currentPage: 1,
  setSearchInput: vi.fn(),
  setCategoryFilter: vi.fn(),
  setStockFilter: vi.fn(),
  setCurrentPage: vi.fn(),
};

const productActionResult = {
  showProductForm: true,
  editingProduct: null,
  existingImages: [],
  existingImagesLoading: false,
  deletingProduct: null,
  saving: false,
  saveError: null,
  setDeletingProduct: vi.fn(),
  handleOpenCreate: vi.fn(),
  handleOpenEdit: vi.fn(),
  handleDelete: vi.fn(),
  handleSaveProduct: vi.fn(),
  closeProductForm: vi.fn(),
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: vi.fn(),
    session: null,
  }),
}));

vi.mock('../../hooks/useSessionRefresh', () => ({
  useSessionRefresh: vi.fn(),
}));

vi.mock('../../components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('../../components/AdminLayout', () => ({
  default: ({ children, headerActions }: { children: ReactNode; headerActions?: ReactNode }) => (
    <div>
      <div>{headerActions}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock('../../components/admin/CategoryManager', () => ({
  default: () => null,
}));

vi.mock('../../components/admin/QRScannerModal', () => ({
  default: () => null,
}));

vi.mock('../../components/admin/ProductFormModal', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>product-form-open</div> : null),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/admin/store', search: '?q=glow' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../hooks/useInventory', () => ({
  useInventory: () => inventoryResult,
}));

vi.mock('./store-inventory/useStoreInventoryFilters', () => ({
  useStoreInventoryFilters: () => filterResult,
}));

vi.mock('./store-inventory/useInventoryProductActions', () => ({
  useInventoryProductActions: () => productActionResult,
}));

describe('StoreInventory', () => {
  it('renders empty state and composed product form', () => {
    render(<StoreInventory />);

    expect(screen.getByDisplayValue('glow')).toBeInTheDocument();
    expect(screen.getByText('No Products Found')).toBeInTheDocument();
    expect(screen.getByText('product-form-open')).toBeInTheDocument();
  });
});
