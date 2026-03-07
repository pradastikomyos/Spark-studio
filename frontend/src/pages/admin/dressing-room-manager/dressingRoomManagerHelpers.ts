export function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function formatPrice(price: number | null): string {
  if (price === null) return '';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
}

const VISIBLE_AHEAD = 3;

export function getModelTransform(offset: number, containerWidth: number) {
  const absOffset = Math.abs(offset);
  if (offset < 0 || absOffset > VISIBLE_AHEAD) {
    return { scale: 0, opacity: 0, x: containerWidth + 100, blur: 14, zIndex: 0, display: false };
  }
  const scaleMap = [1, 0.75, 0.55, 0.4];
  const opacityMap = [1, 0.85, 0.55, 0.3];
  const blurMap = [0, 2.5, 5, 8];
  return {
    scale: scaleMap[absOffset] ?? 0.35,
    opacity: opacityMap[absOffset] ?? 0.2,
    blur: blurMap[absOffset] ?? 10,
    x: containerWidth * 0.6 - absOffset * (containerWidth * 0.2),
    zIndex: 10 - absOffset,
    display: true,
  };
}

export const DRESSING_ROOM_SPRING = { type: 'spring' as const, stiffness: 260, damping: 28 };
