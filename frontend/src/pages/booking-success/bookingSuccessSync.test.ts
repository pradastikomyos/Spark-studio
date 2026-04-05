import { describe, expect, it, vi, beforeEach } from 'vitest';

import { supabase } from '../../lib/supabase';
import { getBookingSuccessAccessToken, syncBookingSuccessStatus } from './bookingSuccessSync';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('bookingSuccessSync', () => {
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

    const token = await getBookingSuccessAccessToken({
      session: {
        access_token: 'stale-token',
        expires_at: Math.floor((Date.now() + 30_000) / 1000),
      },
      validateSession,
    });

    expect(validateSession).not.toHaveBeenCalled();
    expect(token).toBe('fresh-token');
  });

  it('retries unauthorized syncs with a refreshed session token', async () => {
    const getValidAccessToken = vi.fn().mockResolvedValue('token-1');
    const retryWithFreshToken = vi.fn().mockResolvedValue('token-2');

    vi.mocked(supabase.functions.invoke)
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Unauthorized',
          context: { status: 401 },
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          order: {
            status: 'paid',
          },
        },
        error: null,
      } as any);

    const result = await syncBookingSuccessStatus({
      orderNumber: 'ORDER-1',
      getValidAccessToken,
      retryWithFreshToken,
    });

    expect(retryWithFreshToken).toHaveBeenCalledTimes(1);
    expect(vi.mocked(supabase.functions.invoke).mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer token-1' },
    });
    expect(vi.mocked(supabase.functions.invoke).mock.calls[1]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer token-2' },
    });
    expect(result).toEqual({
      order: {
        status: 'paid',
      },
    });
  });
});
