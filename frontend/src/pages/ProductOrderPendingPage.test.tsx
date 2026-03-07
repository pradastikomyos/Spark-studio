import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProductOrderPendingPage from './ProductOrderPendingPage';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    session: { access_token: 'token' },
  }),
}));

vi.mock('./product-order-pending/useProductOrderPendingController', () => ({
  useProductOrderPendingController: () => ({
    loading: false,
    error: null,
    refreshing: false,
    order: {
      id: 1,
      order_number: 'ORDER-1',
      payment_status: 'pending',
      status: 'pending',
      total: 150000,
      created_at: '2026-03-07T10:00:00Z',
      payment_url: 'https://example.com/pay',
      payment_data: null,
      pickup_code: null,
      pickup_status: null,
      pickup_expires_at: null,
      paid_at: null,
    },
    items: [
      {
        id: 1,
        quantity: 2,
        price: 50000,
        subtotal: 100000,
        productName: 'Spark Tee',
        variantName: 'XL',
      },
    ],
    paymentInfo: {
      paymentType: 'bank_transfer',
      expiryAt: null,
      primaryCode: '12345',
      primaryCodeLabel: 'BCA Virtual Account',
      qrString: null,
      billerCode: null,
      store: null,
      actions: [],
    },
    instructionSteps: ['Step 1', 'Step 2'],
    countdown: { hours: 1, minutes: 2, seconds: 3 },
    statusView: {
      kind: 'pending',
      title: 'Awaiting Payment',
      description: 'Pending',
      icon: 'schedule',
      iconBg: 'bg-orange-50',
      iconText: 'text-orange-500',
      accentText: 'text-primary',
      allowPayNow: true,
      allowInstructions: true,
    },
    handleSyncStatus: vi.fn(),
    copyToClipboard: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/order/product/pending/ORDER-1', state: null }),
    useParams: () => ({ orderNumber: 'ORDER-1' }),
  };
});

describe('ProductOrderPendingPage', () => {
  it('renders pending order composition', () => {
    render(
      <MemoryRouter>
        <ProductOrderPendingPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Awaiting Payment')).toBeInTheDocument();
    expect(screen.getByText('BCA Virtual Account')).toBeInTheDocument();
    expect(screen.getByText('Spark Tee')).toBeInTheDocument();
  });
});
