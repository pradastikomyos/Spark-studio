import { describe, expect, it } from 'vitest';

import {
  createSupabaseFunctionError,
  getSupabaseFunctionStatus,
  parseSupabaseFunctionError,
} from './supabaseFunctionError';

describe('supabaseFunctionError', () => {
  it('prefers the JSON error payload from the function response over the generic wrapper message', async () => {
    const response = new Response(
      JSON.stringify({
        error: 'null value in column "attributes" of relation "product_variants" violates not-null constraint',
        code: '23502',
        details: 'Failing row contains attributes=null',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const parsed = await parseSupabaseFunctionError({
      error: {
        status: 500,
        message: 'Edge Function returned a non-2xx status code',
      },
      response,
      fallbackMessage: 'Fallback message',
    });

    expect(parsed.message).toBe('null value in column "attributes" of relation "product_variants" violates not-null constraint');
    expect(parsed.code).toBe('23502');
    expect(parsed.details).toBe('Failing row contains attributes=null');
    expect(parsed.status).toBe(500);
  });

  it('reads status from a Response stored in the invoke error context', () => {
    const response = new Response('Unauthorized', { status: 401 });
    const status = getSupabaseFunctionStatus(
      {
        message: 'Edge Function returned a non-2xx status code',
        context: response,
      },
      undefined
    );

    expect(status).toBe(401);
  });

  it('creates an Error object with parsed metadata attached', async () => {
    const response = new Response(JSON.stringify({ error: 'Specific failure', code: 'E_TEST' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });

    const error = await createSupabaseFunctionError({
      error: {
        message: 'Edge Function returned a non-2xx status code',
      },
      response,
      fallbackMessage: 'Fallback message',
    });

    expect(error.message).toBe('Specific failure');
    expect(error.code).toBe('E_TEST');
    expect(error.status).toBe(422);
    expect(error.name).toBe('SupabaseFunctionError');
  });
});
