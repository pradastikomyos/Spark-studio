import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProductOrderSuccessPage from './ProductOrderSuccessPage';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    initialized: true,
    session: { access_token: 'token', user: { email: 'spark@example.com' } },
  }),
}));

vi.mock('./product-order-success/useProductOrderSuccessController', () => ({
  useProductOrderSuccessController: () => ({
    order: {
      id: 1,
      order_number: 'ORDER-2',
      channel: 'midtrans',
      payment_status: 'paid',
      status: 'processing',
      pickup_code: 'PICKUP-1',
      pickup_status: 'pending_pickup',
      pickup_expires_at: '2026-03-08T10:00:00Z',
      paid_at: '2026-03-07T10:00:00Z',
      total: 125000,
      created_at: '2026-03-07T10:00:00Z',
      payment_data: { payment_type: 'qris' },
    },
    items: [
      {
        id: 1,
        quantity: 1,
        price: 125000,
        subtotal: 125000,
        productName: 'Spark Hoodie',
        variantName: 'L',
      },
    ],
    loading: false,
    error: null,
    refreshing: false,
    loadingTimedOut: false,
    autoSyncInProgress: false,
    pickupCode: 'PICKUP-1',
    totalItems: 1,
    paymentMethodLabel: 'QRIS',
    handleSyncStatus: vi.fn(),
    handleRetryLoad: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/order/product/success/ORDER-2', state: { paymentSuccess: true } }),
    useParams: () => ({ orderNumber: 'ORDER-2' }),
  };
});

describe('ProductOrderSuccessPage', () => {
  it('renders success order composition', () => {
    render(
      <MemoryRouter>
        <ProductOrderSuccessPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Payment Method')).toBeInTheDocument();
    expect(screen.getByText('QRIS')).toBeInTheDocument();
    expect(screen.getByText('Spark Hoodie')).toBeInTheDocument();
  });
});
