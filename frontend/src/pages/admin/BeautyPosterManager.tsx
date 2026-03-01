import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { supabase } from '../../lib/supabase';
import { slugify } from '../../utils/merchant';
import { clampPercent, clientPointToPercent } from '../../utils/dragPosition';
import { searchProductVariants, type ProductVariantSearchResult } from '../../utils/productVariantSearch';

type BeautyPosterRow = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  image_url: string;
  is_active: boolean;
  sort_order: number;
};

type TagDraft = {
  id?: number;
  product_variant_id: number;
  product_id: number;
  product_name: string;
  variant_name: string;
  image_url: string | null;
  label: string | null;
  x_pct: number;
  y_pct: number;
  size_pct: number;
  is_placed: boolean;
  sort_order: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
}

function getClientPointFromEvent(event: unknown): { x: number; y: number } | null {
  if (!event || typeof event !== 'object') return null;
  if ('touches' in event && Array.isArray((event as TouchEvent).touches) && (event as TouchEvent).touches.length > 0) {
    const t = (event as TouchEvent).touches[0];
    return { x: t.clientX, y: t.clientY };
  }
  if ('clientX' in event && 'clientY' in event) {
    const e = event as MouseEvent;
    return { x: e.clientX, y: e.clientY };
  }
  return null;
}

function VariantResultCard({ variant, onSelect }: { variant: ProductVariantSearchResult; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group rounded-2xl border border-gray-200 bg-white p-2 hover:border-gray-300 hover:shadow-sm transition-shadow text-left"
    >
      <div className="aspect-square w-full rounded-xl border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center">
        {variant.variantImageUrl || variant.productImageUrl ? (
          <img
            src={variant.variantImageUrl || (variant.productImageUrl as string)}
            alt={variant.name}
            className="h-full w-full object-contain"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="material-symbols-outlined text-gray-300">image</span>
        )}
      </div>
      <div className="mt-2 min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold truncate">{variant.productName}</p>
        <p className="text-[11px] font-semibold text-gray-900 truncate">{variant.name}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{variant.price !== null ? formatPrice(variant.price) : ''}</p>
      </div>
    </button>
  );
}

