import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BeautyPosterManager from './BeautyPosterManager';

const controllerState = {
  loading: false,
  saving: false,
  posters: [],
  selectedPoster: null,
  title: 'Poster Hero',
  slug: 'poster-hero',
  imageUrl: 'https://example.com/poster.jpg',
  isActive: true,
  showUrlModal: true,
  urlDraft: 'https://example.com/draft.jpg',
  tags: [],
  productSearch: '',
  searchingProducts: false,
  productResults: [],
  activeDragPreview: null,
  isDraggingAny: false,
  sensors: [] as unknown[],
  canvasRef: { current: null },
  uploadInputRef: { current: null },
  editorTitle: 'Edit Poster',
  isDirty: true,
  setTitle: vi.fn(),
  setSlug: vi.fn(),
  setIsActive: vi.fn(),
  setShowUrlModal: vi.fn(),
  setUrlDraft: vi.fn(),
  setTags: vi.fn(),
  openEditor: vi.fn(),
  searchProducts: vi.fn(),
  handleUploadImage: vi.fn(),
  handleSelectVariant: vi.fn(),
  onPosterDragEnd: vi.fn(),
  handleTagPointerDown: vi.fn(),
  handleTagPointerMove: vi.fn(),
  handleTagPointerUp: vi.fn(),
  handleResizePointerDown: vi.fn(),
  handleResizePointerMove: vi.fn(),
  handleResizePointerUp: vi.fn(),
  applyChanges: vi.fn().mockResolvedValue(null),
  resetEditor: vi.fn().mockResolvedValue(undefined),
  handleApplyUrl: vi.fn(),
  handleDragStart: vi.fn(),
  handleDragComplete: vi.fn(),
  handleDragCancel: vi.fn(),
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
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('./beauty-poster-manager/useBeautyPosterManagerController', () => ({
  useBeautyPosterManagerController: () => controllerState,
}));

vi.mock('./beauty-poster-manager/BeautyPosterEditorForm', () => ({
  BeautyPosterEditorForm: () => <div>beauty-editor-form</div>,
}));

vi.mock('./beauty-poster-manager/BeautyPosterCanvasSection', () => ({
  BeautyPosterCanvasSection: () => <div>beauty-canvas-section</div>,
}));

vi.mock('./beauty-poster-manager/BeautyPosterSidebar', () => ({
  BeautyPosterSidebar: () => <div>beauty-sidebar</div>,
}));

vi.mock('./beauty-poster-manager/BeautyPosterUrlModal', () => ({
  BeautyPosterUrlModal: ({ open }: { open: boolean }) => (open ? <div>beauty-url-modal</div> : null),
}));

vi.mock('./beauty-poster-manager/BeautyPosterActionBar', () => ({
  BeautyPosterActionBar: ({ editorTitle }: { editorTitle: string }) => <div>{editorTitle}</div>,
}));

describe('BeautyPosterManager', () => {
  it('renders modular sections through the controller composition', () => {
    render(<BeautyPosterManager />);

    expect(screen.getByText('beauty-editor-form')).toBeInTheDocument();
    expect(screen.getByText('beauty-canvas-section')).toBeInTheDocument();
    expect(screen.getByText('beauty-sidebar')).toBeInTheDocument();
    expect(screen.getByText('beauty-url-modal')).toBeInTheDocument();
    expect(screen.getByText('Edit Poster')).toBeInTheDocument();
  });
});
