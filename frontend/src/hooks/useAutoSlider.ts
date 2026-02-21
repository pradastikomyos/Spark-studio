import { useCallback, useEffect, useMemo, useState } from 'react';

type UseAutoSliderOptions = {
  length: number;
  intervalMs: number;
  pauseOnHover?: boolean;
  pauseWhenHidden?: boolean;
  respectReducedMotion?: boolean;
};

export function useAutoSlider(options: UseAutoSliderOptions) {
  const {
    length,
    intervalMs,
    pauseOnHover = true,
    pauseWhenHidden = true,
    respectReducedMotion = true,
  } = options;

  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (length <= 0) {
      setIndex(0);
      return;
    }
    setIndex((prev) => prev % length);
  }, [length]);

  useEffect(() => {
    if (!respectReducedMotion || typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [respectReducedMotion]);

  useEffect(() => {
    if (!pauseWhenHidden || typeof document === 'undefined') return;
    const onVisibilityChange = () => setIsDocumentHidden(document.hidden);
    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [pauseWhenHidden]);

  const setSafeIndex = useCallback(
    (next: number) => {
      if (length <= 0) return;
      setIndex(((next % length) + length) % length);
    },
    [length]
  );

  const next = useCallback(() => {
    setSafeIndex(index + 1);
  }, [index, setSafeIndex]);

  const prev = useCallback(() => {
    setSafeIndex(index - 1);
  }, [index, setSafeIndex]);

  const select = useCallback(
    (nextIndex: number) => {
      setSafeIndex(nextIndex);
    },
    [setSafeIndex]
  );

  const isPaused = useMemo(() => {
    if (length <= 1) return true;
    if (respectReducedMotion && prefersReducedMotion) return true;
    if (pauseOnHover && isHovered) return true;
    if (pauseWhenHidden && isDocumentHidden) return true;
    return false;
  }, [length, respectReducedMotion, prefersReducedMotion, pauseOnHover, isHovered, pauseWhenHidden, isDocumentHidden]);

  useEffect(() => {
    if (isPaused || intervalMs <= 0) return;
    const id = window.setInterval(() => {
      setIndex((prevIndex) => ((prevIndex + 1) % length + length) % length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [isPaused, intervalMs, length]);

  return {
    index,
    setIndex: select,
    next,
    prev,
    isPaused,
    bindHover: pauseOnHover
      ? {
          onMouseEnter: () => setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        }
      : undefined,
  };
}
