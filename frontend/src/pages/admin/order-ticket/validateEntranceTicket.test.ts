import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../../lib/supabase';
import { ensureFreshToken } from '../../../utils/auth';
import { validateEntranceTicket } from './validateEntranceTicket';

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

describe('validateEntranceTicket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureFreshToken).mockResolvedValue('token-1' as never);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        ticket: {
          code: 'TKT-123',
          userName: 'Nadia',
          ticketName: 'Entrance Pass',
          validDate: '2026-03-31',
        },
      },
      error: null,
    } as never);
  });

  it('normalizes the ticket code and returns ticket info from the edge function', async () => {
    const result = await validateEntranceTicket({
      ticketCode: ' tkt-123 ',
      session: { access_token: 'token-1' } as never,
    });

    expect(ensureFreshToken).toHaveBeenCalledTimes(1);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('validate-entrance-ticket', {
      body: { ticketCode: 'TKT-123' },
      headers: { Authorization: 'Bearer token-1' },
    });
    expect(result.ticketName).toBe('Entrance Pass');
  });

  it('maps 401 responses to a session-expired message', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { status: 401, message: 'Unauthorized' },
    } as never);

    await expect(
      validateEntranceTicket({
        ticketCode: 'TKT-123',
        session: { access_token: 'token-1' } as never,
      })
    ).rejects.toThrow('Sesi login kadaluarsa. Silakan login ulang.');
  });

  it('surfaces contextual validation messages from the edge function', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: {
        status: 409,
        message: 'Conflict',
        context: { error: 'Tiket sudah digunakan.' },
      },
    } as never);

    await expect(
      validateEntranceTicket({
        ticketCode: 'TKT-123',
        session: { access_token: 'token-1' } as never,
      })
    ).rejects.toThrow('Tiket sudah digunakan.');
  });
});
