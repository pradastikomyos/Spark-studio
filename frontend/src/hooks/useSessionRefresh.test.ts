import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../contexts/AuthContext';
import { useSessionRefresh } from './useSessionRefresh';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('useSessionRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refreshes immediately when the current token is already inside the refresh buffer', async () => {
    const refreshSession = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      initialized: true,
      session: {
        expires_at: Math.floor((Date.now() + 2 * 60 * 1000) / 1000),
      },
      refreshSession,
    } as any);

    renderHook(() => useSessionRefresh());

    await act(async () => {
      await Promise.resolve();
    });

    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('retries a failed refresh after 30 seconds', async () => {
    const refreshSession = vi
      .fn()
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockResolvedValueOnce(undefined);

    vi.mocked(useAuth).mockReturnValue({
      initialized: true,
      session: {
        expires_at: Math.floor((Date.now() + 2 * 60 * 1000) / 1000),
      },
      refreshSession,
    } as any);

    renderHook(() => useSessionRefresh());

    await act(async () => {
      await Promise.resolve();
    });
    expect(refreshSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(refreshSession).toHaveBeenCalledTimes(2);
  });
});
