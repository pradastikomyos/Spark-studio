import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TAB_RETURN_EVENT } from '../constants/browserEvents';
import { useAuth } from '../contexts/AuthContext';
import { useIdleTabSessionRefresh } from './useIdleTabSessionRefresh';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('useIdleTabSessionRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches a tab return event without refreshing when the session is still fresh', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(0);

    const refreshSession = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      initialized: true,
      session: {
        expires_at: Math.floor((121000 + 60 * 60 * 1000) / 1000),
      },
      refreshSession,
    } as any);

    const onTabReturn = vi.fn();
    window.addEventListener(TAB_RETURN_EVENT, onTabReturn);

    renderHook(() => useIdleTabSessionRefresh());

    nowSpy.mockReturnValue(121000);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => expect(onTabReturn).toHaveBeenCalledTimes(1));

    expect(refreshSession).not.toHaveBeenCalled();
    expect((onTabReturn.mock.calls[0][0] as CustomEvent).detail).toEqual(
      expect.objectContaining({ idleDuration: 121000, didRefreshSession: false })
    );

    window.removeEventListener(TAB_RETURN_EVENT, onTabReturn);
    nowSpy.mockRestore();
  });

  it('refreshes the session on idle return when the token is close to expiry', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(0);

    const refreshSession = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      initialized: true,
      session: {
        expires_at: Math.floor((121000 + 60 * 1000) / 1000),
      },
      refreshSession,
    } as any);

    const onTabReturn = vi.fn();
    window.addEventListener(TAB_RETURN_EVENT, onTabReturn);

    renderHook(() => useIdleTabSessionRefresh());

    nowSpy.mockReturnValue(121000);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => expect(refreshSession).toHaveBeenCalledTimes(1));
    expect((onTabReturn.mock.calls[0][0] as CustomEvent).detail).toEqual(
      expect.objectContaining({ idleDuration: 121000, didRefreshSession: true })
    );

    window.removeEventListener(TAB_RETURN_EVENT, onTabReturn);
    nowSpy.mockRestore();
  });
});
