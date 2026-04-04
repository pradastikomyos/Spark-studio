import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProductCheckoutPage from './ProductCheckoutPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'spark@example.com' },
    session: { access_token: 'token' },
    initialized: true,
    getValidAccessToken: vi.fn().mockResolvedValue('token'),
    refreshSession: vi.fn(),
  }),
}));

vi.mock('../contexts/cartStore', () => ({
  useCart: () => ({
    items: [],
    removeItem: vi.fn(),
  }),
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

vi.mock('./product-checkout/useProductCheckoutController', () => ({
  useProductCheckoutController: () => ({
    customerName: 'Spark User',
    customerPhone: '08123456789',
    error: 'Payment system not ready',
    loading: false,
    voucherCode: 'SPARK',
    appliedVoucher: null,
    voucherError: null,
    applyingVoucher: false,
    orderItems: [
      {
        product_variant_id: 1,
        product_name: 'Spark Tee',
        variant_name: 'XL',
        quantity: 1,
        unit_price: 50000,
        subtotal: 50000,
      },
    ],
    subtotal: 50000,
    discountAmount: 0,
    finalTotal: 50000,
    canCheckout: true,
    setCustomerName: vi.fn(),
    setCustomerPhone: vi.fn(),
    setVoucherCode: vi.fn(),
    handleApplyVoucher: vi.fn(),
    handleRemoveVoucher: vi.fn(),
    handlePay: vi.fn(),
    handleCashierCheckout: vi.fn(),
    cashierDisabled: false,
  }),
}));

describe('ProductCheckoutPage', () => {
  it('renders checkout composition and summary', () => {
    render(
      <MemoryRouter>
        <ProductCheckoutPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Complete Payment')).toBeInTheDocument();
    expect(screen.getByText('Payment system not ready')).toBeInTheDocument();
    expect(screen.getByText('Spark Tee')).toBeInTheDocument();
  });
});
