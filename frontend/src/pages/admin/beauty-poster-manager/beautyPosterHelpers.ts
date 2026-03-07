export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
}

export function getClientPointFromEvent(event: unknown): { x: number; y: number } | null {
  if (!event || typeof event !== 'object') return null;
  if ('touches' in event && Array.isArray((event as TouchEvent).touches) && (event as TouchEvent).touches.length > 0) {
    const touch = (event as TouchEvent).touches[0];
    return { x: touch.clientX, y: touch.clientY };
  }
  if ('clientX' in event && 'clientY' in event) {
    const mouseEvent = event as MouseEvent;
    return { x: mouseEvent.clientX, y: mouseEvent.clientY };
  }
  return null;
}
