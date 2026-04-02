import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProductOrders from './ProductOrders';

const navigateMock = vi.fn();
let locationSearch = '';

const controllerState = {
  activeTab: 'pending' as const,
  scannerOpen: true,
  lookupCode: 'PRX-123',
  lookupError: null,
  details: { order: { pickup_code: 'PRX-123', total: 10000, profiles: { name: 'Nadia' } }, items: [] },
  submitting: false,
  actionError: null,
  inputRef: { current: null },
  pendingOrders: [{ id: 1 }],
  todaysOrders: [{ id: 2 }],
  completedOrders: [{ id: 3 }],
  displayOrders: [{ id: 1 }],
  menuSections: [{ id: 'store', items: [] }],
  setActiveTab: vi.fn(),
  setScannerOpen: vi.fn(),
  setLookupCode: vi.fn(),
  handleLookup: vi.fn(),
  handleScan: vi.fn(),
  handleSelectOrder: vi.fn(),
  handleCloseDetails: vi.fn(),
  handleCompletePickup: vi.fn(),
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

vi.mock('../../components/admin/QRScannerModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>qr-scanner-open</div> : null),
}));

vi.mock('../../hooks/useProductOrders', () => ({
  useProductOrders: () => ({
    data: {
      orders: [],
      pendingCount: 4,
    },
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('./product-orders/useProductOrdersController', () => ({
  useProductOrdersController: () => controllerState,
}));

vi.mock('./product-orders/ProductOrdersLookupPanel', () => ({
  ProductOrdersLookupPanel: ({ lookupCode }: { lookupCode: string }) => <div>lookup:{lookupCode}</div>,
}));

vi.mock('./product-orders/ProductOrdersListSection', () => ({
  ProductOrdersListSection: ({ pendingCount }: { pendingCount: number }) => <div>orders:{pendingCount}</div>,
}));

vi.mock('./product-orders/ProductOrderDetailsModal', () => ({
  ProductOrderDetailsModal: ({ details }: { details: { order: { pickup_code: string } } | null }) =>
    details ? <div>details:{details.order.pickup_code}</div> : null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/admin/product-orders', search: locationSearch }),
    useNavigate: () => navigateMock,
  };
});

describe('ProductOrders', () => {
  beforeEach(() => {
    locationSearch = '';
    navigateMock.mockReset();
    controllerState.setLookupCode.mockReset();
    controllerState.handleSelectOrder.mockReset();
  });

  it('renders modular sections through the controller composition', () => {
    render(<ProductOrders />);

    expect(screen.getByText('lookup:PRX-123')).toBeInTheDocument();
    expect(screen.getByText('orders:1')).toBeInTheDocument();
    expect(screen.getByText('qr-scanner-open')).toBeInTheDocument();
    expect(screen.getByText('details:PRX-123')).toBeInTheDocument();
    expect(screen.getByText('Scan QR')).toBeInTheDocument();
  });

  it('hydrates pickup code from the query string into the existing verification flow', async () => {
    locationSearch = '?pickupCode=prx-999';

    render(<ProductOrders />);

    await waitFor(() => expect(controllerState.setLookupCode).toHaveBeenCalledWith('PRX-999'));
    expect(controllerState.handleSelectOrder).toHaveBeenCalledWith('PRX-999');
    expect(navigateMock).toHaveBeenCalledWith(
      { pathname: '/admin/product-orders', search: '' },
      { replace: true }
    );

    locationSearch = '';
  });
});
