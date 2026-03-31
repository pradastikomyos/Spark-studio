import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../../lib/supabase';
import { ensureFreshToken } from '../../../utils/auth';
import { completeProductPickup } from './productOrdersData';

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('../../../utils/auth', () => ({
  ensureFreshToken: vi.fn(),
}));

describe('productOrdersData.completeProductPickup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureFreshToken).mockResolvedValue('token-1' as never);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { status: 'ok' },
      error: null,
    } as never);
  });

  it('uses the fresh token once and normalizes the pickup code', async () => {
    await completeProductPickup({
      pickupCode: ' prx-123 ',
      session: { access_token: 'token-1' } as never,
    });

    expect(ensureFreshToken).toHaveBeenCalledTimes(1);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('complete-product-pickup', {
      body: { pickupCode: 'PRX-123' },
      headers: { Authorization: 'Bearer token-1' },
    });
  });

  it('maps 401 responses to a session-expired message without local refresh retry', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { status: 401, message: 'Unauthorized' },
    } as never);

    await expect(
      completeProductPickup({
        pickupCode: 'PRX-123',
        session: { access_token: 'token-1' } as never,
      })
    ).rejects.toThrow('Sesi login kadaluarsa. Silakan login ulang.');

    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
  });

  it('surfaces contextual edge-function errors', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: {
        status: 409,
        message: 'Conflict',
        context: { error: 'Insufficient stock' },
      },
    } as never);

    await expect(
      completeProductPickup({
        pickupCode: 'PRX-123',
        session: { access_token: 'token-1' } as never,
      })
    ).rejects.toThrow('Insufficient stock');
  });
});
