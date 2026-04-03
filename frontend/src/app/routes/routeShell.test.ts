import { describe, expect, it } from 'vitest';

import { shouldWrapWithErrorBoundary } from './routeShell';

describe('shouldWrapWithErrorBoundary', () => {
  it('wraps admin and shop routes', () => {
    expect(shouldWrapWithErrorBoundary('/admin/dashboard')).toBe(true);
    expect(shouldWrapWithErrorBoundary('/shop')).toBe(true);
    expect(shouldWrapWithErrorBoundary('/shop/product/123')).toBe(true);
  });

  it('skips success pages', () => {
    expect(shouldWrapWithErrorBoundary('/booking-success')).toBe(false);
    expect(shouldWrapWithErrorBoundary('/order/product/success/PRD-1')).toBe(false);
    expect(shouldWrapWithErrorBoundary('/order/product/pending/PRD-1')).toBe(false);
  });

  it('skips non-sensitive public routes', () => {
    expect(shouldWrapWithErrorBoundary('/events')).toBe(false);
    expect(shouldWrapWithErrorBoundary('/dressing-room')).toBe(false);
  });
});
