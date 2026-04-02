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

const formatDressingRoomError = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

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

  const refreshSelectedLooks = useCallback(async () => {
    if (!selectedCollection) return;
    await fetchLooks(selectedCollection.id);
  }, [fetchLooks, selectedCollection]);

  const resetProductPicker = useCallback(() => {
    setShowProductPicker(false);
    setProductSearch('');
    setProductResults([]);
  }, []);

  const runControllerTask = useCallback(
    async <T,>(task: () => Promise<T>, options: {
      errorMessage: string;
      successMessage?: string;
      onSuccess?: (result: T) => Promise<void> | void;
      onFinally?: () => void;
    }) => {
      try {
        const result = await task();
        if (options.successMessage) {
          showToast('success', options.successMessage);
        }
        await options.onSuccess?.(result);
        return result;
      } catch (error) {
        showToast('error', formatDressingRoomError(error, options.errorMessage));
        return null;
      } finally {
        options.onFinally?.();
      }
    },
    [showToast]
  );

  const handleCreateCollection = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    await runControllerTask(
      () => createDressingRoomCollection({ title: formTitle, description: formDescription, sortOrder: collections.length }),
      {
        successMessage: 'Koleksi berhasil dibuat!',
        errorMessage: 'Failed to create collection',
        onSuccess: async () => {
          setFormTitle('');
          setFormDescription('');
          setShowCreateForm(false);
          await fetchCollections();
        },
        onFinally: () => setSaving(false),
      }
    );
  };

  const handleToggleActive = async (collection: DressingRoomCollection) => {
    await runControllerTask(() => toggleDressingRoomCollection(collection), {
      errorMessage: 'Failed to toggle collection',
      onSuccess: async () => {
        await fetchCollections();
      },
    });
  };

  const handleDeleteCollection = async (id: number) => {
    if (!confirm('Hapus koleksi ini? Semua looks akan ikut terhapus.')) return;
    await runControllerTask(() => deleteDressingRoomCollection(id), {
      successMessage: 'Koleksi dihapus.',
      errorMessage: 'Failed to delete collection',
      onSuccess: async () => {
        await fetchCollections();
      },
    });
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
    await runControllerTask(
      () =>
        saveDressingRoomCollectionInfo({
          id: selectedCollection.id,
          title: collectionTitle,
          description: collectionDesc,
        }),
      {
        successMessage: 'Info koleksi diperbarui!',
        errorMessage: 'Failed to save collection info',
        onSuccess: async (newSlug) => {
          setSelectedCollection({
            ...selectedCollection,
            title: collectionTitle.trim(),
            description: collectionDesc.trim() || null,
            slug: newSlug,
          });
          await fetchCollections();
        },
        onFinally: () => setEditingCollectionInfo(false),
      }
    );
  };

  const handleAddLook = async () => {
    if (!selectedCollection) return;
    const nextNumber = looks.length + 1;
    await runControllerTask(
      () => addDressingRoomLook({ collectionId: selectedCollection.id, nextNumber, sortOrder: looks.length }),
      {
        successMessage: `Look ${nextNumber} ditambahkan!`,
        errorMessage: 'Failed to add look',
        onSuccess: async () => {
          await refreshSelectedLooks();
        },
      }
    );
  };

  const handleAddPhoto = async (lookId: number, file: File) => {
    if (!selectedCollection) return;
    setUploadingLookId(lookId);
    await runControllerTask(
      () =>
        addDressingRoomPhoto({
          collectionId: selectedCollection.id,
          lookId,
          file,
          existingLooks: looks,
        }),
      {
        successMessage: 'Foto look ditambahkan!',
        errorMessage: 'Upload gagal',
        onSuccess: async (nextSortOrder) => {
          await refreshSelectedLooks();
          setActivePhotoIndexMap((current) => new Map(current).set(lookId, nextSortOrder));
        },
        onFinally: () => setUploadingLookId(null),
      }
    );
  };

  const handleReplacePhoto = async (lookId: number, photoId: number, previousUrl: string, file: File) => {
    if (!selectedCollection) return;
    setUploadingLookId(lookId);
    await runControllerTask(
      () => replaceDressingRoomPhoto({ collectionId: selectedCollection.id, lookId, photoId, previousUrl, file }),
      {
        successMessage: 'Foto berhasil diganti!',
        errorMessage: 'Upload gagal',
        onSuccess: async () => {
          await refreshSelectedLooks();
        },
        onFinally: () => setUploadingLookId(null),
      }
    );
  };

  const handleDeletePhoto = async (photoId: number, imageUrl: string) => {
    if (!selectedCollection) return;
    if (!confirm('Hapus foto ini?')) return;
    await runControllerTask(() => deleteDressingRoomPhoto({ photoId, imageUrl }), {
      successMessage: 'Foto dihapus.',
      errorMessage: 'Failed to delete photo',
      onSuccess: async () => {
        const look = looks.find((entry) => entry.photos.some((photo) => photo.id === photoId));
        if (look) {
          const currentIndex = activePhotoIndexMap.get(look.id) ?? 0;
          setActivePhotoIndexMap((current) => new Map(current).set(look.id, Math.max(0, currentIndex - 1)));
        }
        await refreshSelectedLooks();
      },
    });
  };

  const handleSaveModelName = async (lookId: number) => {
    await runControllerTask(() => saveDressingRoomModelName({ lookId, modelName: modelNameValue }), {
      errorMessage: 'Failed to save model name',
      onSuccess: async () => {
        await refreshSelectedLooks();
      },
      onFinally: () => setEditingModelName(false),
    });
  };

  const handleDeleteLook = async (lookId: number, imageUrl: string) => {
    if (!selectedCollection) return;
    if (!confirm('Hapus look ini?')) return;
    await runControllerTask(() => deleteDressingRoomLook({ lookId, imageUrl }), {
      successMessage: 'Look dihapus.',
      errorMessage: 'Failed to delete look',
      onSuccess: async () => {
        setActivePhotoIndexMap((current) => {
          const next = new Map(current);
          next.delete(lookId);
          return next;
        });
        await refreshSelectedLooks();
      },
    });
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
    await runControllerTask(() => linkDressingRoomProduct({ lookId, variantId, sortOrder: look ? look.items.length : 0 }), {
      successMessage: 'Produk ditambahkan!',
      errorMessage: 'Failed to link product',
      onSuccess: async () => {
        resetProductPicker();
        await refreshSelectedLooks();
      },
    });
  };

  const handleUnlinkProduct = async (itemId: number) => {
    await runControllerTask(() => unlinkDressingRoomProduct(itemId), {
      errorMessage: 'Failed to unlink product',
      onSuccess: async () => {
        await refreshSelectedLooks();
      },
    });
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
