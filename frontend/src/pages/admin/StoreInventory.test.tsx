import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import StoreInventory from './StoreInventory';

const refetchMock = vi.fn();
const navigateMock = vi.fn();
const showToastMock = vi.fn();
const inventoryResult: {
  data: {
    products: [];
    categories: [];
    totalCount: number;
    diagnostics: {
      fetchMs: number;
      fullScan: boolean;
      source: 'rpc' | 'rpc-fallback';
      warning: string | null;
    };
  };
  error: null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: typeof refetchMock;
} = {
  data: {
    products: [],
    categories: [],
    totalCount: 0,
    diagnostics: { fetchMs: 1, fullScan: false, source: 'rpc' as const, warning: null },
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
  commitSearchInput: vi.fn(),
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
    showToast: showToastMock,
  }),
}));

vi.mock('../../components/AdminLayout', () => ({
  default: ({
    children,
    headerActions,
    headerSearchValue,
    headerSearchPlaceholder,
  }: {
    children: ReactNode;
    headerActions?: ReactNode;
    headerSearchValue?: string;
    headerSearchPlaceholder?: string;
  }) => (
    <div>
      <div>{headerActions}</div>
      {headerSearchPlaceholder ? (
        <input aria-label="header-search" placeholder={headerSearchPlaceholder} value={headerSearchValue ?? ''} readOnly />
      ) : null}
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
    useNavigate: () => navigateMock,
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
  beforeEach(() => {
    navigateMock.mockReset();
    showToastMock.mockReset();
  });

  it('keeps search in the header only and removes the duplicate toolbar field', () => {
    render(<StoreInventory />);

    expect(screen.getByPlaceholderText('Search products...')).toHaveValue('glow');
    expect(screen.getAllByPlaceholderText('Search products...')).toHaveLength(1);
  });

  it('renders empty state and composed product form', () => {
    render(<StoreInventory />);

    expect(screen.getByText('No Products Found')).toBeInTheDocument();
    expect(screen.getByText('product-form-open')).toBeInTheDocument();
  });

  it('routes pickup verification to product orders instead of using a placeholder alert', () => {
    render(<StoreInventory />);

    fireEvent.change(screen.getByPlaceholderText('ORD-XXXX-XXXX'), { target: { value: 'prx-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(showToastMock).toHaveBeenCalledWith('info', 'Membuka verifikasi pickup untuk PRX-123.');
    expect(navigateMock).toHaveBeenCalledWith({
      pathname: '/admin/product-orders',
      search: '?pickupCode=PRX-123',
    });
  });

  it('shows inventory diagnostics warning when fallback data is rendered', () => {
    inventoryResult.data.diagnostics = {
      fetchMs: 12,
      fullScan: false,
      source: 'rpc-fallback',
      warning: 'Stock filter is temporarily unavailable. Showing unfiltered inventory while RPC recovers.',
    };

    render(<StoreInventory />);

    expect(
      screen.getByText('Stock filter is temporarily unavailable. Showing unfiltered inventory while RPC recovers.')
    ).toBeInTheDocument();

    inventoryResult.data.diagnostics = { fetchMs: 1, fullScan: false, source: 'rpc', warning: null };
  });
});
