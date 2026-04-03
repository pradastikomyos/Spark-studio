import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ImagePreview } from '../ProductImageUpload';
import {
  ADMIN_PRODUCT_DRAFT_KEY,
  ADMIN_PRODUCT_IMAGE_KEY,
  buildDraftSnapshot,
  EMPTY_DRAFT_SNAPSHOT,
  emptyDraft,
  getCategoryOptions,
  getIsDirty,
  getSaveTimeoutMs,
  validateProductDraft,
} from './productFormModalHelpers';
import {
  clearStoredImages,
  readStoredImages,
  restoreImagePreviews,
  revokeImagePreviewUrls,
  serializeImagePreviews,
  writeStoredImages,
} from './productFormModalStorage';
import type { ProductFormModalController, ProductFormModalProps } from './productFormModalTypes';

export function useProductFormModalController(props: ProductFormModalProps): ProductFormModalController {
  const { isOpen, categories, initialValue, existingImages = [], onClose, onSave } = props;
  const [draft, setDraft] = useState(emptyDraft);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const initialDraftSnapshotRef = useRef<string>(EMPTY_DRAFT_SNAPSHOT);
  const restoringImagesRef = useRef(false);
  const initializedFormKeyRef = useRef<string | null>(null);
  const imagesRef = useRef<ImagePreview[]>([]);

  useEffect(() => {
    if (!isOpen) {
      initializedFormKeyRef.current = null;
      return;
    }

    const nextFormKey = initialValue?.id ? `edit:${initialValue.id}` : 'create';
    if (initializedFormKeyRef.current === nextFormKey) return;

    initializedFormKeyRef.current = nextFormKey;
    const nextDraft = initialValue ? { ...initialValue } : emptyDraft();
    setDraft(nextDraft);
    setImages([]);
    setRemovedImageUrls([]);
    setSlugTouched(Boolean(initialValue?.slug));
    setError(null);
    setSaving(false);
    initialDraftSnapshotRef.current = buildDraftSnapshot(initialValue);
    restoringImagesRef.current = false;
  }, [initialValue, isOpen]);

  useEffect(() => {
    if (!isOpen || initialValue?.id || typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(ADMIN_PRODUCT_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { mode?: string; draft?: typeof draft; removedImageUrls?: string[] };
      if (parsed.mode !== 'create' || !parsed.draft) return;
      setDraft(parsed.draft);
      setRemovedImageUrls(Array.isArray(parsed.removedImageUrls) ? parsed.removedImageUrls : []);
      setSlugTouched(Boolean(parsed.draft.slug));
      setError('Draft dipulihkan setelah refresh.');
    } catch {
      return;
    }
  }, [initialValue?.id, isOpen]);

  useEffect(() => {
    if (!isOpen || initialValue?.id || typeof window === 'undefined') return;
    let active = true;

    const run = async () => {
      try {
        const stored = await readStoredImages(ADMIN_PRODUCT_IMAGE_KEY);
        if (!active || !stored || stored.length === 0) return;
        restoringImagesRef.current = true;
        setImages(restoreImagePreviews(stored));
        setError('Draft dipulihkan termasuk gambar.');
      } catch {
        return;
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [initialValue?.id, isOpen]);

  useEffect(() => {
    if (!isOpen || initialValue?.id || typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(
        ADMIN_PRODUCT_DRAFT_KEY,
        JSON.stringify({
          mode: 'create',
          savedAt: Date.now(),
          draft,
          removedImageUrls,
        })
      );
    } catch {
      return;
    }
  }, [draft, initialValue?.id, isOpen, removedImageUrls]);

  useEffect(() => {
    if (!isOpen || initialValue?.id || typeof window === 'undefined') return;
    let active = true;

    const persist = async () => {
      try {
        if (images.length === 0) {
          await clearStoredImages(ADMIN_PRODUCT_IMAGE_KEY);
          return;
        }
        const storedImages = await serializeImagePreviews(images);
        if (!active) return;
        await writeStoredImages(ADMIN_PRODUCT_IMAGE_KEY, storedImages);
      } catch {
        return;
      } finally {
        if (restoringImagesRef.current) restoringImagesRef.current = false;
      }
    };

    void persist();
    return () => {
      active = false;
    };
  }, [images, initialValue?.id, isOpen]);

  useEffect(() => {
    const previousImages = imagesRef.current;
    imagesRef.current = images;

    if (previousImages.length === 0) return;

    const activePreviews = new Set(images.map((image) => image.preview));
    revokeImagePreviewUrls(previousImages.filter((image) => !activePreviews.has(image.preview)));
  }, [images]);

  useEffect(() => {
    if (isOpen || images.length === 0) return;
    setImages([]);
  }, [images.length, isOpen]);

  useEffect(() => {
    return () => {
      revokeImagePreviewUrls(imagesRef.current);
      imagesRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(window.navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const categoryOptions = useMemo(() => getCategoryOptions(categories), [categories]);

  const isDirty = useMemo(
    () =>
      getIsDirty({
        draft,
        imagesLength: images.length,
        removedImageUrlsLength: removedImageUrls.length,
        initialValue,
        initialDraftSnapshot: initialDraftSnapshotRef.current,
      }),
    [draft, images.length, initialValue, removedImageUrls.length]
  );

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saving || !isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, isOpen, saving]);

  const handleSave = useCallback(async () => {
    const message = validateProductDraft({
      draft,
      imagesLength: images.length,
      existingImages,
      removedImageUrlsLength: removedImageUrls.length,
    });
    if (message) {
      setError(message);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const newImageFiles = images.map((image) => image.file);
      const timeoutMs = getSaveTimeoutMs(newImageFiles.length);
      await Promise.race([
        Promise.resolve(onSave({ draft, newImages: newImageFiles, removedImageUrls })),
        new Promise<void>((_, reject) => {
          window.setTimeout(() => {
            reject(
              new Error(
                'Proses penyimpanan terlalu lama (timeout). Cek koneksi, lalu refresh halaman. Draft teks sudah tersimpan; gambar yang belum ter-upload perlu dipilih ulang.'
              )
            );
          }, timeoutMs);
        }),
      ]);
      if (typeof window !== 'undefined') sessionStorage.removeItem(ADMIN_PRODUCT_DRAFT_KEY);
      if (!draft.id) await clearStoredImages(ADMIN_PRODUCT_IMAGE_KEY);
      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }, [draft, existingImages, images, onClose, onSave, removedImageUrls]);

  const handleRequestClose = useCallback(() => {
    if (saving) return;
    if (isDirty && typeof window !== 'undefined') {
      const confirmed = window.confirm('Perubahan belum tersimpan. Yakin ingin menutup form?');
      if (!confirmed) return;
    }
    if (!initialValue?.id && typeof window !== 'undefined') {
      sessionStorage.removeItem(ADMIN_PRODUCT_DRAFT_KEY);
      void clearStoredImages(ADMIN_PRODUCT_IMAGE_KEY);
    }
    onClose();
  }, [initialValue?.id, isDirty, onClose, saving]);

  const handleRemoveExisting = useCallback((url: string) => {
    setRemovedImageUrls((current) => (current.includes(url) ? current : [...current, url]));
  }, []);

  const activeExistingImages = useMemo(
    () => existingImages.filter((image) => !removedImageUrls.includes(image.url)),
    [existingImages, removedImageUrls]
  );

  return {
    draft,
    images,
    removedImageUrls,
    slugTouched,
    saving,
    error,
    isOnline,
    categoryOptions,
    activeExistingImages,
    setDraft,
    setImages,
    setSlugTouched,
    handleSave,
    handleRequestClose,
    handleRemoveExisting,
  };
}