function DraggableTaggedItem({ tag, disabled }: { tag: TagDraft; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tag:${tag.product_variant_id}`,
    disabled,
    data: {
      product_variant_id: tag.product_variant_id,
      productName: tag.product_name,
      name: tag.variant_name,
    },
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: disabled ? 0.5 : isDragging ? 0.7 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
      <div className="h-12 w-12 rounded-lg border border-gray-100 bg-white overflow-hidden flex items-center justify-center">
        {tag.image_url ? (
          <img src={tag.image_url} alt={tag.variant_name} className="h-full w-full object-contain" loading="lazy" decoding="async" />
        ) : (
          <span className="material-symbols-outlined text-gray-300">image</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold truncate">{tag.product_name}</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{tag.variant_name}</p>
          </div>
          <span
            className={[
              'text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-1 border whitespace-nowrap',
              tag.is_placed ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-gray-500 bg-white border-gray-200',
            ].join(' ')}
          >
            {tag.is_placed ? 'Placed' : 'Drag to place'}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] text-gray-400">
            {disabled ? 'Upload poster first.' : 'Drag this item onto the poster.'}
          </span>
          <span
            className="material-symbols-outlined text-[18px] text-gray-300 cursor-grab active:cursor-grabbing select-none touch-none"
            {...attributes}
            {...listeners}
            aria-label="Drag tag"
          >
            drag_indicator
          </span>
        </div>
      </div>
    </div>
  );
}

function CanvasDroppable({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'poster-canvas' });
  return (
    <div ref={setNodeRef} className={`relative rounded-2xl border ${isOver ? 'border-[#ff4b86]' : 'border-gray-200'} bg-gray-50 overflow-hidden`}>
      {children}
    </div>
  );
}

export default function BeautyPosterManager() {
  const { signOut } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [posters, setPosters] = useState<BeautyPosterRow[]>([]);
  const autoOpenedRef = useRef(false);

  // Editor state
  const [selectedPoster, setSelectedPoster] = useState<BeautyPosterRow | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const [tags, setTags] = useState<TagDraft[]>([]);
  const appliedSnapshotRef = useRef<string>('{}');

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [productResults, setProductResults] = useState<ProductVariantSearchResult[]>([]);
  const [activeDragPreview, setActiveDragPreview] = useState<{ productName: string; name: string } | null>(null);
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const fetchPosters = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('beauty_posters')
        .select('id, title, slug, description, image_url, is_active, sort_order')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setPosters((data ?? []) as BeautyPosterRow[]);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load posters');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchPosters();
  }, [fetchPosters]);

  const openEditor = useCallback(async (poster: BeautyPosterRow | null) => {
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
      appliedSnapshotRef.current = JSON.stringify({
        posterId: poster?.id ?? null,
        title: poster?.title ?? '',
        slug: poster?.slug ?? '',
        imageUrl: poster?.image_url ?? '',
        isActive: Boolean(poster?.is_active),
        tags: [],
      });

    if (!poster) return;

    try {
      const { data: rawTags, error } = await supabase
        .from('beauty_poster_tags')
        .select(
          `
            id,
            poster_id,
            product_variant_id,
            label,
            x_pct,
            y_pct,
            size_pct,
            sort_order,
            product_variants!inner (
              id,
              name,
              sku,
              price,
              attributes,
              products!inner ( id, name, image_url )
            )
          `
        )
        .eq('poster_id', poster.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;

	      const productIds = new Set<number>();
	      (rawTags ?? []).forEach((row) => {
	        const r = asRecord(row);
	        const pv = asRecord(r?.product_variants);
	        const prod = asRecord(pv?.products);
	        const prodId = prod?.id;
	        if (typeof prodId === 'number') productIds.add(prodId);
	      });

      const productImageMap = new Map<number, string>();
      if (productIds.size > 0) {
        const { data: imgData } = await supabase
          .from('product_images')
          .select('product_id, image_url')
          .in('product_id', Array.from(productIds))
          .eq('is_primary', true);
        (imgData ?? []).forEach((img) => {
          if (typeof img.product_id === 'number' && typeof img.image_url === 'string') {
            productImageMap.set(img.product_id, img.image_url);
          }
        });
      }

	      const mapped = (rawTags ?? []).map((row) => {
	        const r = asRecord(row) ?? {};
	        const pv = asRecord(r.product_variants);
	        const prod = asRecord(pv?.products);
	        const attributes = asRecord(pv?.attributes);
	        const variantImage = typeof attributes?.image_url === 'string' ? attributes.image_url : null;
	        const rawProdId = prod?.id;
	        const prodId =
	          typeof rawProdId === 'number' ? rawProdId : typeof rawProdId === 'string' ? Number(rawProdId) : Number.NaN;
	        const primary = Number.isFinite(prodId) ? productImageMap.get(prodId) ?? null : null;
	        return {
	          id: Number(r.id),
	          product_variant_id: Number(r.product_variant_id),
	          product_id: Number(prod?.id),
	          product_name: String(prod?.name ?? ''),
	          variant_name: String(pv?.name ?? ''),
	          image_url: variantImage ?? primary ?? ((prod?.image_url as string | null | undefined) ?? null),
	          label: (r.label ?? null) as string | null,
	          x_pct: typeof r.x_pct === 'number' ? r.x_pct : Number(r.x_pct),
	          y_pct: typeof r.y_pct === 'number' ? r.y_pct : Number(r.y_pct),
	          size_pct: typeof r.size_pct === 'number' ? r.size_pct : Number(r.size_pct ?? 6),
	          is_placed: true,
	          sort_order: Number(r.sort_order ?? 0),
	        } satisfies TagDraft;
	      });

      setTags(mapped);
      appliedSnapshotRef.current = JSON.stringify({
        posterId: poster.id,
        title: poster.title,
        slug: poster.slug,
        imageUrl: poster.image_url,
        isActive: Boolean(poster.is_active),
        tags: mapped
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((t) => ({
            product_variant_id: t.product_variant_id,
            label: t.label ?? null,
            x_pct: clampPercent(t.x_pct),
            y_pct: clampPercent(t.y_pct),
            size_pct: typeof t.size_pct === 'number' ? t.size_pct : 6,
            is_placed: Boolean(t.is_placed),
            sort_order: t.sort_order,
          })),
      });
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load tags');
    }
  }, [showToast]);

  useEffect(() => {
    if (loading) return;
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;

    const firstActive = posters.find((p) => p.is_active) ?? null;
    const first = posters[0] ?? null;
    void openEditor(firstActive ?? first);
  }, [loading, openEditor, posters]);

  const searchProducts = useCallback(async (query: string) => {
    setProductSearch(query);
    if (query.trim().length < 2) {
      setProductResults([]);
      return;
    }
    setSearchingProducts(true);
    try {
      const results = await searchProductVariants(query, 12);
      setProductResults(results);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to search products');
    } finally {
      setSearchingProducts(false);
    }
  }, [showToast]);

  const handleUploadImage = useCallback(async (file: File) => {
    try {
      if (!file.type.startsWith('image/')) {
        showToast('error', 'Please upload an image file');
        return;
      }
      const maxSizeMb = 5;
      if (file.size > maxSizeMb * 1024 * 1024) {
        showToast('error', `Image size must be less than ${maxSizeMb}MB`);
        return;
      }
      const ext = file.name.split('.').pop() || 'jpg';
      const safeSlug = slug.trim() ? slug.trim() : slugify(title || 'beauty-poster');
      const fileName = `beauty-${safeSlug}-${Date.now()}.${ext}`;
      const filePath = `posters/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('beauty-images').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('beauty-images').getPublicUrl(filePath);
      setImageUrl(publicUrl);
      showToast('success', 'Image uploaded');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to upload image');
    }
  }, [showToast, slug, title]);

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      posterId: selectedPoster?.id ?? null,
      title: title.trim(),
      slug: slug.trim(),
      imageUrl: imageUrl.trim(),
      isActive,
      tags: tags
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((t) => ({
          product_variant_id: t.product_variant_id,
          label: t.label && t.label.trim().length ? t.label.trim() : null,
          x_pct: clampPercent(t.x_pct),
          y_pct: clampPercent(t.y_pct),
          size_pct: typeof t.size_pct === 'number' ? t.size_pct : 6,
          is_placed: Boolean(t.is_placed),
          sort_order: t.sort_order,
        })),
    });
  }, [imageUrl, isActive, selectedPoster?.id, slug, tags, title]);

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
    const unplaced = tags.filter((t) => !t.is_placed);
    if (unplaced.length > 0) {
      showToast('error', 'Place all tagged items onto the poster before Apply/Save.');
      return null;
    }

    setSaving(true);
    try {
      let posterId = selectedPoster?.id ?? null;

      if (posterId == null) {
        const { data, error } = await supabase
          .from('beauty_posters')
          .insert({ title: title.trim(), slug: slug.trim(), image_url: imageUrl.trim(), is_active: isActive, sort_order: posters.length })
          .select('id')
          .single();
        if (error) throw error;
        posterId = Number((data as { id: number | string }).id);
      } else {
        const { error } = await supabase
          .from('beauty_posters')
          .update({ title: title.trim(), slug: slug.trim(), image_url: imageUrl.trim(), is_active: isActive, updated_at: new Date().toISOString() })
          .eq('id', posterId);
        if (error) throw error;
      }

      const { error: deleteError } = await supabase.from('beauty_poster_tags').delete().eq('poster_id', posterId);
      if (deleteError) throw deleteError;

      if (tags.length > 0) {
        const rows = tags
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((t, idx) => ({
            poster_id: posterId,
            product_variant_id: t.product_variant_id,
            label: t.label && t.label.trim().length ? t.label.trim() : null,
            x_pct: clampPercent(t.x_pct),
            y_pct: clampPercent(t.y_pct),
            size_pct: typeof t.size_pct === 'number' ? t.size_pct : 6,
            sort_order: idx,
          }));
        const { error: insertError } = await supabase.from('beauty_poster_tags').insert(rows);
        if (insertError) throw insertError;
      }

      const { data: posterRow, error: posterLoadError } = await supabase
        .from('beauty_posters')
        .select('id, title, slug, description, image_url, is_active, sort_order')
        .eq('id', posterId)
        .single();
      if (posterLoadError) throw posterLoadError;

      const updatedPoster = (posterRow as BeautyPosterRow) ?? null;
      setSelectedPoster(updatedPoster);
      try {
        const parsed = JSON.parse(currentSnapshot) as { posterId: number | null };
        parsed.posterId = updatedPoster?.id ?? parsed.posterId;
        appliedSnapshotRef.current = JSON.stringify(parsed);
      } catch {
        appliedSnapshotRef.current = currentSnapshot;
      }

      await fetchPosters();
      return updatedPoster;
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save');
      return null;
    } finally {
      setSaving(false);
    }
  }, [currentSnapshot, fetchPosters, imageUrl, isActive, posters.length, selectedPoster?.id, showToast, slug, tags, title]);

  const handleSelectVariant = useCallback(
    (variant: ProductVariantSearchResult) => {
      setTags((prev) => {
        if (prev.some((t) => t.product_variant_id === variant.id)) {
          showToast('error', 'Produk ini sudah ada di tagged items.');
          return prev;
        }
        const nextSort = prev.length ? Math.max(...prev.map((t) => t.sort_order)) + 1 : 0;
        return [
          ...prev,
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

  const onPosterDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over, delta, activatorEvent } = event;
      if (!over || over.id !== 'poster-canvas') {
        setActiveDragPreview(null);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        setActiveDragPreview(null);
        return;
      }

      const activeId = String(active.id);
      if (!activeId.startsWith('tag:')) {
        setActiveDragPreview(null);
        return;
      }
      const variantId = Number(activeId.replace('tag:', ''));
      if (!Number.isFinite(variantId) || variantId <= 0) {
        setActiveDragPreview(null);
        return;
      }

      const start = getClientPointFromEvent(activatorEvent);
      if (!start) {
        setActiveDragPreview(null);
        return;
      }

      const dropPoint = { x: start.x + delta.x, y: start.y + delta.y };
      const rect = canvas.getBoundingClientRect();
      const pos = clientPointToPercent(rect, dropPoint.x, dropPoint.y);

      setTags((prev) => {
        const idx = prev.findIndex((t) => t.product_variant_id === variantId);
        if (idx < 0) return prev;
        const next = prev.slice();
        next[idx] = { ...next[idx], x_pct: pos.xPct, y_pct: pos.yPct, is_placed: true };
        return next;
      });

      setActiveDragPreview(null);
    },
    []
  );

  const draggingTagRef = useRef<{ variantId: number; pointerId: number } | null>(null);
  const resizingTagRef = useRef<{
    variantId: number;
    pointerId: number;
    startX: number;
    startY: number;
    startSizePct: number;
    canvasWidth: number;
  } | null>(null);

  const handleTagPointerDown = (variantId: number, event: React.PointerEvent<HTMLElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    draggingTagRef.current = { variantId, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleTagPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const drag = draggingTagRef.current;
    if (!drag) return;
    if (event.pointerId !== drag.pointerId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pos = clientPointToPercent(rect, event.clientX, event.clientY);
    setTags((prev) => {
      const idx = prev.findIndex((t) => t.product_variant_id === drag.variantId);
      if (idx < 0 || idx >= prev.length) return prev;
      const next = prev.slice();
      next[idx] = { ...next[idx], x_pct: pos.xPct, y_pct: pos.yPct };
      return next;
    });
  };

  const handleTagPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const drag = draggingTagRef.current;
    if (!drag) return;
    if (event.pointerId !== drag.pointerId) return;
    draggingTagRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  const handleResizePointerDown = (variantId: number, startSizePct: number, event: React.PointerEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width || 1;
    resizingTagRef.current = {
      variantId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startSizePct: Number.isFinite(startSizePct) ? startSizePct : 6,
      canvasWidth,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  };

  const handleResizePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = resizingTagRef.current;
    if (!drag) return;
    if (event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const deltaPx = Math.max(dx, dy);
    const deltaPct = (deltaPx / (drag.canvasWidth || 1)) * 100;
    const nextSize = Math.max(3, Math.min(20, drag.startSizePct + deltaPct));

    setTags((prev) => {
      const idx = prev.findIndex((t) => t.product_variant_id === drag.variantId);
      if (idx < 0) return prev;
      const next = prev.slice();
      next[idx] = { ...next[idx], size_pct: nextSize };
      return next;
    });
  };

  const handleResizePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = resizingTagRef.current;
    if (!drag) return;
    if (event.pointerId !== drag.pointerId) return;
    resizingTagRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  const editorTitle = selectedPoster ? 'Edit Poster' : 'New Poster';

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="beauty-posters"
      title="Beauty Poster Manager"
      subtitle="WYSIWYG poster + product tagger for /beauty"
      onLogout={signOut}
    >
      <div className="space-y-5 pb-20">
        <DndContext
          sensors={sensors}
          onDragStart={(event) => {
            setIsDraggingAny(true);
            const data = event.active.data.current as { productName?: unknown; name?: unknown } | null;
            const productName = typeof data?.productName === 'string' ? data.productName : '';
            const name = typeof data?.name === 'string' ? data.name : '';
            if (productName && name) setActiveDragPreview({ productName, name });
          }}
          onDragEnd={(event) => {
            setIsDraggingAny(false);
            onPosterDragEnd(event);
          }}
          onDragCancel={() => {
            setIsDraggingAny(false);
            setActiveDragPreview(null);
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Poster</label>
                    <select
                      value={selectedPoster ? String(selectedPoster.id) : 'new'}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next === 'new') {
                          void openEditor(null);
                          return;
                        }
                        const id = Number(next);
                        const poster = posters.find((p) => p.id === id) ?? null;
                        void openEditor(poster);
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]"
                      disabled={loading || saving}
                    >
                      <option value="new">New poster</option>
                      {posters.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Title</label>
                    <input
                      value={title}
                      onChange={(e) => {
                        const next = e.target.value;
                        setTitle(next);
                        if (!selectedPoster) setSlug(slugify(next));
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]"
                      placeholder="Poster title"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Slug</label>
                    <input
                      value={slug}
                      onChange={(e) => setSlug(slugify(e.target.value))}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]"
                      placeholder="beauty-poster-slug"
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Active</label>
                      <button
                        type="button"
                        onClick={() => setIsActive((v) => !v)}
                        className={`relative h-11 w-full rounded-xl border px-4 text-sm font-bold transition-colors ${isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-end">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Poster Image</label>

                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-blue-600 text-[20px] mt-0.5">info</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-blue-900 mb-1">Recommended Poster Specs:</p>
                          <ul className="text-xs text-blue-800 space-y-0.5">
                            <li>• Aspect ratio: <span className="font-semibold">4:5</span> (portrait)</li>
                            <li>• Ideal resolution: <span className="font-semibold">1600 × 2000px</span></li>
                            <li>• Minimum: <span className="font-semibold">1200 × 1500px</span></li>
                            <li>• Format: JPG, PNG, or WebP</li>
                            <li>• Max size: <span className="font-semibold">5MB</span></li>
                          </ul>
                          <p className="mt-2 text-[11px] text-blue-900/80">
                            You can use a temporary stock-image URL (Unsplash/Pexels) for now.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUploadImage(file);
                        e.currentTarget.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUrlDraft(imageUrl);
                        setShowUrlModal(true);
                      }}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Use URL
                    </button>
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Upload
                    </button>
                  </div>
                </div>
              </div>

              <CanvasDroppable>
                <div
                  ref={canvasRef}
                  role="img"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) void handleUploadImage(file);
                  }}
                  className="relative w-full aspect-[4/5] select-none"
                  aria-label={imageUrl ? 'Poster image' : 'Upload poster image'}
                >
                  {imageUrl ? (
                    <>
                      <img src={imageUrl} alt={title || 'Poster'} className="absolute inset-0 h-full w-full object-cover" decoding="async" />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                      <div className="text-center px-6">
                        <span className="material-symbols-outlined text-5xl block mb-2">cloud_upload</span>
                        <p className="text-sm font-semibold text-gray-600">Upload poster</p>
                        <p className="mt-1 text-[11px] text-gray-400">4:5 portrait recommended</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isDraggingAny) return;
                            uploadInputRef.current?.click();
                          }}
                          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#ff4b86] px-5 py-2 text-xs font-bold text-white hover:bg-[#ff6a9a]"
                        >
                          <span className="material-symbols-outlined text-base">cloud_upload</span>
                          Upload poster
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUrlDraft(imageUrl);
                            setShowUrlModal(true);
                          }}
                          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                        >
                          <span className="material-symbols-outlined text-base">link</span>
                          Use stock image URL
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0">
                    {tags.map((tag) => {
                      if (!tag.is_placed) return null;
                      const sizeCss = `clamp(36px, ${tag.size_pct}%, 180px)`;
                      return (
                        <div
                          key={tag.product_variant_id}
                          onPointerDown={(e) => handleTagPointerDown(tag.product_variant_id, e)}
                          onPointerMove={handleTagPointerMove}
                          onPointerUp={handleTagPointerUp}
                          onPointerCancel={handleTagPointerUp}
                          className="absolute -translate-x-1/2 -translate-y-1/2 group touch-none"
                          style={{ left: `${tag.x_pct}%`, top: `${tag.y_pct}%`, width: sizeCss, height: sizeCss }}
                          role="button"
                          tabIndex={0}
                          aria-label={`Move tag ${tag.variant_name}`}
                        >
                          <span className="relative flex h-full w-full items-center justify-center rounded-2xl bg-white/90 border border-black/10 shadow-lg overflow-hidden backdrop-blur-sm">
                            {tag.image_url ? (
                              <img
                                src={tag.image_url}
                                alt={tag.label ?? tag.variant_name}
                                className="h-full w-full object-contain"
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                              />
                            ) : (
                              <span className="material-symbols-outlined text-gray-300">image</span>
                            )}
                            <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white border border-black/10 flex items-center justify-center shadow">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#e63d75]" />
                            </span>

                            {/* Resize handle */}
                            <div
                              onPointerDown={(e) => handleResizePointerDown(tag.product_variant_id, tag.size_pct, e)}
                              onPointerMove={handleResizePointerMove}
                              onPointerUp={handleResizePointerUp}
                              onPointerCancel={handleResizePointerUp}
                              className="absolute right-0 top-0 h-8 w-8 flex items-center justify-center bg-white/80 border-l border-b border-black/10 text-gray-600 opacity-100 transition-opacity cursor-nwse-resize touch-none"
                              aria-label="Resize tag"
                              title="Drag to resize"
                            >
                              <span className="material-symbols-outlined text-[18px]">open_in_full</span>
                            </div>
                          </span>
                          <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            {tag.label ?? tag.variant_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CanvasDroppable>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Products</p>
                  <span className="text-xs text-gray-400">{tags.length} tag(s)</span>
                </div>

                <input
                  value={productSearch}
                  onChange={(e) => void searchProducts(e.target.value)}
                  placeholder="Cari produk variant..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]"
                />
                {searchingProducts ? <p className="mt-2 text-xs text-gray-400">Mencari...</p> : null}

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {productResults.length === 0 ? (
                    <p className="col-span-full text-xs text-gray-400 text-center py-6">
                      Ketik minimal 2 huruf, lalu klik item untuk masuk ke tagged items.
                    </p>
                  ) : (
                    productResults.map((variant) => (
                      <VariantResultCard key={variant.id} variant={variant} onSelect={() => handleSelectVariant(variant)} />
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Tagged Items</p>
                <div className="mt-3 space-y-3 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {tags.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No tags yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {tags
                        .slice()
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((tag) => (
                          <div key={tag.product_variant_id} className="relative">
                            <DraggableTaggedItem tag={tag} disabled={!imageUrl.trim()} />
                            <div className="mt-2">
                              <input
                                value={tag.label ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTags((prev) => {
                                    const idx = prev.findIndex((t) => t.product_variant_id === tag.product_variant_id);
                                    if (idx < 0) return prev;
                                    const next = prev.slice();
                                    next[idx] = { ...next[idx], label: val };
                                    return next;
                                  });
                                }}
                                className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
                                placeholder="Label override (optional)"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setTags((prev) => prev.filter((t) => t.product_variant_id !== tag.product_variant_id));
                              }}
                              className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors"
                              title="Remove tag"
                            >
                              <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeDragPreview ? (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xl">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">{activeDragPreview.productName}</p>
                <p className="text-sm font-semibold text-gray-900">{activeDragPreview.name}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {showUrlModal ? (
          <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Close"
              onClick={() => setShowUrlModal(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              className="relative w-full md:max-w-xl bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Poster Image URL</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">Use a temporary stock image</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUrlModal(false)}
                  className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-5 md:p-6 space-y-3">
                <input
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]"
                  placeholder="https://images.unsplash.com/..."
                />
                <p className="text-xs text-gray-500">
                  Tip: use a direct image URL (e.g. <span className="font-semibold">images.unsplash.com</span> or{' '}
                  <span className="font-semibold">images.pexels.com</span>).
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUrlModal(false)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = urlDraft.trim();
                      if (!trimmed) {
                        showToast('error', 'URL is required');
                        return;
                      }
                      setImageUrl(trimmed);
                      setShowUrlModal(false);
                      showToast('success', 'Image URL applied');
                    }}
                    className="rounded-xl bg-[#ff4b86] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff6a9a]"
                  >
                    Apply URL
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-gray-400 font-bold truncate">{editorTitle}</p>
              <p className="text-[11px] text-gray-500 truncate">
                Upload a poster first, then click products to add → drag tagged items onto the poster (use corner icon to resize).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedPoster) {
                    void openEditor(selectedPoster);
                    return;
                  }
                  setTitle('');
                  setSlug('');
                  setImageUrl('');
                  setIsActive(false);
                  setTags([]);
                  setShowUrlModal(false);
                  setUrlDraft('');
                }}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const updated = await applyChanges();
                  if (updated) showToast('success', 'Applied');
                }}
                className="rounded-lg border border-pink-200 bg-pink-50 px-4 py-2 text-sm font-bold text-[#e63d75] hover:bg-pink-100 disabled:opacity-50"
                disabled={saving || !isDirty}
              >
                Apply
              </button>
              <button
                type="button"
                onClick={async () => {
                  const updated = await applyChanges();
                  if (!updated) return;
                  showToast('success', 'Saved');
                }}
                className="rounded-lg bg-[#ff4b86] px-4 py-2 text-sm font-bold text-white hover:bg-[#ff6a9a] disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
