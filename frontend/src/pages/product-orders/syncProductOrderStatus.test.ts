import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '../../lib/supabase';
import { getProductOrderAccessToken, syncProductOrderStatus } from './syncProductOrderStatus';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('syncProductOrderStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes the access token source when the current session token is close to expiry', async () => {
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

    expect(validateSession).toHaveBeenCalledTimes(1);
    expect(token).toBe('fresh-token');
  });

  it('retries unauthorized sync requests with a refreshed token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ order: { payment_status: 'paid' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const retryWithFreshToken = vi.fn().mockResolvedValue('token-2');

    const result = await syncProductOrderStatus('ORDER-1', 'token-1', {
      retryWithFreshToken,
    });

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer token-1' },
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer token-2' },
    });
    expect(retryWithFreshToken).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ order: { payment_status: 'paid' } });

    vi.unstubAllGlobals();
  });
});
