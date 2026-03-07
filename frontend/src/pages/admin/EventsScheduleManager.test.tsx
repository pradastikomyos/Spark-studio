import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventsScheduleManager from './EventsScheduleManager';

const authState = {
  signOut: vi.fn(),
  isAdmin: true,
};

const controllerState = {
  items: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  editingItem: null,
  form: {
    title: '',
    description: '',
    event_date: '',
    time_label: '',
    category: 'Workshop',
    image_url: '',
    image_path: '',
    image_bucket: 'events-schedule',
    placeholder_icon: 'photo_camera',
    is_coming_soon: true,
    button_text: 'Register',
    button_url: '',
    sort_order: 0,
    is_active: true,
  },
  saving: false,
  uploading: false,
  orderItems: [],
  hasUnsavedOrder: false,
  applyingOrder: false,
  filteredItems: [],
  previewItem: {
    id: -1,
    title: 'Preview Event',
    description: 'Preview description',
    event_date: '2026-01-01',
    time_label: '10:00 AM',
    category: 'Workshop',
    image_url: null,
    image_path: null,
    image_bucket: 'events-schedule',
    placeholder_icon: 'photo_camera',
    is_coming_soon: true,
    button_text: 'Register',
    button_url: null,
    sort_order: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  setSearchQuery: vi.fn(),
  setForm: vi.fn(),
  resetEditor: vi.fn(),
  handleEdit: vi.fn(),
  handleSave: vi.fn(),
  handleDelete: vi.fn(),
  handleToggleActive: vi.fn(),
  handleUploadImageFile: vi.fn(),
  handleOrderChange: vi.fn(),
  handleApplyOrder: vi.fn(),
  handleCancelOrder: vi.fn(),
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
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

vi.mock('./events-schedule-manager/useEventsScheduleManagerController', () => ({
  useEventsScheduleManagerController: () => controllerState,
}));

vi.mock('./events-schedule-manager/EventsScheduleItemsPanel', () => ({
  EventsScheduleItemsPanel: () => <div>events-items-panel</div>,
}));

vi.mock('./events-schedule-manager/EventsScheduleOrderPanel', () => ({
  EventsScheduleOrderPanel: () => <div>events-order-panel</div>,
}));

vi.mock('./events-schedule-manager/EventsScheduleEditorPanel', () => ({
  EventsScheduleEditorPanel: () => <div>events-editor-panel</div>,
}));

describe('EventsScheduleManager', () => {
  beforeEach(() => {
    authState.isAdmin = true;
  });

  it('renders modular sections for admins', () => {
    render(<EventsScheduleManager />);

    expect(screen.getByText('New Item')).toBeInTheDocument();
    expect(screen.getByText('events-items-panel')).toBeInTheDocument();
    expect(screen.getByText('events-order-panel')).toBeInTheDocument();
    expect(screen.getByText('events-editor-panel')).toBeInTheDocument();
  });

  it('renders access denied for non-admins', () => {
    authState.isAdmin = false;

    render(<EventsScheduleManager />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });
});
