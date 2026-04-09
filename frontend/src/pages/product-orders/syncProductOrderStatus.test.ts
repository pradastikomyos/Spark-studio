import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '../../lib/supabase';
import { invokeSupabaseFunction } from '../../lib/supabaseFunctionInvoke';
import { getProductOrderAccessToken, syncProductOrderStatus } from './syncProductOrderStatus';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('../../lib/supabaseFunctionInvoke', () => ({
  invokeSupabaseFunction: vi.fn(),
}));

describe('syncProductOrderStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers a fresher session snapshot before forcing validation', async () => {
    const validateSession = vi.fn().mockResolvedValue(true);
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'fresh-token',
        },
      },
    } as any);

    const token = await getProductOrderAccessToken({
      session: {
        access_token: 'stale-token',
        expires_at: Math.floor((Date.now() + 30_000) / 1000),
      },
      validateSession,
    });

    expect(validateSession).not.toHaveBeenCalled();
    expect(token).toBe('fresh-token');
  });

  it('retries unauthorized sync requests with a refreshed token', async () => {
    const unauthorizedError = Object.assign(new Error('Unauthorized'), { status: 401 });
    vi.mocked(invokeSupabaseFunction)
      .mockRejectedValueOnce(unauthorizedError)
      .mockResolvedValueOnce({ order: { payment_status: 'paid' } } as never);

    const retryWithFreshToken = vi.fn().mockResolvedValue('token-2');

    const result = await syncProductOrderStatus('ORDER-1', 'token-1', {
      retryWithFreshToken,
    });

    expect(vi.mocked(invokeSupabaseFunction).mock.calls[0]?.[0]).toMatchObject({
      functionName: 'sync-midtrans-product-status',
      body: { order_number: 'ORDER-1' },
      headers: { Authorization: 'Bearer token-1' },
    });
    expect(vi.mocked(invokeSupabaseFunction).mock.calls[1]?.[0]).toMatchObject({
      functionName: 'sync-midtrans-product-status',
      body: { order_number: 'ORDER-1' },
      headers: { Authorization: 'Bearer token-2' },
    });
    expect(retryWithFreshToken).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ order: { payment_status: 'paid' } });
  });
});
