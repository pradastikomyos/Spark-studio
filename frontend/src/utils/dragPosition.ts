export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function clientPointToPercent(
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  clientX: number,
  clientY: number
): { xPct: number; yPct: number } {
  const width = rect.width || 1;
  const height = rect.height || 1;

  const rawX = ((clientX - rect.left) / width) * 100;
  const rawY = ((clientY - rect.top) / height) * 100;

  return { xPct: clampPercent(rawX), yPct: clampPercent(rawY) };
}

