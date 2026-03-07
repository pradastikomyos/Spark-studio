import { useCallback, useState } from 'react';
import type { PanInfo } from 'framer-motion';

export function useDressingRoomPhotoState() {
  const [activePhotoIndexMap, setActivePhotoIndexMap] = useState<Map<number, number>>(new Map());
  const [containerWidth, setContainerWidth] = useState(700);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const getActivePhotoIndex = useCallback((lookId: number) => activePhotoIndexMap.get(lookId) ?? 0, [activePhotoIndexMap]);

  const setActivePhotoIndex = useCallback((lookId: number, index: number) => {
    setActivePhotoIndexMap((current) => new Map(current).set(lookId, index));
  }, []);

  const goPhotoNext = useCallback((lookId: number, maxIndex: number) => {
    const current = getActivePhotoIndex(lookId);
    if (current < maxIndex) setActivePhotoIndex(lookId, current + 1);
  }, [getActivePhotoIndex, setActivePhotoIndex]);

  const goPhotoPrev = useCallback((lookId: number) => {
    const current = getActivePhotoIndex(lookId);
    if (current > 0) setActivePhotoIndex(lookId, current - 1);
  }, [getActivePhotoIndex, setActivePhotoIndex]);

  const handleDragEnd = useCallback((lookId: number, maxIndex: number) => (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    if (info.offset.x > 50) goPhotoNext(lookId, maxIndex);
    else if (info.offset.x < -50) goPhotoPrev(lookId);
  }, [goPhotoNext, goPhotoPrev]);

  return {
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
  };
}
