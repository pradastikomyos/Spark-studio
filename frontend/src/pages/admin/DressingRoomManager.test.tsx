import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DressingRoomManager from './DressingRoomManager';
import type { DressingRoomCollection } from './dressing-room-manager/dressingRoomManagerTypes';

const controllerState = {
  view: 'list' as 'list' | 'editor',
  collections: [],
  selectedCollection: null as DressingRoomCollection | null,
  looks: [],
  loading: false,
  saving: false,
  formTitle: '',
  formDescription: '',
  showCreateForm: false,
  activePhotoIndexMap: new Map<number, number>(),
  uploadingLookId: null,
  pendingUpload: null,
  containerWidth: 700,
  isDragging: false,
  editingModelName: false,
  modelNameValue: '',
  editingCollectionInfo: false,
  collectionTitle: 'Editorial Drop',
  collectionDesc: '',
  productSearch: '',
  productResults: [],
  searchingProducts: false,
  showProductPicker: false,
  setView: vi.fn(),
  setSelectedCollection: vi.fn(),
  setFormTitle: vi.fn(),
  setFormDescription: vi.fn(),
  setShowCreateForm: vi.fn(),
  setPendingUpload: vi.fn(),
  setIsDragging: vi.fn(),
  setEditingModelName: vi.fn(),
  setModelNameValue: vi.fn(),
  setEditingCollectionInfo: vi.fn(),
  setCollectionTitle: vi.fn(),
  setCollectionDesc: vi.fn(),
  setShowProductPicker: vi.fn(),
  fetchCollections: vi.fn(),
  fetchLooks: vi.fn(),
  handleCreateCollection: vi.fn(),
  handleToggleActive: vi.fn(),
  handleDeleteCollection: vi.fn(),
  openEditor: vi.fn(),
  handleSaveCollectionInfo: vi.fn(),
  handleAddLook: vi.fn(),
  handleAddPhoto: vi.fn(),
  handleReplacePhoto: vi.fn(),
  handleDeletePhoto: vi.fn(),
  handleSaveModelName: vi.fn(),
  handleDeleteLook: vi.fn(),
  searchProducts: vi.fn(),
  handleLinkProduct: vi.fn(),
  handleUnlinkProduct: vi.fn(),
  containerRef: vi.fn(),
  getActivePhotoIndex: vi.fn(() => 0),
  setActivePhotoIndex: vi.fn(),
  goPhotoNext: vi.fn(),
  goPhotoPrev: vi.fn(),
  handleDragEnd: vi.fn(() => vi.fn()),
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

vi.mock('./dressing-room-manager/useDressingRoomManagerController', () => ({
  useDressingRoomManagerController: () => controllerState,
}));

vi.mock('./dressing-room-manager/DressingRoomCollectionsView', () => ({
  DressingRoomCollectionsView: () => <div>dressing-room-collections</div>,
}));

vi.mock('./dressing-room-manager/DressingRoomEditorView', () => ({
  DressingRoomEditorView: ({ selectedCollection }: { selectedCollection: { title: string } | null }) => (
    <div>{selectedCollection ? `editor:${selectedCollection.title}` : 'editor:empty'}</div>
  ),
}));

describe('DressingRoomManager', () => {
  beforeEach(() => {
    controllerState.view = 'list';
    controllerState.selectedCollection = null;
  });

  it('renders the collections view in list mode', () => {
    render(<DressingRoomManager />);

    expect(screen.getByText('dressing-room-collections')).toBeInTheDocument();
  });

  it('renders the editor view in editor mode', () => {
    controllerState.view = 'editor';
    controllerState.selectedCollection = {
      id: 1,
      title: 'Editorial Drop',
      slug: 'editorial-drop',
      description: null,
      cover_image_url: null,
      is_active: true,
      sort_order: 0,
    };

    render(<DressingRoomManager />);

    expect(screen.getByText('editor:Editorial Drop')).toBeInTheDocument();
  });
});
