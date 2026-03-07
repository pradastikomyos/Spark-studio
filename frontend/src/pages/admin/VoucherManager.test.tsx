import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VoucherManager from './VoucherManager';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
  }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: vi.fn(),
  }),
}));

vi.mock('../../hooks/useSessionRefresh', () => ({
  useSessionRefresh: vi.fn(),
}));

vi.mock('../../components/AdminLayout', () => ({
  default: ({ children, headerActions }: { children: ReactNode; headerActions?: ReactNode }) => (
    <div>
      <div>{headerActions}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock('./voucher-manager/useVoucherManagerController', () => ({
  useVoucherManagerController: () => ({
    vouchers: [],
    statsByVoucherId: {},
    visibleCategories: [],
    loading: false,
    error: null,
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
    statusFilter: 'all',
    showForm: true,
    editingVoucher: null,
    formState: {
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      valid_from: '',
      valid_until: '',
      quota: '',
      min_purchase: '',
      max_discount: '',
      applicable_categories: [],
      is_active: true,
    },
    formError: null,
    saving: false,
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    setStatusFilter: vi.fn(),
    setShowForm: vi.fn(),
    openCreateForm: vi.fn(),
    openEditForm: vi.fn(),
    updateForm: vi.fn(),
    toggleCategory: vi.fn(),
    handleSubmit: vi.fn(),
    handleDelete: vi.fn(),
    handleToggleActive: vi.fn(),
  }),
}));

describe('VoucherManager', () => {
  it('renders empty state and modal composition', () => {
    render(<VoucherManager />);

    expect(screen.getByText('admin.vouchers.empty')).toBeInTheDocument();
    expect(screen.getByText('admin.vouchers.form.createTitle')).toBeInTheDocument();
  });
});
