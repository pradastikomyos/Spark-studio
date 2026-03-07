import { useCallback, useEffect, useState } from 'react';
import type { DressingRoomCollection, DressingRoomView, PendingUpload } from './dressingRoomManagerTypes';
import {
  addDressingRoomLook,
  addDressingRoomPhoto,
  createDressingRoomCollection,
  deleteDressingRoomCollection,
  deleteDressingRoomLook,
  deleteDressingRoomPhoto,
  linkDressingRoomProduct,
  replaceDressingRoomPhoto,
  saveDressingRoomCollectionInfo,
  saveDressingRoomModelName,
  toggleDressingRoomCollection,
  unlinkDressingRoomProduct,
} from './dressingRoomActions';
import { fetchDressingRoomCollections, fetchDressingRoomLooks, searchDressingRoomProducts } from './dressingRoomQueries';
import { useDressingRoomPhotoState } from './useDressingRoomPhotoState';

type ShowToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;

export function useDressingRoomManagerController(showToast: ShowToast) {
  const [view, setView] = useState<DressingRoomView>('list');
  const [collections, setCollections] = useState<DressingRoomCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<DressingRoomCollection | null>(null);
  const [looks, setLooks] = useState<Awaited<ReturnType<typeof fetchDressingRoomLooks>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [uploadingLookId, setUploadingLookId] = useState<number | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [editingModelName, setEditingModelName] = useState(false);
  const [modelNameValue, setModelNameValue] = useState('');
  const [editingCollectionInfo, setEditingCollectionInfo] = useState(false);
  const [collectionTitle, setCollectionTitle] = useState('');
  const [collectionDesc, setCollectionDesc] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Awaited<ReturnType<typeof searchDressingRoomProducts>>>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const {
    activePhotoIndexMap,
    containerWidth,
    isDragging,
    setActivePhotoIndexMap,
    setIsDragging,
    containerRef,
    getActivePhotoIndex,
    setActivePhotoIndex,
    goPhotoNext,
    goPhotoPrev,
    handleDragEnd,
  } = useDressingRoomPhotoState();

  const fetchLooks = useCallback(
    async (collectionId: number) => {
      try {
        setLooks(await fetchDressingRoomLooks(collectionId));
      } catch (error) {
        showToast('error', `Error: ${error instanceof Error ? error.message : 'Failed to load looks'}`);
      }
    },
    [showToast]
  );

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const nextCollections = await fetchDressingRoomCollections();
      setCollections(nextCollections);

      if (nextCollections.length === 1 && !selectedCollection) {
        setSelectedCollection(nextCollections[0]);
        setCollectionTitle(nextCollections[0].title);
        setCollectionDesc(nextCollections[0].description || '');
        setView('editor');
        void fetchLooks(nextCollections[0].id);
      }
    } catch (error) {
      showToast('error', `Error: ${error instanceof Error ? error.message : 'Failed to load collections'}`);
    } finally {
      setLoading(false);
    }
  }, [fetchLooks, selectedCollection, showToast]);

  useEffect(() => {
    void fetchCollections();
  }, [fetchCollections]);

  const handleCreateCollection = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      await createDressingRoomCollection({ title: formTitle, description: formDescription, sortOrder: collections.length });
      showToast('success', 'Koleksi berhasil dibuat!');
      setFormTitle('');
      setFormDescription('');
      setShowCreateForm(false);
      void fetchCollections();
    } catch (error) {
      showToast('error', `Error: ${error instanceof Error ? error.message : 'Failed to create collection'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (collection: DressingRoomCollection) => {
    try {
      await toggleDressingRoomCollection(collection);
      void fetchCollections();
    } catch (error) {
      showToast('error', `Error: ${error instanceof Error ? error.message : 'Failed to toggle collection'}`);
    }
  };

  const handleDeleteCollection = async (id: number) => {
    if (!confirm('Hapus koleksi ini? Semua looks akan ikut terhapus.')) return;
    try {
      await deleteDressingRoomCollection(id);
      showToast('success', 'Koleksi dihapus.');
      void fetchCollections();
    } catch (error) {
      showToast('error', `Error: ${error instanceof Error ? error.message : 'Failed to delete collection'}`);
    }
  };

  const openEditor = (collection: DressingRoomCollection) => {
    setSelectedCollection(collection);
    setCollectionTitle(collection.title);
    setCollectionDesc(collection.description || '');
    setView('editor');
    setActivePhotoIndexMap(new Map());
    void fetchLooks(collection.id);
  };

  const handleSaveCollectionInfo = async () => {
    if (!selectedCollection || !collectionTitle.trim()) return;
    try {
      const newSlug = await saveDressingRoomCollectionInfo({
        id: selectedCollection.id,
        title: collectionTitle,
        description: collectionDesc,
      });
      showToast('success', 'Info koleksi diperbarui!');
      setSelectedCollection({
        ...selectedCollection,
        title: collectionTitle.trim(),
        description: collectionDesc.trim() || null,
        slug: newSlug,
      });
      void fetchCollections();
    } catch (error) {
      showToast('error', `Error: ${error instanceof Error ? error.message : 'Failed to save collection info'}`);
    } finally {
      setEditingCollectionInfo(false);
    }
  };

  const handleAddLook = async () => {
    if (!selectedCollection) return;
    const nextNumber = looks.length + 1;
    try {
      await addDressingRoomLook({ collectionId: selectedCollection.id, nextNumber, sortOrder: looks.length });
      showToast('success', `Look ${nextNumber} ditambahkan!`);
      await fetchLooks(selectedCollection.id);
    } catch (error) {
      showToast('error', `Error: ${error instanceof Error ? error.message : 'Failed to add look'}`);
    }
  };

  const handleAddPhoto = async (lookId: number, file: File) => {
    if (!selectedCollection) return;
    setUploadingLookId(lookId);
    try {
      const nextSortOrder = await addDressingRoomPhoto({
        collectionId: selectedCollection.id,
        lookId,
        file,
        existingLooks: looks,
      });
      showToast('success', 'Foto look ditambahkan!');
      await fetchLooks(selectedCollection.id);
      setActivePhotoIndexMap((current) => new Map(current).set(lookId, nextSortOrder));
    } catch (error) {
      showToast('error', `Upload gagal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingLookId(null);
    }
  };

  const handleReplacePhoto = async (lookId: number, photoId: number, previousUrl: string, file: File) => {
    if (!selectedCollection) return;
    setUploadingLookId(lookId);
    try {
      await replaceDressingRoomPhoto({ collectionId: selectedCollection.id, lookId, photoId, previousUrl, file });
      showToast('success', 'Foto berhasil diganti!');
      await fetchLooks(selectedCollection.id);
    } catch (error) {
      showToast('error', `Upload gagal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingLookId(null);
    }
  };

  const handleDeletePhoto = async (photoId: number, imageUrl: string) => {
    if (!selectedCollection) return;
    if (!confirm('Hapus foto ini?')) return;
    try {
      await deleteDressingRoomPhoto({ photoId, imageUrl });
      showToast('success', 'Foto dihapus.');
      const look = looks.find((entry) => entry.photos.some((photo) => photo.id === photoId));
      if (look) {
        const currentIndex = activePhotoIndexMap.get(look.id) ?? 0;
        setActivePhotoIndexMap((current) => new Map(current).set(look.id, Math.max(0, currentIndex - 1)));
      }
      await fetchLooks(selectedCollection.id);
    } catch (error) {
      showToast('error', `Error: ${error instanceof Error ? error.message : 'Failed to delete photo'}`);
    }
  };

  const handleSaveModelName = async (lookId: number) => {
    try {
      await saveDressingRoomModelName({ lookId, modelName: modelNameValue });
      if (selectedCollection) void fetchLooks(selectedCollection.id);
    } catch (error) {
      showToast('error', `Error: ${error instanceof Error ? error.message : 'Failed to save model name'}`);
    } finally {
      setEditingModelName(false);
    }
  };

  const handleDeleteLook = async (lookId: number, imageUrl: string) => {
    if (!selectedCollection) return;
    if (!confirm('Hapus look ini?')) return;
    try {
      await deleteDressingRoomLook({ lookId, imageUrl });
      showToast('success', 'Look dihapus.');
      setActivePhotoIndexMap((current) => {
        const next = new Map(current);
        next.delete(lookId);
        return next;
      });
      void fetchLooks(selectedCollection.id);
    } catch (error) {
      showToast('error', `Error: ${error instanceof Error ? error.message : 'Failed to delete look'}`);
    }
  };

  const searchProducts = async (query: string) => {
    setProductSearch(query);
    if (query.length < 2) {
      setProductResults([]);
      return;
    }
    setSearchingProducts(true);
    try {
      setProductResults(await searchDressingRoomProducts(query));
    } catch (error) {
      showToast('error', error instanceof Error ? `Error: ${error.message}` : 'Error searching products');
    } finally {
      setSearchingProducts(false);
    }
  };

  const handleLinkProduct = async (lookId: number, variantId: number) => {
    const look = looks.find((entry) => entry.id === lookId);
    try {
      await linkDressingRoomProduct({ lookId, variantId, sortOrder: look ? look.items.length : 0 });
      showToast('success', 'Produk ditambahkan!');
      setShowProductPicker(false);
      setProductSearch('');
      setProductResults([]);
      if (selectedCollection) void fetchLooks(selectedCollection.id);
    } catch (error) {
      showToast('error', `Error: ${error instanceof Error ? error.message : 'Failed to link product'}`);
    }
  };

  const handleUnlinkProduct = async (itemId: number) => {
    try {
      await unlinkDressingRoomProduct(itemId);
      if (selectedCollection) void fetchLooks(selectedCollection.id);
    } catch (error) {
      showToast('error', `Error: ${error instanceof Error ? error.message : 'Failed to unlink product'}`);
    }
  };

  return {
    view,
    collections,
    selectedCollection,
    looks,
    loading,
    saving,
    formTitle,
    formDescription,
    showCreateForm,
    activePhotoIndexMap,
    uploadingLookId,
    pendingUpload,
    containerWidth,
    isDragging,
    editingModelName,
    modelNameValue,
    editingCollectionInfo,
    collectionTitle,
    collectionDesc,
    productSearch,
    productResults,
    searchingProducts,
    showProductPicker,
    setView,
    setSelectedCollection,
    setFormTitle,
    setFormDescription,
    setShowCreateForm,
    setPendingUpload,
    setIsDragging,
    setEditingModelName,
    setModelNameValue,
    setEditingCollectionInfo,
    setCollectionTitle,
    setCollectionDesc,
    setShowProductPicker,
    fetchCollections,
    fetchLooks,
    handleCreateCollection,
    handleToggleActive,
    handleDeleteCollection,
    openEditor,
    handleSaveCollectionInfo,
    handleAddLook,
    handleAddPhoto,
    handleReplacePhoto,
    handleDeletePhoto,
    handleSaveModelName,
    handleDeleteLook,
    searchProducts,
    handleLinkProduct,
    handleUnlinkProduct,
    containerRef,
    getActivePhotoIndex,
    setActivePhotoIndex,
    goPhotoNext,
    goPhotoPrev,
    handleDragEnd,
  };
}
