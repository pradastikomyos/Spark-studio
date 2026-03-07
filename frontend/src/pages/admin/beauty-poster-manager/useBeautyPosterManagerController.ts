import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { searchProductVariants, type ProductVariantSearchResult } from '../../../utils/productVariantSearch';
import {
  createBeautyPosterSnapshot,
  fetchBeautyPosterTags,
  fetchBeautyPosters,
  saveBeautyPoster,
  uploadBeautyPosterImage,
} from './beautyPosterData';
import type { ActiveDragPreview, BeautyPosterController, BeautyPosterRow, TagDraft } from './beautyPosterTypes';
import { useBeautyPosterTagInteractions } from './useBeautyPosterTagInteractions';

type ShowToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;

export function useBeautyPosterManagerController(showToast: ShowToast): BeautyPosterController {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posters, setPosters] = useState<BeautyPosterRow[]>([]);
  const autoOpenedRef = useRef(false);

  const [selectedPoster, setSelectedPoster] = useState<BeautyPosterRow | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [tags, setTags] = useState<TagDraft[]>([]);
  const appliedSnapshotRef = useRef<string>('{}');

  const [productSearch, setProductSearch] = useState('');
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [productResults, setProductResults] = useState<ProductVariantSearchResult[]>([]);
  const [activeDragPreview, setActiveDragPreview] = useState<ActiveDragPreview>(null);
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const fetchPosters = useCallback(async () => {
    setLoading(true);
    try {
      setPosters(await fetchBeautyPosters());
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load posters');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const openEditor = useCallback(
    async (poster: BeautyPosterRow | null) => {
      setSelectedPoster(poster);
      setTitle(poster?.title ?? '');
      setSlug(poster?.slug ?? '');
      setImageUrl(poster?.image_url ?? '');
      setIsActive(Boolean(poster?.is_active));
      setShowUrlModal(false);
      setUrlDraft(poster?.image_url ?? '');
      setTags([]);
      setProductSearch('');
      setProductResults([]);
      appliedSnapshotRef.current = createBeautyPosterSnapshot({
        posterId: poster?.id ?? null,
        title: poster?.title ?? '',
        slug: poster?.slug ?? '',
        imageUrl: poster?.image_url ?? '',
        isActive: Boolean(poster?.is_active),
        tags: [],
      });

      if (!poster) return;

      try {
        const mapped = await fetchBeautyPosterTags(poster);
        setTags(mapped);
        appliedSnapshotRef.current = createBeautyPosterSnapshot({
          posterId: poster.id,
          title: poster.title,
          slug: poster.slug,
          imageUrl: poster.image_url,
          isActive: Boolean(poster.is_active),
          tags: mapped,
        });
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : 'Failed to load tags');
      }
    },
    [showToast]
  );

  useEffect(() => {
    void fetchPosters();
  }, [fetchPosters]);

  useEffect(() => {
    if (loading || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    const firstActive = posters.find((poster) => poster.is_active) ?? null;
    const firstPoster = posters[0] ?? null;
    void openEditor(firstActive ?? firstPoster);
  }, [loading, openEditor, posters]);

  const searchProducts = useCallback(
    async (query: string) => {
      setProductSearch(query);
      if (query.trim().length < 2) {
        setProductResults([]);
        return;
      }
      setSearchingProducts(true);
      try {
        setProductResults(await searchProductVariants(query, 12));
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : 'Failed to search products');
      } finally {
        setSearchingProducts(false);
      }
    },
    [showToast]
  );

  const handleUploadImage = useCallback(
    async (file: File) => {
      try {
        if (!file.type.startsWith('image/')) throw new Error('Please upload an image file');
        if (file.size > 5 * 1024 * 1024) throw new Error('Image size must be less than 5MB');
        setImageUrl(await uploadBeautyPosterImage({ file, slug, title }));
        showToast('success', 'Image uploaded');
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : 'Failed to upload image');
      }
    },
    [showToast, slug, title]
  );

  const currentSnapshot = useMemo(
    () =>
      createBeautyPosterSnapshot({
        posterId: selectedPoster?.id ?? null,
        title,
        slug,
        imageUrl,
        isActive,
        tags,
      }),
    [imageUrl, isActive, selectedPoster?.id, slug, tags, title]
  );

  const isDirty = currentSnapshot !== appliedSnapshotRef.current;

  const applyChanges = useCallback(async (): Promise<BeautyPosterRow | null> => {
    if (!title.trim()) {
      showToast('error', 'Title is required');
      return null;
    }
    if (!slug.trim()) {
      showToast('error', 'Slug is required');
      return null;
    }
    if (!imageUrl.trim()) {
      showToast('error', 'Poster image is required');
      return null;
    }
    if (tags.some((tag) => !tag.is_placed)) {
      showToast('error', 'Place all tagged items onto the poster before Apply/Save.');
      return null;
    }

    setSaving(true);
    try {
      const updatedPoster = await saveBeautyPoster({
        selectedPosterId: selectedPoster?.id ?? null,
        title,
        slug,
        imageUrl,
        isActive,
        postersLength: posters.length,
        tags,
      });
      setSelectedPoster(updatedPoster);
      try {
        const parsed = JSON.parse(currentSnapshot) as { posterId: number | null };
        parsed.posterId = updatedPoster.id ?? parsed.posterId;
        appliedSnapshotRef.current = JSON.stringify(parsed);
      } catch {
        appliedSnapshotRef.current = currentSnapshot;
      }
      await fetchPosters();
      return updatedPoster;
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to save');
      return null;
    } finally {
      setSaving(false);
    }
  }, [currentSnapshot, fetchPosters, imageUrl, isActive, posters.length, selectedPoster?.id, showToast, slug, tags, title]);

  const handleSelectVariant = useCallback(
    (variant: ProductVariantSearchResult) => {
      setTags((current) => {
        if (current.some((tag) => tag.product_variant_id === variant.id)) {
          showToast('error', 'Produk ini sudah ada di tagged items.');
          return current;
        }
        const nextSort = current.length ? Math.max(...current.map((tag) => tag.sort_order)) + 1 : 0;
        return [
          ...current,
          {
            product_variant_id: variant.id,
            product_id: variant.productId,
            product_name: variant.productName,
            variant_name: variant.name,
            image_url: variant.variantImageUrl ?? variant.productImageUrl ?? null,
            label: null,
            x_pct: 50,
            y_pct: 50,
            size_pct: 6,
            is_placed: false,
            sort_order: nextSort,
          },
        ];
      });
    },
    [showToast]
  );

  const {
    onPosterDragEnd,
    handleTagPointerDown,
    handleTagPointerMove,
    handleTagPointerUp,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
    handleDragStart,
    handleDragComplete,
    handleDragCancel,
  } = useBeautyPosterTagInteractions({
    canvasRef,
    setTags,
    setActiveDragPreview,
    setIsDraggingAny,
  });

  const editorTitle = selectedPoster ? 'Edit Poster' : 'New Poster';

  const resetEditor = useCallback(async () => {
    if (selectedPoster) {
      await openEditor(selectedPoster);
      return;
    }
    setTitle('');
    setSlug('');
    setImageUrl('');
    setIsActive(false);
    setTags([]);
    setShowUrlModal(false);
    setUrlDraft('');
  }, [openEditor, selectedPoster]);

  const handleApplyUrl = useCallback(() => {
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      showToast('error', 'URL is required');
      return;
    }
    setImageUrl(trimmed);
    setShowUrlModal(false);
    showToast('success', 'Image URL applied');
  }, [showToast, urlDraft]);

  return {
    loading,
    saving,
    posters,
    selectedPoster,
    title,
    slug,
    imageUrl,
    isActive,
    showUrlModal,
    urlDraft,
    tags,
    productSearch,
    searchingProducts,
    productResults,
    activeDragPreview,
    isDraggingAny,
    sensors,
    canvasRef,
    uploadInputRef,
    editorTitle,
    isDirty,
    setTitle,
    setSlug,
    setIsActive,
    setShowUrlModal,
    setUrlDraft,
    setTags,
    openEditor,
    searchProducts,
    handleUploadImage,
    handleSelectVariant,
    onPosterDragEnd,
    handleTagPointerDown,
    handleTagPointerMove,
    handleTagPointerUp,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
    applyChanges,
    resetEditor,
    handleApplyUrl,
    handleDragStart,
    handleDragComplete,
    handleDragCancel,
  };
}
