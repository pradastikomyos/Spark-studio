import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import MyProductOrdersPage from './MyProductOrdersPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    session: { access_token: 'token' },
  }),
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('./my-product-orders/useMyProductOrdersView', () => ({
  useMyProductOrdersView: () => ({
    loading: false,
    isFetching: false,
    activeTab: 'pending',
    expandedOrder: null,
    syncingOrderId: null,
    pendingOrders: [],
    activeOrders: [],
    historyOrders: [],
    displayOrders: [],
    setActiveTab: vi.fn(),
    toggleExpand: vi.fn(),
    handleSyncStatus: vi.fn(),
    handleCancelOrder: vi.fn(),
    getStatusBadge: vi.fn(),
    getPickupInstruction: vi.fn(),
    shouldShowPickupExpiry: vi.fn(),
    isPickupReady: vi.fn(),
  }),
}));

describe('MyProductOrdersPage', () => {
  it('renders empty pending state', () => {
    render(
      <MemoryRouter>
        <MyProductOrdersPage />
      </MemoryRouter>
    );

    expect(screen.getByText('myOrders.title')).toBeInTheDocument();
    expect(screen.getByText('No pending payments')).toBeInTheDocument();
  });
});
