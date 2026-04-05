import { describe, expect, it, vi, beforeEach } from 'vitest';

import { supabase } from './supabase';
import { invokeSupabaseFunction } from './supabaseFunctionInvoke';

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('invokeSupabaseFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data when the edge function succeeds', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { ok: true },
      error: null,
    } as never);

    await expect(
      invokeSupabaseFunction<{ ok: boolean }>({
        functionName: 'test-function',
        body: { hello: 'world' },
        headers: { Authorization: 'Bearer token' },
        fallbackMessage: 'Fallback message',
      })
    ).resolves.toEqual({ ok: true });
  });

  it('throws a parsed function error when the edge function fails', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: {
        status: 500,
        message: 'Edge Function returned a non-2xx status code',
      },
      response: new Response(JSON.stringify({ error: 'Specific failure', code: 'E_TEST' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    } as never);

    await expect(
      invokeSupabaseFunction({
        functionName: 'test-function',
        fallbackMessage: 'Fallback message',
      })
    ).rejects.toMatchObject({
      message: 'Specific failure',
      code: 'E_TEST',
      status: 500,
    });
  });
});
