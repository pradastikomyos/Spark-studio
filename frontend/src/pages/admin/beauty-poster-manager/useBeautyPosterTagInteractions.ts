import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { clientPointToPercent } from '../../../utils/dragPosition';
import { getClientPointFromEvent } from './beautyPosterHelpers';
import type { ActiveDragPreview, TagDraft } from './beautyPosterTypes';

type UseBeautyPosterTagInteractionsParams = {
  canvasRef: MutableRefObject<HTMLDivElement | null>;
  setTags: Dispatch<SetStateAction<TagDraft[]>>;
  setActiveDragPreview: Dispatch<SetStateAction<ActiveDragPreview>>;
  setIsDraggingAny: Dispatch<SetStateAction<boolean>>;
};

export function useBeautyPosterTagInteractions({
  canvasRef,
  setTags,
  setActiveDragPreview,
  setIsDraggingAny,
}: UseBeautyPosterTagInteractionsParams) {
  const draggingTagRef = useRef<{ variantId: number; pointerId: number } | null>(null);
  const resizingTagRef = useRef<{
    variantId: number;
    pointerId: number;
    startX: number;
    startY: number;
    startSizePct: number;
    canvasWidth: number;
  } | null>(null);

  const onPosterDragEnd = useCallback((event: DragEndEvent) => {
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
    const rect = canvas.getBoundingClientRect();
    const pos = clientPointToPercent(rect, start.x + delta.x, start.y + delta.y);
    setTags((current) => {
      const index = current.findIndex((tag) => tag.product_variant_id === variantId);
      if (index < 0) return current;
      const next = current.slice();
      next[index] = { ...next[index], x_pct: pos.xPct, y_pct: pos.yPct, is_placed: true };
      return next;
    });
    setActiveDragPreview(null);
  }, [canvasRef, setActiveDragPreview, setTags]);

  const handleTagPointerDown = useCallback((variantId: number, event: ReactPointerEvent<HTMLElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    draggingTagRef.current = { variantId, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, [canvasRef]);

  const handleTagPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = draggingTagRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pos = clientPointToPercent(rect, event.clientX, event.clientY);
    setTags((current) => {
      const index = current.findIndex((tag) => tag.product_variant_id === drag.variantId);
      if (index < 0 || index >= current.length) return current;
      const next = current.slice();
      next[index] = { ...next[index], x_pct: pos.xPct, y_pct: pos.yPct };
      return next;
    });
  }, [canvasRef, setTags]);

  const handleTagPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = draggingTagRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    draggingTagRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      return;
    }
  }, []);

  const handleResizePointerDown = useCallback((variantId: number, startSizePct: number, event: ReactPointerEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    resizingTagRef.current = {
      variantId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startSizePct: Number.isFinite(startSizePct) ? startSizePct : 6,
      canvasWidth: rect.width || 1,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  }, [canvasRef]);

  const handleResizePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = resizingTagRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const deltaPx = Math.max(event.clientX - drag.startX, event.clientY - drag.startY);
    const deltaPct = (deltaPx / (drag.canvasWidth || 1)) * 100;
    const nextSize = Math.max(3, Math.min(20, drag.startSizePct + deltaPct));
    setTags((current) => {
      const index = current.findIndex((tag) => tag.product_variant_id === drag.variantId);
      if (index < 0) return current;
      const next = current.slice();
      next[index] = { ...next[index], size_pct: nextSize };
      return next;
    });
  }, [setTags]);

  const handleResizePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = resizingTagRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    resizingTagRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      return;
    }
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setIsDraggingAny(true);
    const data = event.active.data.current as { productName?: unknown; name?: unknown } | null;
    const productName = typeof data?.productName === 'string' ? data.productName : '';
    const name = typeof data?.name === 'string' ? data.name : '';
    if (productName && name) setActiveDragPreview({ productName, name });
  }, [setActiveDragPreview, setIsDraggingAny]);

  const handleDragComplete = useCallback((event: DragEndEvent) => {
    setIsDraggingAny(false);
    onPosterDragEnd(event);
  }, [onPosterDragEnd, setIsDraggingAny]);

  const handleDragCancel = useCallback(() => {
    setIsDraggingAny(false);
    setActiveDragPreview(null);
  }, [setActiveDragPreview, setIsDraggingAny]);

  return {
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
  };
}
