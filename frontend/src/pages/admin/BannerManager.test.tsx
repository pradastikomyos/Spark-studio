import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BannerManager from './BannerManager';

const controllerState = {
  banners: [],
  loading: false,
  showForm: true,
  editingBanner: null,
  uploading: false,
  saving: false,
  formData: {
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    banner_type: 'hero' as const,
    display_order: 0,
    is_active: true,
  },
  stageBannersOrder: [],
  hasUnsavedChanges: true,
  applyingOrder: false,
  groupedBanners: {
    hero: [],
    stage: [],
    promo: [],
    events: [],
    shop: [],
  },
  setFormData: vi.fn(),
  openCreateForm: vi.fn(),
  closeForm: vi.fn(),
  handleImageUpload: vi.fn(),
  handleSubmit: vi.fn(),
  handleEdit: vi.fn(),
  handleDelete: vi.fn(),
  handleToggleActive: vi.fn(),
  handleStageOrderChange: vi.fn(),
  handleApplyOrder: vi.fn(),
  handleCancelOrder: vi.fn(),
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: vi.fn(),
  }),
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

vi.mock('./banner-manager/useBannerManagerController', () => ({
  useBannerManagerController: () => controllerState,
}));

vi.mock('./banner-manager/BannerTypeSection', () => ({
  BannerTypeSection: ({ type }: { type: string }) => <div>{`section:${type}`}</div>,
}));

vi.mock('./banner-manager/BannerFormModal', () => ({
  BannerFormModal: ({ open }: { open: boolean }) => (open ? <div>banner-form-modal</div> : null),
}));

describe('BannerManager', () => {
  it('renders modular sections and modal composition', () => {
    render(<BannerManager />);

    expect(screen.getByText('Add Banner')).toBeInTheDocument();
    expect(screen.getByText('section:hero')).toBeInTheDocument();
    expect(screen.getByText('section:stage')).toBeInTheDocument();
    expect(screen.getByText('banner-form-modal')).toBeInTheDocument();
  });
});
